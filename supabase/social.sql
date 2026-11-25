-- Wordshift 0.9: run after setup.sql and community.sql. Safe to run more than once.
-- Adds public profiles, follows, global/city leaderboard and people search.
-- Private workspaces and unpublished sets stay private: only the whitelisted fields below are copied.
begin;

create table if not exists public.wordshift_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 name text not null,
 avatar text not null default '',
 banner text not null default '',
 city text not null default '',
 xp integer not null default 0,
 level text not null default 'A1',
 answered integer not null default 0,
 correct integer not null default 0,
 updated_at timestamptz not null default now()
);
alter table public.wordshift_profiles enable row level security;
revoke all on public.wordshift_profiles from anon, authenticated;
grant select on public.wordshift_profiles to authenticated;
drop policy if exists profiles_read on public.wordshift_profiles;
create policy profiles_read on public.wordshift_profiles for select to authenticated using (true);
create index if not exists wordshift_profiles_xp_idx on public.wordshift_profiles(xp desc);
create index if not exists wordshift_profiles_city_xp_idx on public.wordshift_profiles(city, xp desc);

-- Keeps the public profile in step with the saved workspace. Whitelist only: no email, folders or sets.
create or replace function public.wordshift_sync_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
declare d jsonb := new.document;
begin
 insert into public.wordshift_profiles(user_id,name,avatar,banner,city,xp,level,answered,correct,updated_at)
 values(new.user_id,
  left(coalesce(nullif(trim(d->>'name'),''),'Kullanıcı'),35),
  case when d->>'avatar' ~ '^https://' then left(d->>'avatar',500) else '' end,
  case when d->>'banner' ~ '^https://' then left(d->>'banner',500) else '' end,
  left(coalesce(d->>'city',''),40),
  case when d->>'xp' ~ '^[0-9]{1,9}$' then (d->>'xp')::integer else 0 end,
  case when d->>'level' in ('A1','A2','B1','B2','C1','C2') then d->>'level' else 'A1' end,
  case when d#>>'{stats,total}' ~ '^[0-9]{1,9}$' then (d#>>'{stats,total}')::integer else 0 end,
  case when d#>>'{stats,correct}' ~ '^[0-9]{1,9}$' then (d#>>'{stats,correct}')::integer else 0 end,
  now())
 on conflict(user_id) do update set name=excluded.name,avatar=excluded.avatar,banner=excluded.banner,
  city=excluded.city,xp=excluded.xp,level=excluded.level,answered=excluded.answered,
  correct=excluded.correct,updated_at=now();
 return new;
end $$;
revoke all on function public.wordshift_sync_profile() from public, anon, authenticated;
drop trigger if exists wordshift_profile_sync on public.wordshift_workspaces;
create trigger wordshift_profile_sync after insert or update of document on public.wordshift_workspaces
for each row execute function public.wordshift_sync_profile();

-- Backfill existing accounts (revision and document stay unchanged).
update public.wordshift_workspaces set document=document;

create table if not exists public.wordshift_follows (
 follower_id uuid not null references auth.users(id) on delete cascade,
 followee_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(follower_id,followee_id),
 check(follower_id<>followee_id)
);
create index if not exists wordshift_follows_followee_idx on public.wordshift_follows(followee_id,created_at desc);
alter table public.wordshift_follows enable row level security;
revoke all on public.wordshift_follows from anon, authenticated;
grant select on public.wordshift_follows to authenticated;
drop policy if exists follows_read on public.wordshift_follows;
create policy follows_read on public.wordshift_follows for select to authenticated using (true);

