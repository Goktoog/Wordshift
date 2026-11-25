-- Wordshift: Admin rozeti + isim stili. social.sql çalıştırıldıktan SONRA çalıştır. Birden fazla kez çalıştırılabilir.
-- İsim stili de yalnızca admin hesaplar için kaydedilir ve gösterilir.
-- Admin rozeti yalnızca burada (SQL Editor) verilir; uygulamadan hiçbir kullanıcı kendine admin yapamaz.
begin;

create table if not exists public.wordshift_admins (
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
alter table public.wordshift_admins enable row level security;
revoke all on public.wordshift_admins from anon, authenticated;  -- ne okuma ne yazma: sadece fonksiyonlar (security definer) bakar

alter table public.wordshift_profiles add column if not exists name_color text not null default '';
alter table public.wordshift_profiles add column if not exists name_glow smallint not null default 0;
alter table public.wordshift_profiles add column if not exists name_anim text not null default 'none';

alter table public.wordshift_profiles add column if not exists badge_color text not null default 'gold';

-- Herkese açık "admin mi?" bilgisi (başkasının e-postası/kimliği dışında bir şey sızdırmaz).
create or replace function public.wordshift_is_admin(target uuid)
returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.wordshift_admins a where a.user_id=target);
$$;
revoke all on function public.wordshift_is_admin(uuid) from public, anon;
grant execute on function public.wordshift_is_admin(uuid) to authenticated;

-- Profil eşitleme: social.sql'deki sürümün aynısı + doğrulanmış isim stili (renk #rrggbb, glow 0-2, animasyon listesi).
create or replace function public.wordshift_sync_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
declare d jsonb := new.document; adm boolean := public.wordshift_is_admin(new.user_id);
begin
 insert into public.wordshift_profiles(user_id,name,avatar,banner,city,xp,level,answered,correct,name_color,name_glow,name_anim,badge_color,updated_at)
 values(new.user_id,
  left(coalesce(nullif(trim(d->>'name'),''),'Kullanıcı'),35),
  case when d->>'avatar' ~ '^https://' then left(d->>'avatar',500) else '' end,
  case when d->>'banner' ~ '^https://' then left(d->>'banner',500) else '' end,
  left(coalesce(d->>'city',''),40),
  case when d->>'xp' ~ '^[0-9]{1,9}$' then (d->>'xp')::integer else 0 end,
  case when d->>'level' in ('A1','A2','B1','B2','C1','C2') then d->>'level' else 'A1' end,
  case when d#>>'{stats,total}' ~ '^[0-9]{1,9}$' then (d#>>'{stats,total}')::integer else 0 end,
  case when d#>>'{stats,correct}' ~ '^[0-9]{1,9}$' then (d#>>'{stats,correct}')::integer else 0 end,
  case when adm and d#>>'{nameStyle,color}' ~ '^#[0-9a-fA-F]{6}$' then lower(d#>>'{nameStyle,color}') else '' end,
  case when adm and d#>>'{nameStyle,glow}' in ('1','2') then (d#>>'{nameStyle,glow}')::smallint else 0 end,
  case when adm and d#>>'{nameStyle,anim}' in ('wiggle','jump','expand','pulse') then d#>>'{nameStyle,anim}' else 'none' end,
  case when adm and d->>'badgeColor' in ('mint','sky','lilac','rose') then d->>'badgeColor' else 'gold' end,
  now())
 on conflict(user_id) do update set name=excluded.name,avatar=excluded.avatar,banner=excluded.banner,
  city=excluded.city,xp=excluded.xp,level=excluded.level,answered=excluded.answered,
  correct=excluded.correct,name_color=excluded.name_color,name_glow=excluded.name_glow,
  name_anim=excluded.name_anim,badge_color=excluded.badge_color,updated_at=now();
 return new;
end $$;
revoke all on function public.wordshift_sync_profile() from public, anon, authenticated;

