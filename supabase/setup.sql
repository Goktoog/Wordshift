-- Wordshift v0.4: run once in Supabase SQL Editor.
begin;
create table if not exists public.wordshift_workspaces (
 user_id uuid primary key references auth.users(id) on delete cascade,
 document jsonb not null,
 revision bigint not null default 1,
 updated_at timestamptz not null default now()
);
alter table public.wordshift_workspaces enable row level security;
revoke all on public.wordshift_workspaces from anon, authenticated;
grant select on public.wordshift_workspaces to authenticated;
drop policy if exists workspace_owner_read on public.wordshift_workspaces;
create policy workspace_owner_read on public.wordshift_workspaces for select to authenticated using ((select auth.uid())=user_id);

create or replace function public.wordshift_save(payload jsonb, expected_revision bigint)
returns bigint language plpgsql security definer set search_path = '' as $$
declare who uuid := auth.uid(); result bigint;
begin
 if who is null then raise exception 'Login required'; end if;
 if jsonb_typeof(payload) <> 'object' or payload->>'id' is distinct from who::text
 or jsonb_typeof(payload->'sets') is distinct from 'array'
 or jsonb_typeof(payload->'folders') is distinct from 'array'
 or octet_length(payload::text)>4000000 then raise exception 'Invalid workspace'; end if;
 if expected_revision=0 then
  insert into public.wordshift_workspaces(user_id,document) values(who,payload) on conflict do nothing returning revision into result;
 else
  update public.wordshift_workspaces set document=payload,revision=revision+1,updated_at=now()
  where user_id=who and revision=expected_revision returning revision into result;
 end if;
 if result is null then raise exception 'Data changed on another device. Export your changes before reloading.'; end if;
 return result;
end $$;
revoke all on function public.wordshift_save(jsonb,bigint) from public,anon;
grant execute on function public.wordshift_save(jsonb,bigint) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('profile-media','profile-media',true,2000000,array['image/webp']) on conflict(id) do nothing;
drop policy if exists wordshift_media_insert on storage.objects;
create policy wordshift_media_insert on storage.objects for insert to authenticated
with check(bucket_id='profile-media' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists wordshift_media_read on storage.objects;
create policy wordshift_media_read on storage.objects for select to authenticated
using(bucket_id='profile-media' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists wordshift_media_delete on storage.objects;
create policy wordshift_media_delete on storage.objects for delete to authenticated
using(bucket_id='profile-media' and (storage.foldername(name))[1]=(select auth.uid())::text);
commit;
