-- Wordshift 0.5: run after setup.sql. Existing personal workspaces stay private.
begin;
create table if not exists public.wordshift_public_sets (
 owner_id uuid not null references auth.users(id) on delete cascade,
 set_id text not null,
 title text not null,
 author_name text not null,
 items jsonb not null check (jsonb_typeof(items) = 'array'),
 levels text[] not null default '{}',
 updated_at timestamptz not null default now(),
 primary key(owner_id,set_id)
);
alter table public.wordshift_public_sets enable row level security;
revoke all on public.wordshift_public_sets from anon, authenticated;
grant select on public.wordshift_public_sets to anon, authenticated;
drop policy if exists published_sets_read on public.wordshift_public_sets;
create policy published_sets_read on public.wordshift_public_sets for select to anon, authenticated using (true);

-- Only the signed-in owner's saved set can be published. Never accept another owner's document.
create or replace function public.wordshift_publish_set(target_set_id text)
returns void language plpgsql security definer set search_path = '' as $$
declare who uuid := auth.uid(); workspace jsonb; chosen jsonb; cleaned jsonb; tags text[];
begin
 if who is null then raise exception 'Giriş yapmalısın.'; end if;
 select document into workspace from public.wordshift_workspaces where user_id=who;
 select value into chosen from jsonb_array_elements(workspace->'sets') where value->>'id'=target_set_id limit 1;
 if chosen is null then raise exception 'Set bulunamadı. Önce buluta kaydet.'; end if;
 if jsonb_typeof(chosen->'items') is distinct from 'array' then raise exception 'Geçersiz set.'; end if;
 if jsonb_array_length(chosen->'items') < 1 or jsonb_array_length(chosen->'items') > 500
 or length(trim(coalesce(chosen->>'name',''))) = 0 then raise exception 'Paylaşım için 1–500 içerik ve set adı gerekir.'; end if;
 -- Explicit whitelist excludes emails, folders, avatars, XP, attempts and personal review state.
 select jsonb_agg(jsonb_build_object(
  'id',i.value->>'id','type',i.value->>'type','front',left(i.value->>'front',10000),
  'back',left(i.value->>'back',2000),'extra',left(coalesce(i.value->>'extra',''),10000),
  'level',case when i.value->>'level' in ('A1','A2','B1','B2','C1','C2') then i.value->>'level' else 'B1' end,
  'options',coalesce((select jsonb_agg(left(o.value #>> '{}',2000)) from jsonb_array_elements(
    case when jsonb_typeof(i.value->'options')='array' then i.value->'options' else '[]'::jsonb end
   ) with ordinality o(value,n) where o.n<=4 and jsonb_typeof(o.value)='string'),'[]'::jsonb)
 ) order by i.n) into cleaned
 from jsonb_array_elements(chosen->'items') with ordinality i(value,n)
 where i.value->>'type' in ('word','mc','blank','translate','paragraph')
 and length(coalesce(i.value->>'id',''))>0 and length(trim(coalesce(i.value->>'front','')))>0
 and length(trim(coalesce(i.value->>'back','')))>0;
 if cleaned is null or jsonb_array_length(cleaned)<>jsonb_array_length(chosen->'items') then raise exception 'Eksik veya desteklenmeyen içerik.'; end if;
 if (select count(distinct value->>'id') from jsonb_array_elements(cleaned))<>jsonb_array_length(cleaned)
 then raise exception 'İçerik kimlikleri benzersiz olmalı.'; end if;
 if octet_length(cleaned::text)>1000000 then raise exception 'Paylaşılan set çok büyük (en fazla 1 MB).'; end if;
 select array_agg(distinct value->>'level' order by value->>'level') into tags from jsonb_array_elements(cleaned);
 insert into public.wordshift_public_sets(owner_id,set_id,title,author_name,items,levels)
 values(who,target_set_id,left(trim(chosen->>'name'),120),left(coalesce(nullif(trim(workspace->>'name'),''),'Kullanıcı'),35),cleaned,tags)
 on conflict(owner_id,set_id) do update set title=excluded.title,author_name=excluded.author_name,
 items=excluded.items,levels=excluded.levels,updated_at=now();
end $$;
revoke all on function public.wordshift_publish_set(text) from public, anon;
grant execute on function public.wordshift_publish_set(text) to authenticated;

create or replace function public.wordshift_unpublish_set(target_set_id text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Giriş yapmalısın.'; end if;
 delete from public.wordshift_public_sets where owner_id=auth.uid() and set_id=target_set_id;
end $$;
revoke all on function public.wordshift_unpublish_set(text) from public, anon;
grant execute on function public.wordshift_unpublish_set(text) to authenticated;

-- Ranking: exact title, title prefix, then token matches in title, level and author.
create or replace function public.wordshift_search_sets(query_text text default '',author_filter uuid default null,page_offset integer default 0)
returns table(owner_id uuid,set_id text,title text,author_name text,item_count integer,levels text[],updated_at timestamptz)
language sql stable security invoker set search_path='' as $$
 with input as (select lower(trim(left(coalesce(query_text,''),100))) q), ranked as (
 select s.*, i.q,
  (case when lower(s.title)=i.q then 100 else 0 end +
   case when i.q<>'' and starts_with(lower(s.title),i.q) then 30 else 0 end +
   coalesce((select sum(case when strpos(lower(s.title),t)>0 then 10 else 0 end +
    case when t=any(s.levels_lower) then 8 else 0 end +
    case when strpos(lower(s.author_name),t)>0 then 3 else 0 end)
    from regexp_split_to_table(i.q,'\s+') t where t<>''),0)) score
 from (select p.*,array(select lower(l) from unnest(p.levels) l) levels_lower from public.wordshift_public_sets p) s
 cross join input i where author_filter is null or s.owner_id=author_filter
 )
 select r.owner_id,r.set_id,r.title,r.author_name,jsonb_array_length(r.items),r.levels,r.updated_at
 from ranked r where r.q='' or r.score>0 order by r.score desc,r.updated_at desc,r.owner_id,r.set_id
 limit 24 offset greatest(coalesce(page_offset,0),0);
$$;
revoke all on function public.wordshift_search_sets(text,uuid,integer) from public;
grant execute on function public.wordshift_search_sets(text,uuid,integer) to anon,authenticated;
commit;
