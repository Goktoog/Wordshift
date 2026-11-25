-- Wordshift: Misafir profil ve sıralama erişimi + Bıng Düellosu
-- Mevcut Wordshift Supabase projesinde SQL Editor > New query içinde tam dosyayı çalıştır.
-- setup.sql, community.sql ve social.sql ile kurulan sosyal tabloları kullanır.
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

create schema if not exists wordshift_private;
revoke all on schema wordshift_private from public, anon, authenticated;
create table if not exists wordshift_private.rooms (
 id uuid primary key default gen_random_uuid(), code text unique not null,
 mode text not null,
 level text not null, title text not null, quick boolean not null default false,
 players uuid[] not null, names text[] not null, seen timestamptz[] not null,
 lives integer[] not null default array[3,3], correct_counts integer[] not null default array[0,0], wrong_counts integer[] not null default array[0,0],
 status text not null default 'waiting', phase text not null default 'question',
 created_at timestamptz not null default now(), started_at timestamptz,
 starts_at timestamptz, deadline timestamptz, round_no integer not null default 0,
 turn_no integer not null default 1, scores integer[] not null default array[0,0],
 ready boolean[] not null default array[false,false],
 deck jsonb not null, right_order integer[] not null default '{}',
 answers jsonb not null default '[null,null]', fleets jsonb not null default '[null,null]',
 shots jsonb not null default '[[],[]]', completed jsonb not null default '[[],[]]',
 last_attempt timestamptz[] not null default array[null::timestamptz,null::timestamptz],
 finish_times bigint[] not null default array[null::bigint,null::bigint],
 event jsonb, winner integer, reason text
);
alter table wordshift_private.rooms add column if not exists avatars integer[] not null default array[0,1];
alter table wordshift_private.rooms drop constraint if exists rooms_mode_check;
alter table wordshift_private.rooms add constraint rooms_mode_check check(mode in ('runner','meteor','blocks','battle','sentences','buzzer'));
alter table wordshift_private.rooms enable row level security;
revoke all on wordshift_private.rooms from public,anon,authenticated;
create index if not exists wordshift_queue on wordshift_private.rooms(mode,level,created_at) where status='waiting';