create or replace function public.wordshift_follow(target uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
 if auth.uid() is null then raise exception 'Giriş yapmalısın.'; end if;
 if target is null or target = auth.uid() then raise exception 'Kendini takip edemezsin.'; end if;
 if not exists(select 1 from public.wordshift_profiles where user_id=target) then raise exception 'Kullanıcı bulunamadı.'; end if;
 insert into public.wordshift_follows(follower_id,followee_id) values(auth.uid(),target) on conflict do nothing;
end $$;
revoke all on function public.wordshift_follow(uuid) from public, anon;
grant execute on function public.wordshift_follow(uuid) to authenticated;

create or replace function public.wordshift_unfollow(target uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
 if auth.uid() is null then raise exception 'Giriş yapmalısın.'; end if;
 delete from public.wordshift_follows where follower_id=auth.uid() and followee_id=target;
end $$;
revoke all on function public.wordshift_unfollow(uuid) from public, anon;
grant execute on function public.wordshift_unfollow(uuid) to authenticated;

-- scope: 'global' or 'city'. Ordered by XP; ties are broken by id so places are stable.
create or replace function public.wordshift_leaderboard(scope text default 'global', city_filter text default '', page_offset integer default 0)
returns table(place bigint,user_id uuid,name text,avatar text,city text,xp integer,level text)
language sql stable security definer set search_path = '' as $$
 select r.place,r.user_id,r.name,r.avatar,r.city,r.xp,r.level from (
  select (row_number() over (order by p.xp desc,p.user_id))::bigint as place,
   p.user_id,p.name,p.avatar,p.city,p.xp,p.level
  from public.wordshift_profiles p
  where (scope<>'city' or (coalesce(city_filter,'')<>'' and p.city=city_filter))
 ) r order by r.place limit 50 offset greatest(coalesce(page_offset,0),0);
$$;
revoke all on function public.wordshift_leaderboard(text,text,integer) from public, anon;
grant execute on function public.wordshift_leaderboard(text,text,integer) to anon, authenticated;

create or replace function public.wordshift_my_rank(scope text default 'global', city_filter text default '')
returns bigint language sql stable security invoker set search_path = '' as $$
 select r.place from (
  select (row_number() over (order by p.xp desc,p.user_id))::bigint as place,p.user_id
  from public.wordshift_profiles p
  where (scope<>'city' or (coalesce(city_filter,'')<>'' and p.city=city_filter))
 ) r where r.user_id=(select auth.uid());
$$;
revoke all on function public.wordshift_my_rank(text,text) from public, anon;
grant execute on function public.wordshift_my_rank(text,text) to authenticated;

create or replace function public.wordshift_user_profile(target uuid)
returns table(user_id uuid,name text,avatar text,banner text,city text,xp integer,level text,answered integer,correct integer,
 followers bigint,following bigint,public_sets bigint,is_following boolean)
language sql stable security definer set search_path = '' as $$
 select p.user_id,p.name,p.avatar,p.banner,p.city,p.xp,p.level,p.answered,p.correct,
  (select count(*) from public.wordshift_follows f where f.followee_id=p.user_id),
  (select count(*) from public.wordshift_follows f where f.follower_id=p.user_id),
  (select count(*) from public.wordshift_public_sets s where s.owner_id=p.user_id),
  exists(select 1 from public.wordshift_follows f where f.follower_id=(select auth.uid()) and f.followee_id=p.user_id)
 from public.wordshift_profiles p where p.user_id=target;
$$;
revoke all on function public.wordshift_user_profile(uuid) from public, anon;
grant execute on function public.wordshift_user_profile(uuid) to anon, authenticated;

-- kind: 'followers' (people who follow target) or 'following' (people target follows).
create or replace function public.wordshift_follow_list(target uuid, kind text default 'followers', page_offset integer default 0)
returns table(user_id uuid,name text,avatar text,city text,level text,xp integer)
language sql stable security definer set search_path = '' as $$
 select p.user_id,p.name,p.avatar,p.city,p.level,p.xp
 from public.wordshift_follows f
 join public.wordshift_profiles p on p.user_id=(case when kind='following' then f.followee_id else f.follower_id end)
 where (case when kind='following' then f.follower_id else f.followee_id end)=target
 order by f.created_at desc,p.user_id limit 50 offset greatest(coalesce(page_offset,0),0);
$$;
revoke all on function public.wordshift_follow_list(uuid,text,integer) from public, anon;
grant execute on function public.wordshift_follow_list(uuid,text,integer) to anon, authenticated;

create or replace function public.wordshift_search_users(query_text text, page_offset integer default 0)
returns table(user_id uuid,name text,avatar text,city text,level text,xp integer)
language sql stable security invoker set search_path = '' as $$
 select p.user_id,p.name,p.avatar,p.city,p.level,p.xp
 from public.wordshift_profiles p
 where length(trim(left(coalesce(query_text,''),35)))>=2
  and strpos(lower(p.name),lower(trim(left(query_text,35))))>0
 order by starts_with(lower(p.name),lower(trim(left(query_text,35)))) desc,p.xp desc,p.user_id
 limit 24 offset greatest(coalesce(page_offset,0),0);
$$;
revoke all on function public.wordshift_search_users(text,integer) from public, anon;
grant execute on function public.wordshift_search_users(text,integer) to authenticated;

commit;