-- Mevcut hesaplar için isim stili alanlarını bir kez doldur (belge ve revizyon değişmez).
update public.wordshift_profiles p set
 badge_color=case when public.wordshift_is_admin(p.user_id) and w.document->>'badgeColor' in ('mint','sky','lilac','rose') then w.document->>'badgeColor' else 'gold' end,
 name_color=case when public.wordshift_is_admin(p.user_id) and w.document#>>'{nameStyle,color}' ~ '^#[0-9a-fA-F]{6}$' then lower(w.document#>>'{nameStyle,color}') else '' end,
 name_glow=case when public.wordshift_is_admin(p.user_id) and w.document#>>'{nameStyle,glow}' in ('1','2') then (w.document#>>'{nameStyle,glow}')::smallint else 0 end,
 name_anim=case when public.wordshift_is_admin(p.user_id) and w.document#>>'{nameStyle,anim}' in ('wiggle','jump','expand','pulse') then w.document#>>'{nameStyle,anim}' else 'none' end
from public.wordshift_workspaces w where w.user_id=p.user_id;

-- Liderlik tablosu: dönüş sütunları değiştiği için önce eski fonksiyon silinir.
drop function if exists public.wordshift_leaderboard(text,text,integer);
create function public.wordshift_leaderboard(scope text default 'global', city_filter text default '', page_offset integer default 0)
returns table(place bigint,user_id uuid,name text,avatar text,city text,xp integer,level text,name_color text,name_glow smallint,name_anim text,is_admin boolean,badge_color text)
language sql stable security definer set search_path = '' as $$
 select r.place,r.user_id,r.name,r.avatar,r.city,r.xp,r.level,
  case when public.wordshift_is_admin(r.user_id) then r.name_color else '' end,
  case when public.wordshift_is_admin(r.user_id) then r.name_glow else 0::smallint end,
  case when public.wordshift_is_admin(r.user_id) then r.name_anim else 'none' end,
  public.wordshift_is_admin(r.user_id),r.badge_color from (
  select (row_number() over (order by p.xp desc,p.user_id))::bigint as place,
   p.user_id,p.name,p.avatar,p.city,p.xp,p.level,p.name_color,p.name_glow,p.name_anim,p.badge_color
  from public.wordshift_profiles p
  where (scope<>'city' or (coalesce(city_filter,'')<>'' and p.city=city_filter))
 ) r order by r.place limit 50 offset greatest(coalesce(page_offset,0),0);
$$;
revoke all on function public.wordshift_leaderboard(text,text,integer) from public, anon;
grant execute on function public.wordshift_leaderboard(text,text,integer) to anon, authenticated;

-- Kullanıcı profili (başkasının profil sayfası ve kendi profilin için).
drop function if exists public.wordshift_user_profile(uuid);
create function public.wordshift_user_profile(target uuid)
returns table(user_id uuid,name text,avatar text,banner text,city text,xp integer,level text,answered integer,correct integer,
 followers bigint,following bigint,public_sets bigint,is_following boolean,name_color text,name_glow smallint,name_anim text,is_admin boolean,badge_color text)
language sql stable security definer set search_path = '' as $$
 select p.user_id,p.name,p.avatar,p.banner,p.city,p.xp,p.level,p.answered,p.correct,
  (select count(*) from public.wordshift_follows f where f.followee_id=p.user_id),
  (select count(*) from public.wordshift_follows f where f.follower_id=p.user_id),
  (select count(*) from public.wordshift_public_sets s where s.owner_id=p.user_id),
  exists(select 1 from public.wordshift_follows f where f.follower_id=(select auth.uid()) and f.followee_id=p.user_id),
  case when public.wordshift_is_admin(p.user_id) then p.name_color else '' end,
  case when public.wordshift_is_admin(p.user_id) then p.name_glow else 0::smallint end,
  case when public.wordshift_is_admin(p.user_id) then p.name_anim else 'none' end,
  public.wordshift_is_admin(p.user_id),p.badge_color
 from public.wordshift_profiles p where p.user_id=target;
$$;
revoke all on function public.wordshift_user_profile(uuid) from public, anon;
grant execute on function public.wordshift_user_profile(uuid) to anon, authenticated;

commit;

-- ADMİN ROZETİNİ KENDİNE VER (e-postanı yazıp ayrıca çalıştır; yukarıdaki blok bir kez çalıştırıldıktan sonra):
-- insert into public.wordshift_admins(user_id) select id from auth.users where email = 'SENIN_EPOSTAN@ornek.com' on conflict do nothing;
-- Kaldırmak için: delete from public.wordshift_admins where user_id = (select id from auth.users where email = 'SENIN_EPOSTAN@ornek.com');