create table if not exists wordshift_private.sentences(id text primary key,level text not null,front text not null,back text not null);
revoke all on wordshift_private.sentences from public,anon,authenticated;
insert into wordshift_private.sentences(id,level,front,back) values
('sentence-A1-0','A1','Benim bir kedim var.','I have a cat.'),
('sentence-A1-1','A1','O benim kız kardeşim.','She is my sister.'),
('sentence-A1-2','A1','Bu kitap çok güzel.','This book is very nice.'),
('sentence-A1-3','A1','Biz her gün İngilizce çalışırız.','We study English every day.'),
('sentence-A1-4','A1','Çantam masanın altında.','My bag is under the table.'),
('sentence-A1-5','A1','O bir bardak su istiyor.','He wants a glass of water.'),
('sentence-A2-0','A2','Dün müzeyi ziyaret ettik.','We visited the museum yesterday.'),
('sentence-A2-1','A2','Şu anda akşam yemeği pişiriyorum.','I am cooking dinner right now.'),
('sentence-A2-2','A2','O gelecek hafta Ankara’ya gidecek.','She will go to Ankara next week.'),
('sentence-A2-3','A2','Bu araba benimkinden daha eski.','This car is older than mine.'),
('sentence-A2-4','A2','Burada fotoğraf çekmemelisin.','You should not take photos here.'),
('sentence-A2-5','A2','Otobüs geldiğinde yağmur yağıyordu.','It was raining when the bus arrived.'),
('sentence-B1-0','B1','O bu şirkette 2020’den beri çalışıyor.','She has worked here since 2020.'),
('sentence-B1-1','B1','Daha fazla zamanım olsaydı daha çok okurdum.','If I had more time I would read more.'),
('sentence-B1-2','B1','Tren biz gelmeden önce ayrılmıştı.','The train had left before we arrived.'),
('sentence-B1-3','B1','Yorgun olmasına rağmen çalışmaya devam etti.','Although he was tired he kept working.'),
('sentence-B1-4','B1','Bu ev yüz yıl önce inşa edildi.','This house was built a hundred years ago.'),
('sentence-B1-5','B1','Bu hafta sonu seni görmeyi dört gözle bekliyorum.','I look forward to seeing you this weekend.'),
('sentence-B2-0','B2','Rapor cuma gününe kadar teslim edilmeli.','The report must be submitted by Friday.'),
('sentence-B2-1','B2','Daha erken ayrılsaydık treni yakalardık.','If we had left earlier we would have caught the train.'),
('sentence-B2-2','B2','Onun toplantıdan haberdar edilmediği anlaşılıyor.','It appears that she was not informed about the meeting.'),
('sentence-B2-3','B2','Ne kadar çok pratik yaparsan o kadar kendinden emin olursun.','The more you practise the more confident you become.'),
('sentence-B2-4','B2','Fırtınaya rağmen uçuş zamanında kalktı.','Despite the storm the flight departed on time.'),
('sentence-B2-5','B2','Şirket gelecek yıl büyüme planlarını açıkladı.','The company announced its plans to expand next year.'),
('sentence-C1-0','C1','Ancak sonradan hatasının farkına vardı.','Only later did he realise his mistake.'),
('sentence-C1-1','C1','Sonuçlar daha fazla araştırmanın gerekli olduğunu gösteriyor.','The findings suggest that further research is necessary.'),
('sentence-C1-2','C1','Bana danışılmış olsaydı farklı bir yaklaşım önerirdim.','Had I been consulted I would have suggested another approach.'),
('sentence-C1-3','C1','Kanıtların hiçbir koşulda görmezden gelinmemesi gerekir.','Under no circumstances should the evidence be ignored.'),
('sentence-C1-4','C1','Kaynakların kısıtlı olduğu düşünüldüğünde ilerlemeleri etkileyiciydi.','Given the limited resources their progress was impressive.'),
('sentence-C1-5','C1','Başarısı yetenek kadar azme de bağlanabilir.','Her success can be attributed to perseverance as well as talent.'),
('sentence-C2-0','C2','Bu politika yenilikleri teşvik etmek şöyle dursun engelleyebilir.','Far from encouraging innovation this policy may hinder it.'),
('sentence-C2-1','C2','Söylemeye gerek yok ki böyle varsayımlar dikkatle ele alınmalıdır.','Needless to say such assumptions should be treated with caution.'),
('sentence-C2-2','C2','İtirazları ne kadar ikna edici olursa olsun karar değişmedi.','Compelling though her objections were the decision remained unchanged.'),
('sentence-C2-3','C2','Durum böyleyken müdahaleyi ertelemek ihtiyatsızlık olurdu.','As matters stand postponing intervention would be unwise.'),
('sentence-C2-4','C2','Bu ihmallerin sonucu ne ölçüde etkilediği belirsizliğini koruyor.','The extent to which these omissions affected the outcome remains unclear.'),
('sentence-C2-5','C2','Sonuç hiçbir şekilde kaçınılmaz değildi.','By no means was the outcome inevitable.')
on conflict(id) do update set level=excluded.level,front=excluded.front,back=excluded.back;
create table if not exists wordshift_private.match_history(
 id uuid primary key,mode text not null,level text not null,title text not null,
 players uuid[] not null,names text[] not null,scores integer[] not null,lives integer[] not null,
 correct_counts integer[] not null,wrong_counts integer[] not null,shots jsonb not null,hits jsonb not null,
 winner integer,reason text,started_at timestamptz not null,ended_at timestamptz not null,rounds integer not null
);
alter table wordshift_private.match_history enable row level security;
revoke all on wordshift_private.match_history from public,anon,authenticated;
create index if not exists wordshift_history_players on wordshift_private.match_history using gin(players);
create or replace function wordshift_private.save_result() returns trigger language plpgsql security definer set search_path='' as $$
declare hit1 jsonb;hit2 jsonb;
begin
 if new.status='finished' and old.status<>'finished' and cardinality(new.players)=2 and new.started_at is not null then
  select coalesce(jsonb_agg(v),'[]') into hit1 from jsonb_array_elements(new.shots->0) v where (new.fleets->1) @> jsonb_build_array(v);
  select coalesce(jsonb_agg(v),'[]') into hit2 from jsonb_array_elements(new.shots->1) v where (new.fleets->0) @> jsonb_build_array(v);
  insert into wordshift_private.match_history values(new.id,new.mode,new.level,new.title,new.players,new.names,new.scores,new.lives,new.correct_counts,new.wrong_counts,new.shots,jsonb_build_array(hit1,hit2),new.winner,new.reason,new.started_at,clock_timestamp(),new.round_no+1) on conflict(id) do nothing;
 end if;return new;
end $$;
revoke all on function wordshift_private.save_result() from public,anon,authenticated;
drop trigger if exists wordshift_match_finished on wordshift_private.rooms;
create trigger wordshift_match_finished after update on wordshift_private.rooms for each row execute function wordshift_private.save_result();
create or replace function wordshift_private.expire_rooms() returns void language plpgsql security definer set search_path='' as $$
begin
 update wordshift_private.rooms set status='finished',reason='Oyuncu bağlantısı 30 saniye boyunca kurulamadı.',
 winner=case when seen[1]<now()-interval '30 seconds' and seen[2]<now()-interval '30 seconds' then null when seen[1]<now()-interval '30 seconds' then 2 else 1 end
 where status in ('active','placing') and (seen[1]<now()-interval '30 seconds' or seen[2]<now()-interval '30 seconds');
 update wordshift_private.rooms set status='finished',reason='Bekleme süresi doldu.' where status='waiting' and (created_at<now()-interval '10 minutes' or seen[1]<now()-interval '30 seconds');
 delete from wordshift_private.rooms where created_at<now()-interval '1 day';
end $$;
revoke all on function wordshift_private.expire_rooms() from public,anon,authenticated;

drop function if exists public.wordshift_pvp_lobby(text,text,jsonb,text,text);
create or replace function public.wordshift_pvp_lobby(action text, game_mode text default 'meteor', words jsonb default '[]', set_title text default '', room_code text default '', pool_level text default '')
returns uuid language plpgsql security definer set search_path='' as $$
declare who uuid:=auth.uid(); r wordshift_private.rooms; lvl text; nick text; deck_data jsonb; order_data integer[]; candidate uuid;
begin
 if who is null then raise exception 'Çevrimiçi oynamak için giriş yap.'; end if;
 if action not in ('create','quick','join','resume') then raise exception 'Geçersiz işlem.'; end if;
 -- Serialize lobby entry to prevent double joins or two active rooms per account.
 perform pg_advisory_xact_lock(763091);
 perform wordshift_private.expire_rooms();
 update wordshift_private.rooms set status='finished',reason='Odanın süresi doldu.'
 where status='waiting' and (created_at<now()-interval '10 minutes' or seen[1]<now()-interval '30 seconds');
 select * into r from wordshift_private.rooms where who=any(players) and status in ('waiting','placing','active') order by created_at desc limit 1 for update;
 if found then
  if r.status='waiting' or (select max(s) from unnest(r.seen) s)>now()-interval '30 seconds' then return r.id; end if;
  update wordshift_private.rooms set status='finished',reason='Bağlantı zaman aşımı.' where id=r.id;
 end if;
 if action='resume' then return null; end if;
 select coalesce(nullif(document->>'name',''),'Oyuncu'),coalesce(document->>'level','A1') into nick,lvl from public.wordshift_workspaces where user_id=who;
 nick:=left(coalesce(nick,'Oyuncu'),60); lvl:=coalesce(lvl,'A1');
 if lvl not in ('A1','A2','B1','B2','C1','C2') then lvl:='A1'; end if;
 -- Optional exam pool: players who pick YDS or YOKDIL are matched with each other, whatever their CEFR level.
 if coalesce(pool_level,'') not in ('','YDS','YOKDIL') then raise exception 'Geçersiz eşleşme havuzu.'; end if;
 if pool_level in ('YDS','YOKDIL') and game_mode<>'sentences' then lvl:=pool_level; end if;
 if action='join' then
  select * into r from wordshift_private.rooms where code=upper(trim(room_code)) for update;
  if not found or r.status<>'waiting' or cardinality(r.players)<>1 then raise exception 'Oda bulunamadı, dolu veya süresi dolmuş.'; end if;
 else
  if game_mode not in ('runner','meteor','blocks','battle','sentences','buzzer') then raise exception 'Geçersiz oyun.'; end if;
  if action='quick' then
   select * into r from wordshift_private.rooms where mode=game_mode and level=lvl and quick and status='waiting' and cardinality(players)=1 and players[1]<>who order by created_at limit 1 for update;
  else r.id:=null; end if;
 end if;
 if r.id is not null and r.status='waiting' then
  update wordshift_private.rooms set players=array_append(players,who),names=array_append(names,nick),seen=array_append(seen,now()),
   status=case when mode='battle' then 'placing' else 'active' end, started_at=now(),starts_at=now()+interval '3 seconds',
   deadline=now()+case when mode='battle' then interval '120 seconds' when mode='blocks' then interval '63 seconds' when mode='sentences' then interval '93 seconds' else interval '13 seconds' end
   where id=r.id;
  return r.id;
 end if;
 if action='join' then raise exception 'Oda bulunamadı.'; end if;
 if game_mode='sentences' then
  select jsonb_agg(jsonb_build_object('front',front,'back',back,'options',(select jsonb_agg(token order by random()) from unnest(string_to_array(back,' ')) token)) order by random()) into deck_data from wordshift_private.sentences where level=lvl;
  set_title:='Cümle Düellosu · '||lvl;
 elsif game_mode='buzzer' then
  if jsonb_typeof(words) is distinct from 'array' or octet_length(words::text)>180000 or jsonb_array_length(words)>20 then raise exception 'Geçersiz soru listesi.';end if;
  with clean as (
   select left(trim(w->>'front'),2400) front,left(trim(w->>'back'),700) back,
    case when jsonb_typeof(w->'options')='array' then w->'options' else '[]'::jsonb end choices, ord
   from jsonb_array_elements(words) with ordinality v(w,ord)
   where jsonb_typeof(w->'front')='string' and jsonb_typeof(w->'back')='string' and trim(w->>'front')<>'' and trim(w->>'back')<>''
  ), prepared as (
   select front,back,ord,(select jsonb_agg(v order by random()) from
    (select back as v union select v from (select distinct left(trim(o#>>'{}'),700) v from jsonb_array_elements(choices) o
     where jsonb_typeof(o)='string' and trim(o#>>'{}')<>'' and left(trim(o#>>'{}'),700)<>back limit 3) others) opts) options
   from clean
  )
  select jsonb_agg(jsonb_build_object('front',front,'back',back,'options',case when jsonb_array_length(options)>1 then options else '[]'::jsonb end) order by ord) into deck_data from prepared;
  if deck_data is null then raise exception 'Bu oyun için sette en az bir yazılı soru veya kelime olmalı.';end if;
 else
 if jsonb_typeof(words) is distinct from 'array' or octet_length(words::text)>100000 or jsonb_array_length(words)>100 then raise exception 'Geçersiz kelime listesi.'; end if;
 -- Strip private workspace fields; unique prompts AND translations avoid ambiguous matching.
 with clean as (
  select distinct on (lower(trim(w->>'back'))) left(trim(w->>'front'),200) front,left(trim(w->>'back'),300) back
  from jsonb_array_elements(words) w where jsonb_typeof(w->'front')='string' and jsonb_typeof(w->'back')='string' and length(trim(w->>'front'))>0 and length(trim(w->>'back'))>0
 ), unique_words as (select distinct on (lower(front)) front,back from clean), chosen as (
  select * from unique_words order by random() limit case when game_mode='blocks' then 8 else 20 end
 ), prepared as (
  select c.front,c.back,(select jsonb_agg(v order by random()) from (select c.back v union select back from (select back from chosen where back<>c.back order by random() limit 3) others) opts) options from chosen c
 ) select jsonb_agg(to_jsonb(prepared) order by random()) into deck_data from prepared;
 if coalesce(jsonb_array_length(deck_data),0)<4 then raise exception 'En az 4 farklı İngilizce kelime ve Türkçe karşılık gerekli.'; end if;
 end if;
 select array_agg(i order by random()) into order_data from generate_series(0,jsonb_array_length(deck_data)-1) i;
 insert into wordshift_private.rooms(code,mode,level,title,quick,players,names,seen,deck,right_order)
 values(upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)),game_mode,lvl,left(coalesce(set_title,''),120),action='quick',array[who],array[nick],array[now()],deck_data,order_data) returning id into candidate;
 return candidate;
end $$;

-- Applies exactly one attempted answer. The caller holds the room row lock.
create or replace function wordshift_private.buzzer_answer(r wordshift_private.rooms, ok boolean, t timestamptz)
returns wordshift_private.rooms language plpgsql set search_path='' as $$
declare actor integer:=r.turn_no; opponent integer:=3-actor;
begin
 r.answers:=jsonb_set(r.answers,array[(actor-1)::text],jsonb_build_object('ok',ok));
 if ok then
  r.lives[opponent]:=r.lives[opponent]-1;r.correct_counts[actor]:=r.correct_counts[actor]+1;r.scores[actor]:=r.scores[actor]+100;
  r.event:=jsonb_build_object('serial',r.round_no,'by',actor,'hit',true);
 else
  r.wrong_counts[actor]:=r.wrong_counts[actor]+1;
  if r.answers->(opponent-1)='null'::jsonb then
   r.turn_no:=opponent;r.phase:='claimed';r.deadline:=t+interval '10 seconds';return r;
  end if;
 end if;
 r.phase:='feedback';r.deadline:=t+interval '2600 milliseconds';
 return r;
end $$;
revoke all on function wordshift_private.buzzer_answer(wordshift_private.rooms,boolean,timestamptz) from public,anon,authenticated;

create or replace function public.wordshift_pvp_room(room_id uuid, action text default 'poll', token integer default 0, value integer default -1, extra jsonb default 'null')
returns jsonb language plpgsql security definer set search_path='' as $$
declare r wordshift_private.rooms; who uuid:=auth.uid(); me integer; other integer; t timestamptz:=clock_timestamp(); q jsonb; ok boolean; allcells integer[]:='{}'; groupcells integer[]; ship jsonb; cell integer; n integer; j integer; ending boolean:=false; next_turn boolean:=false; slow_turn boolean:=false; mine jsonb; theirs jsonb; result jsonb; prev_start timestamptz; buzzer_expired boolean:=false;
begin
 if who is null then raise exception 'Giriş yapmalısın.'; end if;
 select * into r from wordshift_private.rooms where id=room_id for update;
 t:=clock_timestamp();
 if not found or not who=any(r.players) then raise exception 'Bu odaya erişimin yok veya odanın süresi dolmuş.'; end if;
 me:=array_position(r.players,who); other:=3-me;
 if action not in ('poll','leave','answer','pair','fleet','shot','sentence','buzz','avatar') then raise exception 'Geçersiz işlem.'; end if;
 if r.status in ('active','placing') and (r.seen[other]<t-interval '30 seconds' or r.seen[me]<t-interval '30 seconds') then
  r.status:='finished';r.reason:='Bağlantı 30 saniye boyunca kurulamadı.';
  r.winner:=case when r.seen[1]<t-interval '30 seconds' and r.seen[2]<t-interval '30 seconds' then null when r.seen[1]<t-interval '30 seconds' then 2 else 1 end;
 end if;
 r.seen[me]:=t;
 if r.status='waiting' and r.created_at<t-interval '10 minutes' then r.status:='finished';r.reason:='Bekleme süresi doldu.';end if;
 if r.status in ('active','placing') and r.started_at<t-interval '15 minutes' then r.status:='finished';r.reason:='Maçın azami süresi doldu.';ending:=true;end if;
 if action='leave' and r.status<>'finished' then r.status:='finished';r.winner:=case when cardinality(r.players)=2 then other else null end;r.reason:='Oyuncu odadan ayrıldı.';end if;
 if r.status='placing' and t>=r.deadline then r.status:='finished';r.reason:='Filo yerleştirme süresi doldu.';r.winner:=case when r.ready[1] and not r.ready[2] then 1 when r.ready[2] and not r.ready[1] then 2 else null end;end if;
 if r.mode='buzzer' and action='avatar' and value between 0 and 6 and (r.status='waiting' or (r.status='active' and r.phase='question')) then r.avatars[me]:=value;end if;
 if r.status='active' and r.mode='buzzer' and t>=r.deadline then
  buzzer_expired:=true;
  if r.phase='claimed' then r:=wordshift_private.buzzer_answer(r,false,t);
  elsif r.phase='question' then r.phase:='feedback';r.deadline:=t+interval '2600 milliseconds';
  elsif 0=any(r.lives) then r.status:='finished';r.winner:=case when r.lives[1]=0 then 2 else 1 end;r.reason:='Üç can tükendi.';
  else r.round_no:=r.round_no+1;r.phase:='question';r.answers:='[null,null]';r.event:=null;r.starts_at:=t+interval '800 milliseconds';r.deadline:=r.starts_at+interval '10 seconds';
  end if;
 end if;
 if r.status='active' and r.mode in ('runner','meteor','sentences') then
  if r.phase='question' and t>=r.deadline then
   for j in 0..1 loop if r.answers->j='null'::jsonb then r.answers:=jsonb_set(r.answers,array[j::text],jsonb_build_object('ok',false,'timeout',true));r.wrong_counts[j+1]:=r.wrong_counts[j+1]+1;if r.mode in ('runner','meteor') then r.lives[j+1]:=greatest(0,r.lives[j+1]-1);end if;end if;end loop;
   r.phase:='feedback';r.deadline:=t+interval '3500 milliseconds';
  elsif r.phase='feedback' and t>=r.deadline then
   r.round_no:=r.round_no+1;
   if r.mode='sentences' and r.round_no>=jsonb_array_length(r.deck) then r.status:='finished';r.reason:='Tüm kelimeler tamamlandı.';ending:=true;
   else r.phase:='question';r.answers:='[null,null]';r.starts_at:=t+case when r.mode='runner' then interval '2400 milliseconds' else interval '600 milliseconds' end;r.deadline:=r.starts_at+case when r.mode='sentences' then interval '90 seconds' else interval '10 seconds' end;end if;
  end if;
 elsif r.status='active' and r.mode='blocks' and t>=r.deadline then r.status:='finished';r.reason:='Süre doldu.';ending:=true;
 elsif r.status='active' and r.mode='battle' and t>=r.deadline then
  if r.phase='question' then r.wrong_counts[r.turn_no]:=r.wrong_counts[r.turn_no]+1;slow_turn:=true;end if;r.event:=jsonb_build_object('serial',r.round_no,'text',case when r.phase='question' then 'Süre doldu. Doğrusu: '||(r.deck->(r.round_no%jsonb_array_length(r.deck))->>'back')||' · sıra değişti.' else 'Süre doldu; sıra değişti.' end);next_turn:=true;
 end if;
 -- An expired turn is advanced BEFORE accepting any action, so stale packets cannot fire.
 if next_turn then
  r.turn_no:=3-r.turn_no;r.round_no:=r.round_no+1;r.phase:='question';r.answers:='[null,null]';r.starts_at:=t+case when slow_turn then interval '3500 milliseconds' else interval '1 second' end;r.deadline:=r.starts_at+interval '10 seconds';next_turn:=false;slow_turn:=false;
 end if;
 if r.status='placing' and action='fleet' and not r.ready[me] then
  if jsonb_typeof(extra) is distinct from 'array' or jsonb_array_length(extra)<>3 then raise exception 'Üç gemi yerleştirmelisin.';end if;
  for j in 0..2 loop
   ship:=extra->j;n:=3-j;
   if jsonb_typeof(ship) is distinct from 'array' or jsonb_array_length(ship)<>n then raise exception 'Gemiler 3, 2 ve 1 hücre olmalı.';end if;
   select array_agg(v::integer order by v::integer) into groupcells from jsonb_array_elements_text(ship) v;
   for cell in select unnest(groupcells) loop if cell is null or cell<0 or cell>24 or cell=any(allcells) then raise exception 'Gemiler çakışıyor veya tahta dışında.';end if;allcells:=array_append(allcells,cell);end loop;
   if n>1 and not ((groupcells[n]-groupcells[1]=n-1 and groupcells[1]/5=groupcells[n]/5) or (groupcells[n]-groupcells[1]=(n-1)*5 and (n<>3 or groupcells[2]-groupcells[1]=5))) then raise exception 'Gemi düz ve bitişik olmalı.';end if;
  end loop;
  r.fleets:=jsonb_set(r.fleets,array[(me-1)::text],to_jsonb(allcells));r.ready[me]:=true;
  if r.ready[1] and r.ready[2] then r.status:='active';r.starts_at:=t+interval '3 seconds';r.deadline:=r.starts_at+case when r.mode='sentences' then interval '90 seconds' else interval '10 seconds' end;end if;
 end if;
 q:=r.deck->(r.round_no%jsonb_array_length(r.deck));
 if r.status='active' and t>=r.starts_at and t<r.deadline and token=r.round_no then
  if r.mode='buzzer' and not buzzer_expired then
   if action='buzz' and r.phase='question' then
    r.turn_no:=me;r.phase:='claimed';r.deadline:=t+interval '10 seconds';
   elsif action='answer' and r.phase='claimed' and r.turn_no=me and r.answers->(me-1)='null'::jsonb then
    if jsonb_array_length(q->'options')=0 then
     if jsonb_typeof(extra) is distinct from 'string' or length(trim(extra#>>'{}'))=0 then raise exception 'Cevabını yaz.';end if;
     ok:=lower(trim(extra#>>'{}'))=lower(q->>'back');
    else
     if value is null or value<0 or value>=jsonb_array_length(q->'options') then raise exception 'Geçersiz seçenek.';end if;
     ok:=(q->'options'->>value)=(q->>'back');
    end if;
    r:=wordshift_private.buzzer_answer(r,ok,t);
   end if;
  elsif ((action='answer' and r.mode in ('runner','meteor','battle')) or (action='sentence' and r.mode='sentences')) and r.phase='question' and r.answers->(me-1)='null'::jsonb and (r.mode<>'battle' or r.turn_no=me) then
   if r.mode='sentences' then
    if jsonb_typeof(extra) is distinct from 'array' then raise exception 'Cümle sırası geçersiz.';end if;
    if jsonb_array_length(extra)<>jsonb_array_length(q->'options') then ok:=false;
    else
     select count(distinct x::integer)=jsonb_array_length(extra) and min(x::integer)>=0 and max(x::integer)<jsonb_array_length(extra) into ok from jsonb_array_elements_text(extra) x;
     if ok then select string_agg(q->'options'->>(x::text)::integer,' ' order by ord)=q->>'back' into ok from jsonb_array_elements(extra) with ordinality v(x,ord);end if;
    end if;
   else ok:=coalesce(value>=0 and q->'options'->>value=q->>'back',false);end if;
   if r.mode='sentences' and not ok then
    -- A wrong try does not close the sentence: the player may fix it until the time is up.
    r.wrong_counts[me]:=r.wrong_counts[me]+1;
   else
    r.answers:=jsonb_set(r.answers,array[(me-1)::text],jsonb_build_object('ok',ok,'choice',value));
    if ok then r.scores[me]:=r.scores[me]+100;r.correct_counts[me]:=r.correct_counts[me]+1;else r.wrong_counts[me]:=r.wrong_counts[me]+1;if r.mode in ('runner','meteor') then r.lives[me]:=greatest(0,r.lives[me]-1);end if;end if;
    if r.mode='battle' then
     if ok then r.phase:='shoot';r.deadline:=t+interval '10 seconds';else next_turn:=true;slow_turn:=true;end if;
     r.event:=jsonb_build_object('serial',r.round_no,'text',case when ok then 'Doğru cevap! Atış hakkı kazanıldı.' else 'Yanlış cevap. Doğrusu: '||(q->>'back') end);
    elsif r.mode='sentences' then
     -- The first player to finish the sentence takes it; the other one gets no points and we move on.
     if r.answers->(other-1)='null'::jsonb then r.answers:=jsonb_set(r.answers,array[(other-1)::text],jsonb_build_object('ok',false,'lost',true));end if;
     r.phase:='feedback';r.deadline:=t+interval '2500 milliseconds';
    elsif r.answers->0<>'null'::jsonb and r.answers->1<>'null'::jsonb then
     r.phase:='feedback';r.deadline:=t+case when coalesce((r.answers->0->>'ok')::boolean,false) and coalesce((r.answers->1->>'ok')::boolean,false) then interval '1600 milliseconds' else interval '3500 milliseconds' end;
    end if;
   end if;
  elsif action='shot' and r.mode='battle' and r.phase='shoot' and r.turn_no=me and value between 0 and 24 and not r.shots->(me-1) @> jsonb_build_array(value) then
   r.shots:=jsonb_set(r.shots,array[(me-1)::text],(r.shots->(me-1))||jsonb_build_array(value));
   ok:=r.fleets->(other-1) @> jsonb_build_array(value);
   r.event:=jsonb_build_object('serial',r.round_no,'text',case when ok then 'İsabet!' else 'Iska!' end,'hit',ok,'by',me,'cell',value);
   if (r.shots->(me-1)) @> (r.fleets->(other-1)) then r.status:='finished';r.winner:=me;r.reason:='Rakip filo batırıldı.';else next_turn:=true;end if;
  elsif action='pair' and r.mode='blocks' and value between 0 and jsonb_array_length(r.deck)-1 and jsonb_typeof(extra)='number' then
   if r.last_attempt[me] is null or t-r.last_attempt[me]>=interval '300 milliseconds' then
    r.last_attempt[me]:=t;
    ok:=coalesce(r.right_order[(extra::text)::integer+1]=value,false);
    if not r.completed->(me-1) @> jsonb_build_array(value) then
     if ok then
      r.completed:=jsonb_set(r.completed,array[(me-1)::text],(r.completed->(me-1))||jsonb_build_array(value));r.scores[me]:=r.scores[me]+100;r.correct_counts[me]:=r.correct_counts[me]+1;
      if jsonb_array_length(r.completed->(me-1))=jsonb_array_length(r.deck) then r.finish_times[me]:=(extract(epoch from(t-r.starts_at))*1000)::bigint;end if;
     else r.scores[me]:=greatest(0,r.scores[me]-15);r.wrong_counts[me]:=r.wrong_counts[me]+1;end if;
    end if;
    r.answers:=jsonb_set(r.answers,array[(me-1)::text],jsonb_build_object('ok',ok,'left',value,'right',extra,'at',t));
    if r.finish_times[1] is not null and r.finish_times[2] is not null then r.status:='finished';r.reason:='Eşleştirmeler tamamlandı.';ending:=true;end if;
   end if;
  end if;
 end if;
 if r.status='active' and r.mode in ('runner','meteor') and r.phase='feedback' and (r.lives[1]=0 or r.lives[2]=0) then r.status:='finished';r.reason:='Üç can tükendi.';r.winner:=case when r.lives[1]=0 and r.lives[2]=0 then null when r.lives[1]=0 then 2 else 1 end;end if;
 if next_turn then r.turn_no:=3-r.turn_no;r.round_no:=r.round_no+1;r.phase:='question';r.answers:='[null,null]';r.starts_at:=t+case when slow_turn then interval '3500 milliseconds' else interval '1600 milliseconds' end;slow_turn:=false;r.deadline:=r.starts_at+case when r.mode='sentences' then interval '90 seconds' else interval '10 seconds' end;end if;
 if ending then
  r.winner:=case when r.mode in ('runner','meteor') and r.lives[1]>r.lives[2] then 1 when r.mode in ('runner','meteor') and r.lives[2]>r.lives[1] then 2 when r.scores[1]>r.scores[2] then 1 when r.scores[2]>r.scores[1] then 2 when r.mode='blocks' and coalesce(r.finish_times[1],9999999)<coalesce(r.finish_times[2],9999999) then 1 when r.mode='blocks' and coalesce(r.finish_times[2],9999999)<coalesce(r.finish_times[1],9999999) then 2 else null end;
 end if;
 update wordshift_private.rooms set avatars=r.avatars,lives=r.lives,correct_counts=r.correct_counts,wrong_counts=r.wrong_counts,seen=r.seen,status=r.status,phase=r.phase,starts_at=r.starts_at,deadline=r.deadline,round_no=r.round_no,turn_no=r.turn_no,scores=r.scores,ready=r.ready,answers=r.answers,fleets=r.fleets,shots=r.shots,completed=r.completed,last_attempt=r.last_attempt,finish_times=r.finish_times,event=r.event,winner=r.winner,reason=r.reason where id=r.id;
 q:=r.deck->(r.round_no%jsonb_array_length(r.deck));
 result:=jsonb_build_object('avatars',r.avatars,'lives',r.lives,'correctCounts',r.correct_counts,'wrongCounts',r.wrong_counts,'id',r.id,'code',r.code,'mode',r.mode,'level',r.level,'title',r.title,'status',r.status,'phase',r.phase,'me',me,'names',r.names,'scores',r.scores,'ready',r.ready,'round',r.round_no,'turn',r.turn_no,'total',jsonb_array_length(r.deck),'startsAt',r.starts_at,'deadline',r.deadline,'serverNow',t,'seen',r.seen,'winner',r.winner,'reason',r.reason,'event',r.event,'answer',r.answers->(me-1),'opponentAnswered',r.answers->(other-1)<>'null'::jsonb,'opponentCorrect',r.answers->(other-1)->'ok');
 if r.mode='blocks' then
  select jsonb_agg(jsonb_build_object('key',i,'text',r.deck->i->>'front') order by i) into mine from generate_series(0,jsonb_array_length(r.deck)-1) i;
  select jsonb_agg(jsonb_build_object('key',i-1,'text',r.deck->r.right_order[i]->>'back') order by i) into theirs from generate_subscripts(r.right_order,1) i;
  result:=result||jsonb_build_object('left',mine,'right',theirs,'completed',r.completed->(me-1),'opponentDone',jsonb_array_length(r.completed->(other-1)),'doneRight',(select coalesce(jsonb_agg(i-1),'[]') from generate_subscripts(r.right_order,1) i where r.completed->(me-1) @> jsonb_build_array(r.right_order[i])));
 elsif r.status in ('active','finished') then
  result:=result||jsonb_build_object('question',jsonb_build_object('front',q->>'front','options',case when r.mode='buzzer' and (r.phase<>'claimed' or r.turn_no<>me) then '[]'::jsonb else q->'options' end));
  if r.phase='feedback' or (r.mode<>'buzzer' and r.answers->(me-1)<>'null'::jsonb) then result:=result||jsonb_build_object('correct',q->>'back');end if;
 end if;
 if r.mode='battle' then
  result:=result||jsonb_build_object('fleet',r.fleets->(me-1),'shots',r.shots->(me-1),'incoming',r.shots->(other-1),'hits',(select coalesce(jsonb_agg(v),'[]') from jsonb_array_elements(r.shots->(me-1)) v where r.fleets->(other-1) @> jsonb_build_array(v)));
 end if;
 return result;
end $$;
revoke all on function public.wordshift_pvp_lobby(text,text,jsonb,text,text,text) from public,anon;
revoke all on function public.wordshift_pvp_room(uuid,text,integer,integer,jsonb) from public,anon;
grant execute on function public.wordshift_pvp_lobby(text,text,jsonb,text,text,text) to authenticated;
grant execute on function public.wordshift_pvp_room(uuid,text,integer,integer,jsonb) to authenticated;

drop function if exists public.wordshift_pvp_pools();
create or replace function public.wordshift_pvp_pools(pool_level text default '') returns jsonb language plpgsql security definer set search_path='' as $$
declare who uuid:=auth.uid();lvl text;output jsonb;
begin
 if who is null then raise exception 'Giriş yapmalısın.';end if;
 perform wordshift_private.expire_rooms();
 select coalesce(document->>'level','A1') into lvl from public.wordshift_workspaces where user_id=who;lvl:=coalesce(lvl,'A1');
 if pool_level in ('YDS','YOKDIL') then lvl:=pool_level;end if;
 select jsonb_agg(jsonb_build_object('mode',m,'waiting',
  (select count(*) from wordshift_private.rooms where mode=m and status='waiting' and quick and not who=any(players)),
  'compatible',(select count(*) from wordshift_private.rooms where mode=m and level=lvl and status='waiting' and quick and not who=any(players)),
  'samples',(select count(*) from wordshift_private.rooms where mode=m and level=lvl and quick and started_at>now()-interval '24 hours'),
  'estimateSeconds',(select case when count(*)>=3 then ceil(avg(extract(epoch from(started_at-created_at)))) else null end from wordshift_private.rooms where mode=m and level=lvl and quick and started_at>now()-interval '24 hours')
 )) into output from unnest(array['runner','battle','blocks','meteor','sentences','buzzer']) m;
 return jsonb_build_object('level',lvl,'pools',output,'serverNow',clock_timestamp());
end $$;
create or replace function public.wordshift_pvp_history(page_offset integer default 0) returns jsonb language plpgsql security definer set search_path='' as $$
declare who uuid:=auth.uid();output jsonb;
begin
 if who is null then raise exception 'Giriş yapmalısın.';end if;
 perform wordshift_private.expire_rooms();
 select coalesce(jsonb_agg(to_jsonb(h)||jsonb_build_object('me',array_position(h.players,who)) order by h.ended_at desc),'[]') into output from (select * from wordshift_private.match_history where who=any(players) order by ended_at desc limit 20 offset greatest(0,least(coalesce(page_offset,0),10000))) h;
 return output;
end $$;
revoke all on function public.wordshift_pvp_pools(text) from public,anon;
revoke all on function public.wordshift_pvp_history(integer) from public,anon;
grant execute on function public.wordshift_pvp_pools(text) to authenticated;
grant execute on function public.wordshift_pvp_history(integer) to authenticated;

notify pgrst, 'reload schema';
-- Her iki RPC'yi ziyaretçi olarak gerçekten çağır. Hata olursa kurulum geri alınır.
set local role anon;
do $verify$
declare target uuid;
begin
 select user_id into target from public.wordshift_leaderboard('global','',0) limit 1;
 perform * from public.wordshift_user_profile(target);
end $verify$;
reset role;
notify pgrst, 'reload schema';
commit;
select 'Misafir profil ve liderlik erişimi doğrulandı. Bıng Düellosu hazır.' as sonuc;
