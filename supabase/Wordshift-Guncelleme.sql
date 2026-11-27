-- Sorgu adı: Wordshift | 2026-11-27 | Arkadaş davetleri, rövanş ve çizim kelimeleri
-- Wordshift: Misafir profil ve sıralama erişimi ve on bir çevrimiçi oyun
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
do $$
begin
 if exists(select 1 from information_schema.columns where table_schema='wordshift_private' and table_name='rooms' and column_name='lives')
 and not exists(select 1 from information_schema.columns where table_schema='wordshift_private' and table_name='rooms' and column_name='traffic_seed') then
  update wordshift_private.rooms set lives=array[4+lives[1],4+lives[2]] where mode='detective' and status='active';
 end if;
end $$;
alter table wordshift_private.rooms
 add column if not exists race_rounds integer[] not null default '{0,0}',
 add column if not exists race_starts timestamptz[],
 add column if not exists race_ends timestamptz[],
 add column if not exists race_feedback boolean[] not null default '{false,false}',
 add column if not exists studio_log jsonb not null default '[]',
 add column if not exists replay_notice jsonb,
 add column if not exists replay_offer jsonb,
 add column if not exists replay_until timestamptz,
 add column if not exists replay_next uuid,
 add column if not exists spectator_left boolean[] not null default array[false,false],
 add column if not exists traffic_seed integer not null default floor(random()*1000000)::integer,
 add column if not exists race_moves jsonb not null default '[null,null]';
alter table wordshift_private.rooms add column if not exists guests boolean[] not null default array[false,false];
alter table wordshift_private.rooms add column if not exists guesses jsonb not null default '[[],[]]';
alter table wordshift_private.rooms add column if not exists lanes integer[] not null default array[0,0];
alter table wordshift_private.rooms add column if not exists avatars integer[] not null default array[0,1];
alter table wordshift_private.rooms drop constraint if exists rooms_mode_check;
alter table wordshift_private.rooms add constraint rooms_mode_check check(mode in ('runner','meteor','blocks','battle','sentences','buzzer','tower','crossing','detective','draw','taboo'));
alter table wordshift_private.rooms enable row level security;
revoke all on wordshift_private.rooms from public,anon,authenticated;
create index if not exists wordshift_queue on wordshift_private.rooms(mode,level,created_at) where status='waiting';


create table if not exists wordshift_private.drawing_words(front text primary key,back text not null);
revoke all on wordshift_private.drawing_words from public,anon,authenticated;
insert into wordshift_private.drawing_words values ('deodorant','deodorant'),('computer','bilgisayar'),('glass','bardak'),('cup','fincan'),('mug','kupa'),('book','kitap'),('bottle','şişe'),('car','araba'),('microphone','mikrofon'),('monitor','monitör'),('bed','yatak'),('pillow','yastık'),('frame','çerçeve'),('picture frame','resim çerçevesi'),('wardrobe','gardırop'),('cupboard','dolap'),('sock','çorap'),('socks','çoraplar'),('guitar','gitar'),('hanger','askı'),('coat hanger','elbise askısı'),('curtain','perde'),('window','pencere'),('smoke','duman'),('table','masa'),('chair','sandalye'),('desk','çalışma masası'),('lamp','lamba'),('sofa','kanepe'),('shelf','raf'),('mirror','ayna'),('rug','kilim'),('carpet','halı'),('blanket','battaniye'),('clock','saat'),('door','kapı'),('key','anahtar'),('lock','kilit'),('fence','çit'),('ladder','merdiven'),('stairs','basamaklar'),('house','ev'),('tent','çadır'),('tower','kule'),('bridge','köprü'),('castle','kale'),('lighthouse','deniz feneri'),('windmill','yel değirmeni'),('roof','çatı'),('chimney','baca'),('bathtub','küvet'),('shower','duş'),('toilet','tuvalet'),('sink','lavabo'),('soap','sabun'),('toothbrush','diş fırçası'),('toothpaste','diş macunu'),('towel','havlu'),('comb','tarak'),('brush','fırça'),('broom','süpürge'),('bucket','kova'),('basket','sepet'),('box','kutu'),('bag','çanta'),('backpack','sırt çantası'),('suitcase','bavul'),('wallet','cüzdan'),('umbrella','şemsiye'),('hat','şapka'),('cap','kep'),('scarf','atkı'),('glove','eldiven'),('sweater','kazak'),('shirt','gömlek'),('coat','palto'),('jacket','ceket'),('skirt','etek'),('dress','elbise'),('belt','kemer'),('shoe','ayakkabı'),('boot','bot'),('glasses','gözlük'),('sunglasses','güneş gözlüğü'),('ring','yüzük'),('crown','taç'),('necklace','kolye'),('plate','tabak'),('bowl','kâse'),('fork','çatal'),('knife','bıçak'),('spoon','kaşık'),('pan','tava'),('pot','tencere'),('teapot','demlik'),('kettle','su ısıtıcısı'),('jar','kavanoz'),('fridge','buzdolabı'),('oven','fırın'),('toaster','ekmek kızartma makinesi'),('cake','pasta'),('bread','ekmek'),('sandwich','sandviç'),('pizza','pizza'),('cheese','peynir'),('egg','yumurta'),('apple','elma'),('banana','muz'),('lemon','limon'),('pear','armut'),('pineapple','ananas'),('watermelon','karpuz'),('cherry','kiraz'),('strawberry','çilek'),('grapes','üzüm'),('carrot','havuç'),('onion','soğan'),('tomato','domates'),('mushroom','mantar'),('ice cream','dondurma'),('popcorn','patlamış mısır'),('lollipop','lolipop'),('pencil','kurşun kalem'),('pen','kalem'),('notebook','defter'),('envelope','zarf'),('scissors','makas'),('ruler','cetvel'),('eraser','silgi'),('paper clip','ataş'),('paintbrush','boya fırçası'),('camera','kamera'),('laptop','dizüstü bilgisayar'),('keyboard','klavye'),('printer','yazıcı'),('phone','telefon'),('telephone','telefon'),('smartphone','akıllı telefon'),('headphones','kulaklık'),('radio','radyo'),('television','televizyon'),('battery','pil'),('plug','fiş'),('light bulb','ampul'),('piano','piyano'),('violin','keman'),('drum','davul'),('flute','flüt'),('trumpet','trompet'),('bell','çan'),('ball','top'),('kite','uçurtma'),('balloon','balon'),('teddy bear','oyuncak ayı'),('robot','robot'),('bicycle','bisiklet'),('bike','bisiklet'),('motorcycle','motosiklet'),('truck','kamyon'),('bus','otobüs'),('train','tren'),('boat','tekne'),('ship','gemi'),('airplane','uçak'),('plane','uçak'),('helicopter','helikopter'),('rocket','roket'),('tractor','traktör'),('ambulance','ambulans'),('fire engine','itfaiye aracı'),('traffic light','trafik lambası'),('wheel','tekerlek'),('anchor','çapa'),('hammer','çekiç'),('saw','testere'),('nail','çivi'),('screw','vida'),('shovel','kürek'),('rope','ip'),('flag','bayrak'),('candle','mum'),('lantern','fener'),('coin','madeni para'),('tree','ağaç'),('leaf','yaprak'),('flower','çiçek'),('cactus','kaktüs'),('mountain','dağ'),('volcano','yanardağ'),('island','ada'),('river','nehir'),('waterfall','şelale'),('cloud','bulut'),('rain','yağmur'),('rainbow','gökkuşağı'),('snowflake','kar tanesi'),('snowman','kardan adam'),('sun','güneş'),('moon','ay'),('star','yıldız'),('lightning','şimşek'),('cat','kedi'),('dog','köpek'),('mouse','fare'),('rabbit','tavşan'),('bear','ayı'),('panda','panda'),('monkey','maymun'),('gorilla','goril'),('elephant','fil'),('giraffe','zürafa'),('lion','aslan'),('tiger','kaplan'),('zebra','zebra'),('horse','at'),('donkey','eşek'),('cow','inek'),('sheep','koyun'),('goat','keçi'),('pig','domuz'),('bird','kuş'),('duck','ördek'),('penguin','penguen'),('owl','baykuş'),('chicken','tavuk'),('fish','balık'),('whale','balina'),('dolphin','yunus'),('shark','köpek balığı'),('octopus','ahtapot'),('crab','yengeç'),('frog','kurbağa'),('turtle','kaplumbağa'),('snake','yılan'),('snail','salyangoz'),('butterfly','kelebek'),('spider','örümcek'),('bee','arı'),('ant','karınca'),('dinosaur','dinozor'),('eye','göz'),('ear','kulak'),('nose','burun'),('hand','el'),('tooth','diş'),('foot','ayak'),('triangle','üçgen'),('circle','daire'),('square','kare'),('heart','kalp'),('road','yol'),('school','okul'),('garden','bahçe'),('water','su') on conflict(front) do update set back=excluded.back;

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
 if new.status='finished' and old.status<>'finished' and cardinality(new.players)=2 and new.started_at is not null and new.guests<>array[true,true] then
  select coalesce(jsonb_agg(v),'[]') into hit1 from jsonb_array_elements(new.shots->0) v where (new.fleets->1) @> jsonb_build_array(v);
  select coalesce(jsonb_agg(v),'[]') into hit2 from jsonb_array_elements(new.shots->1) v where (new.fleets->0) @> jsonb_build_array(v);
  insert into wordshift_private.match_history values(new.id,new.mode,new.level,new.title,array[case when not new.guests[1] then new.players[1] end,case when not new.guests[2] then new.players[2] end],new.names,new.scores,new.lives,new.correct_counts,new.wrong_counts,new.shots,jsonb_build_array(hit1,hit2),new.winner,new.reason,new.started_at,clock_timestamp(),new.round_no+1) on conflict(id) do nothing;
 end if;return new;
end $$;
revoke all on function wordshift_private.save_result() from public,anon,authenticated;
drop trigger if exists wordshift_match_finished on wordshift_private.rooms;
create trigger wordshift_match_finished after update on wordshift_private.rooms for each row execute function wordshift_private.save_result();
create or replace function wordshift_private.score_winner(points integer[]) returns integer
language sql immutable set search_path='' as $$
 select case when points[1]>points[2] then 1 when points[2]>points[1] then 2 end
$$;
revoke all on function wordshift_private.score_winner(integer[]) from public,anon,authenticated;

create or replace function wordshift_private.expire_rooms() returns void language plpgsql security definer set search_path='' as $$
begin
 -- Losing contact with a spectator must not interrupt the remaining player's run.
 update wordshift_private.rooms set status='finished',lives=array[0,0],
  winner=wordshift_private.score_winner(scores),reason='Kalan oyuncunun bağlantısı kesildi. Sonuç puanlara göre belirlendi.'
 where status='active' and mode='crossing' and 0=any(lives)
 and ((lives[1]>0 and seen[1]<now()-interval '30 seconds') or (lives[2]>0 and seen[2]<now()-interval '30 seconds'));
 update wordshift_private.rooms set status='finished',reason='Oyuncu bağlantısı 30 saniye boyunca kurulamadı.',
 winner=case when seen[1]<now()-interval '30 seconds' and seen[2]<now()-interval '30 seconds' then null when seen[1]<now()-interval '30 seconds' then 2 else 1 end
 where status in ('active','placing') and not (mode='crossing' and 0=any(lives)) and (seen[1]<now()-interval '30 seconds' or seen[2]<now()-interval '30 seconds');
 update wordshift_private.rooms set status='finished',reason='Bekleme süresi doldu.' where status='waiting' and (created_at<now()-interval '10 minutes' or seen[1]<now()-interval '30 seconds');
 delete from wordshift_private.rooms where created_at<now()-interval '1 day';
end $$;
revoke all on function wordshift_private.expire_rooms() from public,anon,authenticated;

drop function if exists public.wordshift_pvp_lobby(text,text,jsonb,text,text);
-- Match the solo clock. Both the first claimant and a player taking over get an answer budget.
create or replace function wordshift_private.sentence_time(sentence text)
returns interval language sql immutable set search_path='' as $$
 with tokens as (
  select parts[1] word,ord from regexp_matches(lower(sentence), '([a-z]+(?:''[a-z]+)*)', 'g') with ordinality as matched(parts,ord)
 ), counted as (
  select count(*) word_count, count(*) filter (where word in ('if','unless','when','while','although','though','because','since','that','which','who','whose','until','whether')) clauses,
   string_agg(word,' ' order by ord) phrase from tokens
 )
 select make_interval(secs=>least(150,greatest(20,12+3*word_count+7*clauses+
  case when phrase ~ '^(only later|under no circumstances|by no means|had i|had we|had they|the more)( |$)' then 9 else 0 end+
  case when phrase ~ '(^| )(would have|could have|should have|have been|has been|had been|must be|should be|can be)( |$)' then 6 else 0 end))::integer) from counted
$$;
revoke all on function wordshift_private.sentence_time(text) from public,anon,authenticated;

create or replace function wordshift_private.buzzer_time(q jsonb, answering boolean)
returns interval language sql immutable set search_path='' as $$
 with counts as (select cardinality(regexp_split_to_array(trim(q->>'front'),'[[:space:]]+')) words,
  case q->>'type' when 'paragraph' then 12 when 'translate' then 8 when 'blank' then 5 when 'mc' then 3 else 0 end bonus,
  (select coalesce(sum(cardinality(regexp_split_to_array(trim(choice),'[[:space:]]+'))),0) from jsonb_array_elements_text(coalesce(q->'options','[]')) choice) options,
  cardinality(regexp_split_to_array(trim(q->>'back'),'[[:space:]]+')) typed)
 select make_interval(secs=>least(120,10+bonus+ceil(greatest(0,words-3)*0.60)+
   case when not answering then 0 when options>0 then ceil(greatest(0,options-4)*0.45) else 4+ceil(typed*1.2) end)::integer) from counts
$$;
revoke all on function wordshift_private.buzzer_time(jsonb,boolean) from public,anon,authenticated;

create or replace function wordshift_private.play_lobby(who uuid, local_level text, action text, game_mode text default 'meteor', words jsonb default '[]', set_title text default '', room_code text default '', pool_level text default '')
returns uuid language plpgsql security definer set search_path='' as $$
declare  r wordshift_private.rooms; lvl text; nick text; deck_data jsonb; order_data integer[]; candidate uuid;
begin
 if who is null then raise exception 'Çevrimiçi oynamak için giriş yap.'; end if;
 if action not in ('create','quick','join','resume') then raise exception 'Geçersiz işlem.'; end if;
 -- Serialize lobby entry to prevent double joins or two active rooms per account.
 perform pg_advisory_xact_lock(763091);
 perform wordshift_private.expire_rooms();
 update wordshift_private.rooms set status='finished',reason='Odanın süresi doldu.'
 where status='waiting' and (created_at<now()-interval '10 minutes' or seen[1]<now()-interval '30 seconds');
 select * into r from wordshift_private.rooms where who=any(players) and not spectator_left[array_position(players,who)] and status in ('waiting','placing','active') order by created_at desc limit 1 for update;
 if found then
  if r.status='waiting' or (select max(s) from unnest(r.seen) s)>now()-interval '30 seconds' then return r.id; end if;
  update wordshift_private.rooms set status='finished',reason='Bağlantı zaman aşımı.' where id=r.id;
 end if;
 if action='resume' then return null; end if;
 select coalesce(nullif(document->>'name',''),'Oyuncu'),coalesce(document->>'level','A1') into nick,lvl from public.wordshift_workspaces where user_id=who;
 if local_level is not null then nick:='Misafir';lvl:=local_level;end if;
 nick:=left(coalesce(nick,'Oyuncu'),60); lvl:=coalesce(lvl,'A1');
 if lvl not in ('A1','A2','B1','B2','C1','C2') then lvl:='A1'; end if;
 -- Optional exam pool: players who pick YDS or YOKDIL are matched with each other, whatever their CEFR level.
 if coalesce(pool_level,'') not in ('','YDS','YOKDIL') then raise exception 'Geçersiz eşleşme havuzu.'; end if;
 if pool_level in ('YDS','YOKDIL') and game_mode<>'sentences' then lvl:=pool_level; end if;
 if action='join' then
  select * into r from wordshift_private.rooms where code=upper(trim(room_code)) for update;
  if not found or r.status<>'waiting' or cardinality(r.players)<>1 then raise exception 'Oda bulunamadı, dolu veya süresi dolmuş.'; end if;
 else
  if game_mode not in ('runner','meteor','blocks','battle','sentences','buzzer','tower','crossing','detective','draw','taboo') then raise exception 'Geçersiz oyun.'; end if;
  if action='quick' then
   select * into r from wordshift_private.rooms where mode=game_mode and level=lvl and quick and status='waiting' and cardinality(players)=1 and players[1]<>who order by created_at limit 1 for update;
  else r.id:=null; end if;
 end if;
 if r.id is not null and r.status='waiting' then
  update wordshift_private.rooms set guests=array[guests[1],local_level is not null],players=array_append(players,who),names=array_append(names,nick),seen=array_append(seen,now()),
   lives=case when mode='detective' then array[7,7] else lives end,
   status=case when mode in ('battle','buzzer') then 'placing' else 'active' end, started_at=now(),starts_at=now()+interval '3 seconds',
   deadline=now()+case when mode in ('taboo','draw') then interval '78 seconds' when mode='buzzer' then interval '15 seconds' when mode='battle' then interval '120 seconds' when mode='blocks' then interval '63 seconds' when mode='detective' then interval '38 seconds' when mode='crossing' then interval '23 seconds' when mode='sentences' then interval '3 seconds'+wordshift_private.sentence_time(deck->0->>'back') else interval '13 seconds' end
   where id=r.id;
  return r.id;
 end if;
 if action='join' then raise exception 'Oda bulunamadı.'; end if;
 if game_mode='sentences' then
  select jsonb_agg(jsonb_build_object('front',front,'back',back,'options',(select jsonb_agg(token order by random()) from unnest(string_to_array(back,' ')) token)) order by random()) into deck_data from wordshift_private.sentences where level=lvl;
  set_title:='Cümle Düellosu · '||lvl;
 elsif game_mode='draw' then
  if jsonb_typeof(words) is distinct from 'array' or octet_length(words::text)>100000 or jsonb_array_length(words)>100 then raise exception 'Geçersiz çizim destesi.';end if;
  select jsonb_agg(to_jsonb(chosen)) into deck_data from (
   select d.front,d.back from wordshift_private.drawing_words d where d.front in (select lower(trim(w->>'front')) from jsonb_array_elements(words) w)
   order by random() limit 6) chosen;
  if deck_data is null then select jsonb_agg(to_jsonb(chosen)) into deck_data from (select front,back from wordshift_private.drawing_words order by random() limit 6) chosen;end if;
  if jsonb_array_length(deck_data)%2=1 then deck_data:=case when jsonb_array_length(deck_data)=1 then deck_data||deck_data else deck_data-(-1) end;end if;
 elsif game_mode='taboo' then
  if jsonb_typeof(words) is distinct from 'array' or octet_length(words::text)>100000 or jsonb_array_length(words)>100 then raise exception 'Geçersiz kart listesi.';end if;
  with cards as (
   select distinct on (lower(trim(w->>'front'))) left(trim(w->>'front'),150) front,left(trim(w->>'back'),200) back,
    (select jsonb_agg(b order by pos) from (
      select lower(trim(term)) b,min(pos) pos from jsonb_array_elements_text(case when jsonb_typeof(w->'banned')='array' then w->'banned' else '[]' end) with ordinality x(term,pos)
      where length(trim(term)) between 1 and 40 and lower(trim(term))<>lower(trim(w->>'front')) group by lower(trim(term)) order by min(pos) limit 4
    ) terms) banned
   from jsonb_array_elements(words) w where jsonb_typeof(w->'front')='string' and trim(w->>'front')<>''
  ), picked as (select * from cards where jsonb_array_length(banned)=4 order by random() limit 6)
  select jsonb_agg(to_jsonb(picked) order by random()) into deck_data from picked;
  if deck_data is null then raise exception 'En az bir uygun kelime kartı gerekli.';end if;
  -- An even number of turns gives each seat the same number of chances to guess.
  if jsonb_array_length(deck_data)%2=1 then deck_data:=case when jsonb_array_length(deck_data)=1 then deck_data||deck_data else deck_data-(-1) end;end if;
 elsif game_mode='buzzer' then
  if jsonb_typeof(words) is distinct from 'array' or octet_length(words::text)>180000 or jsonb_array_length(words)>20 then raise exception 'Geçersiz soru listesi.';end if;
  with clean as (
   select left(trim(w->>'front'),2400) front,left(trim(w->>'back'),700) back,
    case when w->>'type' in ('blank','paragraph','translate','mc') then w->>'type' else 'word' end as kind,
    case when jsonb_typeof(w->'options')='array' then w->'options' else '[]'::jsonb end choices, ord
   from jsonb_array_elements(words) with ordinality v(w,ord)
   where jsonb_typeof(w->'front')='string' and jsonb_typeof(w->'back')='string' and trim(w->>'front')<>'' and trim(w->>'back')<>''
  ), prepared as (
   select front,back,kind,ord,(select jsonb_agg(v order by random()) from
    (select back as v union select v from (select distinct left(trim(o#>>'{}'),700) v from jsonb_array_elements(choices) o
     where jsonb_typeof(o)='string' and trim(o#>>'{}')<>'' and left(trim(o#>>'{}'),700)<>back limit 3) others) opts) options
   from clean
  )
  select jsonb_agg(jsonb_build_object('front',front,'back',back,'type',kind,'options',case when jsonb_array_length(options)>1 then options else '[]'::jsonb end) order by ord) into deck_data from prepared;
  if deck_data is null then raise exception 'Bu oyun için sette en az bir yazılı soru veya kelime olmalı.';end if;
 else
 if jsonb_typeof(words) is distinct from 'array' or octet_length(words::text)>100000 or jsonb_array_length(words)>100 then raise exception 'Geçersiz kelime listesi.'; end if;
 -- Strip private workspace fields; unique prompts AND translations avoid ambiguous matching.
 with clean as (
  select distinct on (lower(trim(w->>'back'))) left(trim(w->>'front'),200) front,left(trim(w->>'back'),300) back
  from jsonb_array_elements(words) w where jsonb_typeof(w->'front')='string' and jsonb_typeof(w->'back')='string' and length(trim(w->>'front'))>0 and length(trim(w->>'back'))>0
 ), unique_words as (select distinct on (lower(front)) front,back from clean), chosen as (
  select * from unique_words order by random() limit case when game_mode='blocks' then 8 when game_mode in ('tower','crossing','detective') then 100 else 20 end
 ), prepared as (
  select c.front,c.back,(select jsonb_agg(v order by random()) from (select c.back v union select back from (select back from chosen where back<>c.back order by random() limit 3) others) opts) options from chosen c
 ) select jsonb_agg(to_jsonb(prepared) order by random()) into deck_data from prepared;
 if coalesce(jsonb_array_length(deck_data),0)<4 then raise exception 'En az 4 farklı İngilizce kelime ve Türkçe karşılık gerekli.'; end if;
 end if;
 select array_agg(i order by random()) into order_data from generate_series(0,jsonb_array_length(deck_data)-1) i;
 insert into wordshift_private.rooms(code,mode,level,title,quick,guests,players,names,seen,deck,right_order)
 values(upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)),game_mode,lvl,left(coalesce(set_title,''),120),action='quick',array[local_level is not null,false],array[who],array[nick],array[now()],deck_data,order_data) returning id into candidate;
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
   r.turn_no:=opponent;r.phase:='claimed';r.deadline:=t+wordshift_private.buzzer_time(r.deck->(r.round_no%jsonb_array_length(r.deck)),true);return r;
  end if;
 end if;
 r.phase:='feedback';r.deadline:=t+interval '2600 milliseconds';
 return r;
end $$;
revoke all on function wordshift_private.buzzer_answer(wordshift_private.rooms,boolean,timestamptz) from public,anon,authenticated;

-- Two distinct traffic streams in each road, mirrored in crossing-traffic.js.
create or replace function wordshift_private.traffic_hit(seed integer,road integer,travel numeric,x integer)
returns boolean language sql immutable set search_path='' as $$
 with streams as (
  select k,road*2+k idx,case when k=0 then 1 else -1 end dir,
   (case when k=0 then 102 else 205 end)+(seed/(road+1)+47*(road*2+k))%67 speed,
   525+(seed/7+77*(road*2+k))%235 gap,
   (seed/11+193*(road*2+k))%481 base_phase,45+(seed/13+29*(road*2+k))%100 stagger,
   (array[82,60,70,96,58,78])[1+road*2+k]/2+9 clearance
  from generate_series(0,1) k), cars as (
  select streams.*,base_phase+n*gap+case n when 1 then stagger when 2 then -stagger else 0 end phase from streams cross join generate_series(0,2) n)
 select bool_or(ceil((phase-x*dir+speed*(travel+(0.14+k*.45)*.95)-clearance)/(3*gap))
   <=floor((phase-x*dir+speed*(travel+(.42+k*.45)*.95)+clearance)/(3*gap))) from cars
$$;
revoke all on function wordshift_private.traffic_hit(integer,integer,numeric,integer) from public,anon,authenticated;

create or replace function wordshift_private.race_step(r wordshift_private.rooms, me integer, action text, token integer, value integer, extra jsonb, t timestamptz)
returns wordshift_private.rooms language plpgsql set search_path='' as $$
declare
 j integer; q jsonb; a jsonb; ok boolean; letter text; word text; missed integer;
 lane integer; travel numeric; collision boolean;
 duration interval:=case r.mode when 'detective' then interval '35 seconds' when 'crossing' then interval '20 seconds' else interval '10 seconds' end;
begin
 if r.race_starts is null then
  r.race_starts:=array[r.starts_at,r.starts_at];r.race_ends:=array[r.deadline,r.deadline];
  r.race_rounds:=array[r.round_no,r.round_no];
  for j in 1..2 loop
   a:=r.answers->(j-1);
   if a<>'null'::jsonb and (r.mode<>'crossing' or a->>'ok'='false' or a ? 'hopAt') then
    r.race_feedback[j]:=true;r.race_ends[j]:=t+interval '1.3 seconds';
   end if;
  end loop;
 end if;
 for j in 1..2 loop
  if r.lives[j]=0 or t<r.race_ends[j] then continue;end if;
  if r.race_feedback[j] then
   r.race_rounds[j]:=r.race_rounds[j]+1;
   r.answers:=jsonb_set(r.answers,array[(j-1)::text],'null'::jsonb);
   r.guesses:=jsonb_set(r.guesses,array[(j-1)::text],'[]'::jsonb);
   r.race_feedback[j]:=false;r.race_starts[j]:=t;r.race_ends[j]:=t+duration;
  else
   a:=r.answers->(j-1);
   if r.mode='tower' then r.race_moves:=jsonb_set(r.race_moves,array[(j-1)::text],jsonb_build_object('hurtAt',t));end if;
   if a='null'::jsonb then a:=jsonb_build_object('ok',false);r.wrong_counts[j]:=r.wrong_counts[j]+1;end if;
   r.answers:=jsonb_set(r.answers,array[(j-1)::text],a||jsonb_build_object('timeout',true));
   r.lives[j]:=greatest(0,r.lives[j]-1);r.race_feedback[j]:=true;r.race_ends[j]:=t+interval '1.3 seconds';
  end if;
 end loop;
 q:=r.deck->(r.race_rounds[me]%jsonb_array_length(r.deck));
 if r.lives[me]>0 and (r.mode='crossing' or not (0=any(r.lives))) and not r.race_feedback[me] and token=r.race_rounds[me] and t>=r.race_starts[me] then
  if r.mode in ('tower','crossing') and action='answer' and r.answers->(me-1)='null'::jsonb then
   if value is null or value<0 or value>=jsonb_array_length(q->'options') then raise exception 'Geçersiz seçenek.';end if;
   ok:=q->'options'->>value=q->>'back';
   r.answers:=jsonb_set(r.answers,array[(me-1)::text],jsonb_build_object('ok',ok,'choice',value));
   if ok then
    r.correct_counts[me]:=r.correct_counts[me]+1;
    if r.mode='tower' then r.scores[me]:=r.scores[me]+100;
     r.race_moves:=jsonb_set(r.race_moves,array[(me-1)::text],jsonb_build_object('jumpAt',t));
    end if;
   else
    r.wrong_counts[me]:=r.wrong_counts[me]+1;
    if r.mode='tower' then r.race_moves:=jsonb_set(r.race_moves,array[(me-1)::text],jsonb_build_object('hurtAt',t));end if;
   end if;
  elsif action='letter' and r.mode='detective' and r.answers->(me-1)='null'::jsonb then
   letter:=lower(extra#>>'{}');word:=lower(q->>'front');
   if jsonb_typeof(extra)='string' and char_length(letter)=1 and letter~'[[:alnum:]]' and not (r.guesses->(me-1) ? letter) then
    r.guesses:=jsonb_set(r.guesses,array[(me-1)::text],(r.guesses->(me-1))||jsonb_build_array(letter));
    select count(*) into missed from jsonb_array_elements_text(r.guesses->(me-1)) g where strpos(word,g)=0;
    ok:=not exists(select 1 from regexp_split_to_table(word,'') ch where ch~'[[:alnum:]]' and not (r.guesses->(me-1) ? ch));
    if strpos(word,letter)=0 then
     r.lives[me]:=greatest(0,r.lives[me]-1);r.wrong_counts[me]:=r.wrong_counts[me]+1;
    end if;
    if ok or r.lives[me]=0 then
     r.answers:=jsonb_set(r.answers,array[(me-1)::text],jsonb_build_object('ok',ok));
     if ok then r.scores[me]:=r.scores[me]+100;r.correct_counts[me]:=r.correct_counts[me]+1;end if;
    end if;
   end if;
  elsif action='hop' and r.mode='crossing' and r.answers->(me-1)->>'ok'='true' and not (r.answers->(me-1) ? 'hopAt') then
   lane:=r.lanes[me]%3+1;travel:=extract(epoch from(t-r.starts_at));
   collision:=wordshift_private.traffic_hit(r.traffic_seed,lane-1,travel,case when me=1 then -20 else 20 end);
   r.answers:=jsonb_set(r.answers,array[(me-1)::text],(r.answers->(me-1))||jsonb_build_object('hopAt',t,'collision',collision,'fromLane',lane-1));
   r.race_moves:=jsonb_set(r.race_moves,array[(me-1)::text],jsonb_build_object('hopAt',t,'fromLane',lane-1,'collision',collision));
   if collision then r.lanes[me]:=0;else r.lanes[me]:=lane;r.scores[me]:=r.scores[me]+100;end if;
  end if;
  a:=r.answers->(me-1);
  if a<>'null'::jsonb and (r.mode<>'crossing' or a->>'ok'='false' or a ? 'hopAt') then
   r.race_feedback[me]:=true;r.race_ends[me]:=t+interval '1.3 seconds';
   if r.mode<>'detective' and (a->>'ok'='false' or a->>'collision'='true') then r.lives[me]:=greatest(0,r.lives[me]-1);end if;
  end if;
 end if;
 if r.mode='crossing' and r.lives=array[0,0] then
  r.status:='finished';r.winner:=wordshift_private.score_winner(r.scores);
  r.reason:=case when r.winner is null then 'İki oyuncunun da canları tükendi. Puanlar eşit.' else 'İki oyuncunun da canları tükendi. Yüksek puan kazandı.' end;
 elsif r.mode<>'crossing' and 0=any(r.lives) then
  r.status:='finished';r.reason:=case when r.mode='detective' then 'Çöp adam tamamlandı.' else 'Üç can tükendi.' end;
  r.winner:=case when r.lives[1]=r.lives[2] then null when r.lives[1]=0 then 2 else 1 end;
 end if;
 r.round_no:=greatest(r.race_rounds[1],r.race_rounds[2]);
 return r;
end $$;
revoke all on function wordshift_private.race_step(wordshift_private.rooms,integer,text,integer,integer,jsonb,timestamptz) from public,anon,authenticated;

create or replace function wordshift_private.clue_text(input text) returns text
language sql immutable set search_path='' as $$
 select trim(regexp_replace(lower(coalesce(input,'')),'[^[:alnum:]]+',' ','g'))
$$;

create or replace function wordshift_private.guess_hint(guess text,target text) returns text
language plpgsql immutable set search_path='' as $$
declare a text:=wordshift_private.clue_text(guess); b text:=wordshift_private.clue_text(target);
 aw text[]:=string_to_array(a,' '); bw text[]:=string_to_array(b,' '); n int:=0; i int:=1; rest int;
begin
 while n<cardinality(aw) and aw[n+1]=bw[n+1] loop n:=n+1;end loop;
 rest:=cardinality(bw)-n;
 if n>0 and rest>0 then return (case when n=1 then 'First word is right!' else 'First '||n||' words are right!' end)||' '||rest||case when rest=1 then ' more word.' else ' more words.' end;end if;
 if length(a)>=2 and length(b)>=3 and abs(length(a)-length(b))<=1 then
  while i<=length(a) and substr(a,i,1)=substr(b,i,1) loop i:=i+1;end loop;
  if (length(a)=length(b) and (substr(a,i+1)=substr(b,i+1) or (substr(a,i,1)=substr(b,i+1,1) and substr(a,i+1,1)=substr(b,i,1) and substr(a,i+2)=substr(b,i+2))))
   or (length(a)<length(b) and substr(a,i)=substr(b,i+1)) or (length(a)>length(b) and substr(a,i+1)=substr(b,i)) then return 'You''re close! Check your spelling.';end if;
 end if;return 'Try again!';
end $$;

create or replace function wordshift_private.studio_step(r wordshift_private.rooms, me integer, action text, token integer, value integer, extra jsonb, t timestamptz)
returns wordshift_private.rooms language plpgsql set search_path='' as $$
declare
 q jsonb:=r.deck->r.round_no; message text; normalized text; bad text; point jsonb;
begin
 if r.phase='feedback' then
  if t<r.deadline then return r; end if;
  if r.round_no+1>=jsonb_array_length(r.deck) then
   r.status:='finished';r.winner:=wordshift_private.score_winner(r.scores);r.reason:='Turlar tamamlandı.';
  else
   r.round_no:=r.round_no+1;r.turn_no:=3-r.turn_no;r.phase:='question';r.event:=null;
   r.studio_log:='[]';r.answers:='[null,null]';r.starts_at:=t;r.deadline:=t+interval '75 seconds';
  end if;
  return r;
 end if;
 if t>=r.deadline then message:='Süre doldu.';
 elsif t<r.starts_at or token<>r.round_no then return r;
 elsif action='stroke' and r.mode='draw' and r.turn_no=me and value=jsonb_array_length(r.studio_log) then
  if value>=180 then raise exception 'Bu turdaki çizgi sınırına ulaştın.';end if;
  if jsonb_typeof(extra) is distinct from 'object' or octet_length(extra::text)>10000
   or coalesce(extra->>'tool','') not in ('pen','line','fill','rect','ellipse','triangle')
   or coalesce(extra->>'size','') not in ('1','3','6','10') or jsonb_typeof(extra->'size') is distinct from 'number'
   or coalesce(extra->>'color','') !~ '^(10|11|[0-9])$' or jsonb_typeof(extra->'color') is distinct from 'number'
   or jsonb_typeof(extra->'points') is distinct from 'array' then raise exception 'Geçersiz çizim.';end if;
  if jsonb_array_length(extra->'points') not between 1 and (case when extra->>'tool'='pen' then 512 else 2 end) then raise exception 'Geçersiz çizgi uzunluğu.';end if;
  for point in select jsonb_array_elements(extra->'points') loop
   if jsonb_typeof(point) is distinct from 'array' then raise exception 'Geçersiz nokta.';end if;
   if jsonb_array_length(point)<>2 or jsonb_typeof(point->0) is distinct from 'number' or jsonb_typeof(point->1) is distinct from 'number'
    or coalesce(point->>0,'') !~ '^[0-9]{1,3}$' or coalesce(point->>1,'') !~ '^[0-9]{1,3}$' then raise exception 'Geçersiz nokta.';end if;
   if (point->>0)::int>=256 or (point->>1)::int>=160 then raise exception 'Nokta tahta dışında.';end if;
  end loop;
  r.studio_log:=r.studio_log||jsonb_build_array(jsonb_build_object('tool',extra->'tool','size',extra->'size','color',extra->'color','points',extra->'points'));
 elsif action='clue' and r.mode='taboo' and r.turn_no=me and value=jsonb_array_length(r.studio_log) and value<24 then
  if jsonb_typeof(extra) is distinct from 'string' or length(trim(extra#>>'{}')) not between 1 and 180 then raise exception 'En fazla 180 karakterlik bir ipucu yaz.';end if;
  normalized:=wordshift_private.clue_text(extra#>>'{}');
  if normalized='' then return r;end if;
  select term into bad from jsonb_array_elements_text((q->'banned')||jsonb_build_array(q->>'front')) w(term)
   where strpos(' '||normalized||' ',' '||wordshift_private.clue_text(term)||' ')>0 limit 1;
  if bad is not null then
   r.scores[me]:=r.scores[me]-25;r.wrong_counts[me]:=r.wrong_counts[me]+1;message:='💥 Yasak kelime! Anlatıcı −25 puan.';
  else r.studio_log:=r.studio_log||jsonb_build_array(trim(extra#>>'{}'));end if;
 elsif action='guess' and r.turn_no<>me and jsonb_array_length(r.studio_log)>0 and jsonb_typeof(extra)='string' and length(trim(extra#>>'{}')) between 1 and 200 then
  if r.last_attempt[me]>t-interval '350 milliseconds' then return r;end if;
  r.last_attempt[me]:=t;
  if wordshift_private.clue_text(extra#>>'{}')=wordshift_private.clue_text(q->>'front') then
   r.scores[me]:=r.scores[me]+100;r.scores[r.turn_no]:=r.scores[r.turn_no]+50;
   r.answers:=jsonb_set(r.answers,array[(me-1)::text],jsonb_build_object('ok',true));
   r.correct_counts[me]:=r.correct_counts[me]+1;message:='Buldun! Tahmin +100 · anlatım +50.';
  else r.event:=jsonb_build_object('text',left(trim(extra#>>'{}'),100)||' · '||wordshift_private.guess_hint(extra#>>'{}',q->>'front'));end if;
 end if;
 if message is not null then
  r.phase:='feedback';r.deadline:=t+interval '3 seconds';r.event:=jsonb_build_object('text',message||' Kelime: '||(q->>'front'));
 end if;
 return r;
end $$;
revoke all on function wordshift_private.studio_step(wordshift_private.rooms,integer,text,integer,integer,jsonb,timestamptz) from public,anon,authenticated;

create or replace function wordshift_private.play_room(who uuid, local_level text, room_id uuid, action text default 'poll', token integer default 0, value integer default -1, extra jsonb default 'null')
returns jsonb language plpgsql security definer set search_path='' as $$
declare r wordshift_private.rooms;  me integer; other integer; t timestamptz:=clock_timestamp(); q jsonb; ok boolean; allcells integer[]:='{}'; groupcells integer[]; ship jsonb; cell integer; n integer; j integer; ending boolean:=false; next_turn boolean:=false; slow_turn boolean:=false; mine jsonb; theirs jsonb; result jsonb; prev_start timestamptz; buzzer_expired boolean:=false;
 replay_code text; letter text; word text; masked text; missed integer; lane integer; travel numeric; collision boolean;
begin
 if who is null then raise exception 'Giriş yapmalısın.'; end if;
 if action='accept_offer' then perform pg_advisory_xact_lock(763091);end if;
 select * into r from wordshift_private.rooms where id=room_id for update;
 t:=clock_timestamp();
 if not found or not who=any(r.players) then raise exception 'Bu odaya erişimin yok veya odanın süresi dolmuş.'; end if;
 me:=array_position(r.players,who); other:=3-me;
 if action not in ('poll','leave','answer','pair','fleet','shot','sentence','buzz','avatar','letter','hop','stroke','clue','guess','offer','accept_offer','cancel_offer','decline_offer') then raise exception 'Geçersiz işlem.'; end if;
 if r.status='active' and r.mode='crossing' and 0=any(r.lives) then
  for j in 1..2 loop
   if r.lives[j]>0 and r.seen[j]<t-interval '30 seconds' then r.lives[j]:=0;end if;
  end loop;
 elsif r.status in ('active','placing') and (r.seen[other]<t-interval '30 seconds' or r.seen[me]<t-interval '30 seconds') then
  r.status:='finished';r.reason:='Bağlantı 30 saniye boyunca kurulamadı.';
  r.winner:=case when r.seen[1]<t-interval '30 seconds' and r.seen[2]<t-interval '30 seconds' then null when r.seen[1]<t-interval '30 seconds' then 2 else 1 end;
 end if;
 r.seen[me]:=t;
 if r.status='waiting' and r.created_at<t-interval '10 minutes' then r.status:='finished';r.reason:='Bekleme süresi doldu.';end if;
 if r.status in ('active','placing') and r.mode not in ('tower','crossing','detective') and r.started_at<t-interval '15 minutes' then r.status:='finished';r.reason:='Maçın azami süresi doldu.';ending:=true;end if;
 if action='leave' and r.status='active' and r.mode='crossing' and 0=any(r.lives) then
  r.spectator_left[me]:=true;r.lives[me]:=0;
 elsif action='leave' and r.status<>'finished' then r.status:='finished';r.winner:=case when cardinality(r.players)=2 then other else null end;r.reason:='Oyuncu odadan ayrıldı.';end if;
 if r.status='placing' and t>=r.deadline then r.status:='finished';r.reason:=case when r.mode='buzzer' then 'Maskot seçim süresi doldu.' else 'Filo yerleştirme süresi doldu.' end;r.winner:=case when r.ready[1] and not r.ready[2] then 1 when r.ready[2] and not r.ready[1] then 2 else null end;end if;
 if r.status='placing' and r.mode='buzzer' and action='avatar' and value between 0 and 6 and not r.ready[me] then
  r.avatars[me]:=value;r.ready[me]:=true;
  if r.ready[1] and r.ready[2] then
   r.status:='active';r.phase:='question';r.starts_at:=t+interval '1 second';
   r.deadline:=r.starts_at+wordshift_private.buzzer_time(r.deck->0,false);
  end if;
 end if;
 if r.status='active' and r.mode='buzzer' and t>=r.deadline then
  buzzer_expired:=true;
  if r.phase='claimed' then r:=wordshift_private.buzzer_answer(r,false,t);
  elsif r.phase='question' then r.phase:='feedback';r.deadline:=t+interval '2600 milliseconds';
  elsif 0=any(r.lives) then r.status:='finished';r.winner:=case when r.lives[1]=0 then 2 else 1 end;r.reason:='Üç can tükendi.';
  else r.round_no:=r.round_no+1;r.phase:='question';r.answers:='[null,null]';r.event:=null;r.starts_at:=t+interval '800 milliseconds';r.deadline:=r.starts_at+wordshift_private.buzzer_time(r.deck->(r.round_no%jsonb_array_length(r.deck)),false);
  end if;
 end if;
 if r.status='active' and r.mode in ('runner','meteor','sentences') then
  if r.phase='question' and t>=r.deadline then
   for j in 0..1 loop if r.answers->j='null'::jsonb then r.answers:=jsonb_set(r.answers,array[j::text],jsonb_build_object('ok',false,'timeout',true));r.wrong_counts[j+1]:=r.wrong_counts[j+1]+1;if r.mode in ('runner','meteor') then r.lives[j+1]:=greatest(0,r.lives[j+1]-1);end if;end if;end loop;
   r.phase:='feedback';r.deadline:=t+interval '3500 milliseconds';
  elsif r.phase='feedback' and t>=r.deadline then
   r.round_no:=r.round_no+1;
   if r.mode='sentences' and r.round_no>=jsonb_array_length(r.deck) then r.status:='finished';r.reason:='Tüm kelimeler tamamlandı.';ending:=true;
   else r.phase:='question';r.answers:='[null,null]';r.guesses:='[[],[]]';r.starts_at:=t+case when r.mode='runner' then interval '2400 milliseconds' else interval '600 milliseconds' end;r.deadline:=r.starts_at+case when r.mode='detective' then interval '35 seconds' when r.mode='crossing' then interval '20 seconds' when r.mode='sentences' then wordshift_private.sentence_time(r.deck->(r.round_no%jsonb_array_length(r.deck))->>'back') else interval '10 seconds' end;end if;
  end if;
 elsif r.status='active' and r.mode='blocks' and t>=r.deadline then r.status:='finished';r.reason:='Süre doldu.';ending:=true;
 elsif r.status='active' and r.mode='battle' and t>=r.deadline then
  if r.phase='question' then r.wrong_counts[r.turn_no]:=r.wrong_counts[r.turn_no]+1;slow_turn:=true;end if;r.event:=jsonb_build_object('serial',r.round_no,'text',case when r.phase='question' then 'Süre doldu. Doğrusu: '||(r.deck->(r.round_no%jsonb_array_length(r.deck))->>'back')||' · sıra değişti.' else 'Süre doldu; sıra değişti.' end);next_turn:=true;
 end if;
 -- An expired turn is advanced BEFORE accepting any action, so stale packets cannot fire.
 if next_turn then
  r.turn_no:=3-r.turn_no;r.round_no:=r.round_no+1;r.phase:='question';r.answers:='[null,null]';r.starts_at:=t+case when slow_turn then interval '3500 milliseconds' else interval '1 second' end;r.deadline:=r.starts_at+interval '10 seconds';next_turn:=false;slow_turn:=false;
 end if;
 if r.mode='battle' and r.status='placing' and action='fleet' and not r.ready[me] then
  if jsonb_typeof(extra) is distinct from 'array' or jsonb_array_length(extra)<>3 then raise exception 'Üç gemi yerleştirmelisin.';end if;
  for j in 0..2 loop
   ship:=extra->j;n:=3-j;
   if jsonb_typeof(ship) is distinct from 'array' or jsonb_array_length(ship)<>n then raise exception 'Gemiler 3, 2 ve 1 hücre olmalı.';end if;
   select array_agg(v::integer order by v::integer) into groupcells from jsonb_array_elements_text(ship) v;
   for cell in select unnest(groupcells) loop if cell is null or cell<0 or cell>24 or cell=any(allcells) then raise exception 'Gemiler çakışıyor veya tahta dışında.';end if;allcells:=array_append(allcells,cell);end loop;
   if n>1 and not ((groupcells[n]-groupcells[1]=n-1 and groupcells[1]/5=groupcells[n]/5) or (groupcells[n]-groupcells[1]=(n-1)*5 and (n<>3 or groupcells[2]-groupcells[1]=5))) then raise exception 'Gemi düz ve bitişik olmalı.';end if;
  end loop;
  r.fleets:=jsonb_set(r.fleets,array[(me-1)::text],to_jsonb(allcells));r.ready[me]:=true;
  if r.ready[1] and r.ready[2] then r.status:='active';r.starts_at:=t+interval '3 seconds';r.deadline:=r.starts_at+case when r.mode='detective' then interval '35 seconds' when r.mode='crossing' then interval '20 seconds' when r.mode='sentences' then wordshift_private.sentence_time(r.deck->(r.round_no%jsonb_array_length(r.deck))->>'back') else interval '10 seconds' end;end if;
 end if;
 q:=r.deck->(r.round_no%jsonb_array_length(r.deck));
 if r.status='active' and t>=r.starts_at and t<r.deadline and token=r.round_no then
  if r.mode='buzzer' and not buzzer_expired then
   if action='buzz' and r.phase='question' then
    r.turn_no:=me;r.phase:='claimed';r.deadline:=t+wordshift_private.buzzer_time(q,true);
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
    if ok then if r.mode<>'crossing' then r.scores[me]:=r.scores[me]+100;end if;r.correct_counts[me]:=r.correct_counts[me]+1;else r.wrong_counts[me]:=r.wrong_counts[me]+1;if r.mode in ('runner','meteor') then r.lives[me]:=greatest(0,r.lives[me]-1);end if;end if;
    if r.mode='battle' then
     if ok then r.phase:='shoot';r.deadline:=t+interval '10 seconds';else next_turn:=true;slow_turn:=true;end if;
     r.event:=jsonb_build_object('serial',r.round_no,'text',case when ok then 'Doğru cevap! Atış hakkı kazanıldı.' else 'Yanlış cevap. Doğrusu: '||(q->>'back') end);
    elsif r.mode='sentences' then
     -- The first player to finish the sentence takes it; the other one gets no points and we move on.
     if r.answers->(other-1)='null'::jsonb then r.answers:=jsonb_set(r.answers,array[(other-1)::text],jsonb_build_object('ok',false,'lost',true));end if;
     r.phase:='feedback';r.deadline:=t+interval '2500 milliseconds';
    elsif r.mode<>'crossing' and r.answers->0<>'null'::jsonb and r.answers->1<>'null'::jsonb then
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
 if r.status='active' and r.mode in ('tower','crossing','detective') then
  r:=wordshift_private.race_step(r,me,action,token,value,extra,t);
 end if;
 if r.status='active' and r.mode in ('runner','meteor') and r.phase='feedback' and (r.lives[1]=0 or r.lives[2]=0) then r.status:='finished';r.reason:='Üç can tükendi.';r.winner:=case when r.lives[1]=0 and r.lives[2]=0 then null when r.lives[1]=0 then 2 else 1 end;end if;
 if next_turn then r.turn_no:=3-r.turn_no;r.round_no:=r.round_no+1;r.phase:='question';r.answers:='[null,null]';r.starts_at:=t+case when slow_turn then interval '3500 milliseconds' else interval '1600 milliseconds' end;slow_turn:=false;r.deadline:=r.starts_at+case when r.mode='detective' then interval '35 seconds' when r.mode='crossing' then interval '20 seconds' when r.mode='sentences' then wordshift_private.sentence_time(r.deck->(r.round_no%jsonb_array_length(r.deck))->>'back') else interval '10 seconds' end;end if;
 if r.status='active' and r.mode in ('draw','taboo') then
  r:=wordshift_private.studio_step(r,me,action,token,value,extra,t);
 end if;
 if ending then
  r.winner:=case when r.mode in ('runner','meteor') and r.lives[1]>r.lives[2] then 1 when r.mode in ('runner','meteor') and r.lives[2]>r.lives[1] then 2 when r.scores[1]>r.scores[2] then 1 when r.scores[2]>r.scores[1] then 2 when r.mode='blocks' and coalesce(r.finish_times[1],9999999)<coalesce(r.finish_times[2],9999999) then 1 when r.mode='blocks' and coalesce(r.finish_times[2],9999999)<coalesce(r.finish_times[1],9999999) then 2 else null end;
 end if;
 if r.status='finished' and cardinality(r.players)=2 then
  if r.replay_until<t then r.replay_offer:=null;end if;
  if action='leave' or (action='cancel_offer' and ((r.replay_offer->>'by')::int=me or extra is null or extra='null'::jsonb) and (jsonb_typeof(extra)<>'string' or extra#>>'{}'=r.replay_offer->>'id')) then r.replay_offer:=null;end if;
  if action='decline_offer' and (r.replay_offer->>'by')::int=other and extra#>>'{}'=r.replay_offer->>'id' then
   r.replay_notice:=jsonb_build_object('id',r.replay_offer->>'id','by',me,'mode',r.replay_offer->>'mode');r.replay_offer:=null;
  end if;
  if action='offer' and r.replay_next is null then
   if coalesce(extra->>'mode','') not in ('runner','battle','blocks','meteor','sentences','buzzer','tower','crossing','detective','draw','taboo')
    or octet_length(extra::text)>185000 then raise exception 'Geçersiz oyun teklifi.';end if;
   if r.replay_offer is null or (r.replay_offer->>'by')::int=me then
    r.replay_offer:=jsonb_build_object('id',gen_random_uuid(),'by',me,'mode',extra->>'mode','words',extra->'words','title',left(extra->>'title',120));
    r.replay_until:=t+interval '60 seconds';
   end if;
  elsif action='accept_offer' and r.replay_next is null and r.replay_offer is not null
   and (r.replay_offer->>'by')::int=other and (extra#>>'{}'=r.replay_offer->>'mode' or extra#>>'{}'=r.replay_offer->>'id') then
   if r.seen[other]<t-interval '10 seconds' or exists(select 1 from wordshift_private.rooms live where live.id<>r.id and live.players && r.players and live.status in ('waiting','placing','active'))
    then r.replay_offer:=null;
   else
    if r.replay_offer->>'mode'=r.mode and r.mode<>'draw' then
     insert into wordshift_private.rooms(code,mode,level,title,players,names,seen,guests,deck,right_order)
      values(upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)),r.mode,r.level,r.title,array[r.players[other]],array[r.names[other]],array[t],array[r.guests[other],false],
       (select jsonb_agg(v order by random()) from jsonb_array_elements(r.deck) v),r.right_order) returning id into r.replay_next;
    else
     r.replay_next:=wordshift_private.play_lobby(r.players[other],case when r.guests[other] then r.level end,'create',r.replay_offer->>'mode',case when r.mode='draw' and r.replay_offer->>'mode'='draw' then r.deck else r.replay_offer->'words' end,case when r.replay_offer->>'mode'=r.mode then r.title else r.replay_offer->>'title' end,'',case when r.level in ('YDS','YOKDIL') then r.level else '' end);
    end if;
    select code into replay_code from wordshift_private.rooms where id=r.replay_next;
    perform wordshift_private.play_lobby(who,local_level,'join',r.replay_offer->>'mode','[]','',replay_code,'');
    r.replay_offer:=null;
   end if;
  end if;
 end if;
 update wordshift_private.rooms set studio_log=r.studio_log,replay_notice=r.replay_notice,replay_offer=r.replay_offer,replay_until=r.replay_until,replay_next=r.replay_next,spectator_left=r.spectator_left,race_rounds=r.race_rounds,race_starts=r.race_starts,race_ends=r.race_ends,race_feedback=r.race_feedback,race_moves=r.race_moves,guesses=r.guesses,lanes=r.lanes,avatars=r.avatars,lives=r.lives,correct_counts=r.correct_counts,wrong_counts=r.wrong_counts,seen=r.seen,status=r.status,phase=r.phase,starts_at=r.starts_at,deadline=r.deadline,round_no=r.round_no,turn_no=r.turn_no,scores=r.scores,ready=r.ready,answers=r.answers,fleets=r.fleets,shots=r.shots,completed=r.completed,last_attempt=r.last_attempt,finish_times=r.finish_times,event=r.event,winner=r.winner,reason=r.reason where id=r.id;
 -- Build a seat-specific view only after persisting the shared room.
 prev_start:=r.starts_at;
 if r.race_starts is not null then
  r.round_no:=r.race_rounds[me];r.starts_at:=r.race_starts[me];r.deadline:=r.race_ends[me];
  r.phase:=case when r.race_feedback[me] then 'feedback' else 'question' end;
 end if;
 q:=r.deck->(r.round_no%jsonb_array_length(r.deck));
 result:=jsonb_build_object('avatars',r.avatars,'lives',r.lives,'correctCounts',r.correct_counts,'wrongCounts',r.wrong_counts,'id',r.id,'code',r.code,'mode',r.mode,'level',r.level,'title',r.title,'status',r.status,'phase',r.phase,'me',me,'names',r.names,'scores',r.scores,'ready',r.ready,'round',r.round_no,'turn',r.turn_no,'total',jsonb_array_length(r.deck),'startsAt',r.starts_at,'deadline',r.deadline,'serverNow',t,'seen',r.seen,'winner',r.winner,'reason',r.reason,'event',r.event,'answer',r.answers->(me-1),'opponentAnswered',r.answers->(other-1)<>'null'::jsonb,'opponentCorrect',r.answers->(other-1)->'ok');
 if r.mode='blocks' then
  select jsonb_agg(jsonb_build_object('key',i,'text',r.deck->i->>'front') order by i) into mine from generate_series(0,jsonb_array_length(r.deck)-1) i;
  select jsonb_agg(jsonb_build_object('key',i-1,'text',r.deck->r.right_order[i]->>'back') order by i) into theirs from generate_subscripts(r.right_order,1) i;
  result:=result||jsonb_build_object('left',mine,'right',theirs,'completed',r.completed->(me-1),'opponentDone',jsonb_array_length(r.completed->(other-1)),'doneRight',(select coalesce(jsonb_agg(i-1),'[]') from generate_subscripts(r.right_order,1) i where r.completed->(me-1) @> jsonb_build_array(r.right_order[i])));
 elsif r.mode in ('draw','taboo') then
  if action='poll' and token=r.round_no and value between 0 and jsonb_array_length(r.studio_log) then
   result:=result||jsonb_build_object('logFrom',value,'logDelta',(select coalesce(jsonb_agg(v order by ord),'[]'::jsonb) from jsonb_array_elements(r.studio_log) with ordinality entries(v,ord) where ord>value));
  else result:=result||jsonb_build_object('log',r.studio_log);end if;
  if r.phase='feedback' and r.answers->(me-1)->>'ok'='true' then result:=result||jsonb_build_object('question',jsonb_build_object('front',q->>'front'),'correct',q->>'back');end if;
  if r.status='active' and me=r.turn_no then result:=result||jsonb_build_object('secret',q->>'front','banned',q->'banned');end if;
 elsif r.status in ('active','finished') then
  result:=result||jsonb_build_object('question',jsonb_build_object('front',q->>'front','options',case when r.mode='buzzer' and (r.phase<>'claimed' or r.turn_no<>me) then '[]'::jsonb else q->'options' end));
  if r.phase='feedback' or (r.mode<>'buzzer' and r.answers->(me-1)<>'null'::jsonb) then result:=result||jsonb_build_object('correct',q->>'back');end if;
 end if;
 if r.mode='detective' and r.status in ('active','finished') then
  word:=q->>'front';
  select string_agg(case when ch!~'[[:alnum:]]' or r.guesses->(me-1) ? lower(ch) then ch else '_' end,'' order by ord)
   into masked from regexp_split_to_table(word,'') with ordinality chars(ch,ord);
  select count(*) into missed from jsonb_array_elements_text(r.guesses->(me-1)) g where strpos(lower(word),g)=0;
  result:=(result-'correct')||jsonb_build_object('question',jsonb_build_object('front',q->>'back','options','[]'::jsonb),'mask',masked,'letters',r.guesses->(me-1),'missed',missed,
   'extraLetters',(select coalesce(jsonb_agg(distinct lower(ch)),'[]') from regexp_split_to_table(word,'') ch where ch~'[[:alnum:]]' and lower(ch)!~'^[a-z]$'));
  if r.answers->(me-1)<>'null'::jsonb or r.phase='feedback' then result:=result||jsonb_build_object('correct',word);end if;
 end if;
 if r.mode in ('crossing','tower','detective') then
  result:=result||jsonb_build_object('moves',r.race_moves,'trackStart',prev_start,'trafficSeed',r.traffic_seed);
 end if;
 if r.mode='crossing' then result:=result||jsonb_build_object('lanes',r.lanes);end if;
 if r.mode='battle' then
  result:=result||jsonb_build_object('fleet',r.fleets->(me-1),'shots',r.shots->(me-1),'incoming',r.shots->(other-1),'hits',(select coalesce(jsonb_agg(v),'[]') from jsonb_array_elements(r.shots->(me-1)) v where r.fleets->(other-1) @> jsonb_build_array(v)));
 end if;
 if r.status='finished' then result:=result||jsonb_build_object('nextRoom',r.replay_next,'replayNotice',r.replay_notice,'offer',case when r.replay_offer is not null then r.replay_offer-'words'-'title' end);end if;
 return result;
end $$;

drop function if exists public.wordshift_pvp_pools();
create or replace function wordshift_private.play_pools(who uuid, local_level text, pool_level text default '') returns jsonb language plpgsql security definer set search_path='' as $$
declare lvl text;output jsonb;
begin
 if who is null then raise exception 'Giriş yapmalısın.';end if;
 perform wordshift_private.expire_rooms();
 select coalesce(document->>'level','A1') into lvl from public.wordshift_workspaces where user_id=who;lvl:=coalesce(local_level,lvl,'A1');
 if pool_level in ('YDS','YOKDIL') then lvl:=pool_level;end if;
 select jsonb_agg(jsonb_build_object('mode',m,'waiting',
  (select count(*) from wordshift_private.rooms where mode=m and status='waiting' and quick and not who=any(players)),
  'compatible',(select count(*) from wordshift_private.rooms where mode=m and level=lvl and status='waiting' and quick and not who=any(players)),
  'samples',(select count(*) from wordshift_private.rooms where mode=m and level=lvl and quick and started_at>now()-interval '24 hours'),
  'estimateSeconds',(select case when count(*)>=3 then ceil(avg(extract(epoch from(started_at-created_at)))) else null end from wordshift_private.rooms where mode=m and level=lvl and quick and started_at>now()-interval '24 hours')
 ) order by position) into output from unnest(array['runner','battle','blocks','meteor','sentences','buzzer','tower','detective','crossing','draw','taboo']) with ordinality as modes(m,position);
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
revoke all on function public.wordshift_pvp_history(integer) from public,anon;
grant execute on function public.wordshift_pvp_history(integer) to authenticated;

create or replace function wordshift_private.guest_id(secret text) returns uuid language plpgsql immutable set search_path='' as $$
declare hash text;
begin
 if secret is null or length(secret)<>72 or secret !~ '^([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}){2}$' then raise exception 'Misafir oturumu geçersiz.';end if;
 hash:=encode(sha256(convert_to('wordshift-pvp:'||secret,'UTF8')),'hex');
 return overlay(substr(hash,1,32) placing '8' from 13 for 1)::uuid;
end $$;
revoke all on function wordshift_private.guest_id(text) from public,anon,authenticated;
revoke all on function wordshift_private.play_lobby(uuid,text,text,text,jsonb,text,text,text) from public,anon,authenticated;
create or replace function public.wordshift_pvp_lobby(action text, game_mode text default 'meteor', words jsonb default '[]', set_title text default '', room_code text default '', pool_level text default '') returns uuid
language sql security definer set search_path='' as $$select wordshift_private.play_lobby(auth.uid(),null,action,game_mode,words,set_title,room_code,pool_level)$$;
revoke all on function public.wordshift_pvp_lobby(text,text,jsonb,text,text,text) from public,anon;
grant execute on function public.wordshift_pvp_lobby(text,text,jsonb,text,text,text) to authenticated;
create or replace function public.wordshift_guest_lobby(guest_key text, guest_level text, action text, game_mode text default 'meteor', words jsonb default '[]', set_title text default '', room_code text default '', pool_level text default '') returns uuid
language sql security definer set search_path='' as $$select wordshift_private.play_lobby(wordshift_private.guest_id(guest_key),case when guest_level in ('A1','A2','B1','B2','C1','C2') then guest_level else 'A1' end,action,game_mode,words,set_title,room_code,pool_level)$$;
revoke all on function public.wordshift_guest_lobby(text,text,text,text,jsonb,text,text,text) from public;
grant execute on function public.wordshift_guest_lobby(text,text,text,text,jsonb,text,text,text) to anon,authenticated;

revoke all on function wordshift_private.play_room(uuid,text,uuid,text,integer,integer,jsonb) from public,anon,authenticated;
create or replace function public.wordshift_pvp_room(room_id uuid, action text default 'poll', token integer default 0, value integer default -1, extra jsonb default 'null') returns jsonb
language sql security definer set search_path='' as $$select wordshift_private.play_room(auth.uid(),null,room_id,action,token,value,extra)$$;
revoke all on function public.wordshift_pvp_room(uuid,text,integer,integer,jsonb) from public,anon;
grant execute on function public.wordshift_pvp_room(uuid,text,integer,integer,jsonb) to authenticated;
create or replace function public.wordshift_guest_room(guest_key text, guest_level text, room_id uuid, action text default 'poll', token integer default 0, value integer default -1, extra jsonb default 'null') returns jsonb
language sql security definer set search_path='' as $$select wordshift_private.play_room(wordshift_private.guest_id(guest_key),case when guest_level in ('A1','A2','B1','B2','C1','C2') then guest_level else 'A1' end,room_id,action,token,value,extra)$$;
revoke all on function public.wordshift_guest_room(text,text,uuid,text,integer,integer,jsonb) from public;
grant execute on function public.wordshift_guest_room(text,text,uuid,text,integer,integer,jsonb) to anon,authenticated;

revoke all on function wordshift_private.play_pools(uuid,text,text) from public,anon,authenticated;
create or replace function public.wordshift_pvp_pools(pool_level text default '') returns jsonb
language sql security definer set search_path='' as $$select wordshift_private.play_pools(auth.uid(),null,pool_level)$$;
revoke all on function public.wordshift_pvp_pools(text) from public,anon;
grant execute on function public.wordshift_pvp_pools(text) to authenticated;
create or replace function public.wordshift_guest_pools(guest_key text, guest_level text, pool_level text default '') returns jsonb
language sql security definer set search_path='' as $$select wordshift_private.play_pools(wordshift_private.guest_id(guest_key),case when guest_level in ('A1','A2','B1','B2','C1','C2') then guest_level else 'A1' end,pool_level)$$;
revoke all on function public.wordshift_guest_pools(text,text,text) from public;
grant execute on function public.wordshift_guest_pools(text,text,text) to anon,authenticated;

create table if not exists wordshift_private.room_invites (
 room_id uuid not null references wordshift_private.rooms(id) on delete cascade,
 recipient uuid not null references auth.users(id) on delete cascade,
 status text not null default 'pending',created_at timestamptz not null default now(),
 primary key(room_id,recipient)
);
create index if not exists room_invite_inbox on wordshift_private.room_invites(recipient,created_at desc) where status='pending';
alter table wordshift_private.room_invites enable row level security;
revoke all on wordshift_private.room_invites from public,anon,authenticated;

create or replace function public.wordshift_room_invites(action text, room_key uuid default null, peer uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare who uuid:=auth.uid(); r wordshift_private.rooms; pending_id uuid; result jsonb;
begin
 if who is null then raise exception 'Oturum açmalısın.';end if;
 if action='inbox' then
  select coalesce(jsonb_agg(data order by created_at desc),'[]') into result from (
   select jsonb_build_object('room',g.id,'name',g.names[1],'mode',g.mode) data,i.created_at
   from wordshift_private.room_invites i join wordshift_private.rooms g on g.id=i.room_id
   where i.recipient=who and i.status='pending' and g.status='waiting' and g.created_at>now()-interval '10 minutes'
    and g.seen[1]>now()-interval '30 seconds'
    and exists(select 1 from public.wordshift_follows f where (f.follower_id=g.players[1] and f.followee_id=who) or (f.followee_id=g.players[1] and f.follower_id=who))
   order by i.created_at desc limit 25) recent;
  return result;
 end if;
 if action='accept' then perform pg_advisory_xact_lock(763091);end if;
 select * into r from wordshift_private.rooms where id=room_key for update;
 if not found then raise exception 'Oda artık açık değil.';end if;
 if action='send' then
  if r.status<>'waiting' or r.players[1]<>who or r.guests[1] or peer=who or r.created_at<now()-interval '10 minutes' then raise exception 'Bu odadan davet gönderilemiyor.';end if;
  if not exists(select 1 from public.wordshift_follows f where (f.follower_id=who and f.followee_id=peer) or (f.followee_id=who and f.follower_id=peer))
   then raise exception 'Takip listenden bir kişi seç.';end if;
  insert into wordshift_private.room_invites(room_id,recipient) values(room_key,peer) on conflict do nothing;
  return (select to_jsonb(i.status) from wordshift_private.room_invites i where i.room_id=room_key and i.recipient=peer);
 end if;
 if not exists(select 1 from wordshift_private.room_invites i where i.room_id=room_key and i.recipient=who and i.status='pending') then raise exception 'Davet artık geçerli değil.';end if;
 if action='decline' then update wordshift_private.room_invites set status='declined' where room_id=room_key and recipient=who;return 'true'::jsonb;end if;
 if action<>'accept' then raise exception 'Geçersiz davet işlemi.';end if;
 if r.status<>'waiting' or not exists(select 1 from public.wordshift_follows f where (f.follower_id=r.players[1] and f.followee_id=who) or (f.followee_id=r.players[1] and f.follower_id=who))
 then raise exception 'Davet artık geçerli değil.';end if;
 pending_id:=wordshift_private.play_lobby(who,null,'resume');
 if pending_id is not null and pending_id<>room_key then raise exception 'Önce mevcut oyun odandan ayrıl.';end if;
 if wordshift_private.play_lobby(who,null,'join',r.mode,'[]','',r.code) is distinct from room_key then raise exception 'Oda artık açık değil.';end if;
 update wordshift_private.room_invites set status='accepted' where room_id=room_key and recipient=who;
 return to_jsonb(room_key);
end $$;
revoke all on function public.wordshift_room_invites(text,uuid,uuid) from public,anon;
grant execute on function public.wordshift_room_invites(text,uuid,uuid) to authenticated;

notify pgrst, 'reload schema';
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

-- Her iki RPC'yi ziyaretçi olarak gerçekten çağır. Hata olursa kurulum geri alınır.
set local role anon;
do $verify$
declare target uuid;
begin
 select user_id into target from public.wordshift_leaderboard('global','',0) limit 1;
 perform * from public.wordshift_user_profile(target);
 perform * from public.wordshift_follow_list(target,'followers',0);
end $verify$;
reset role;
notify pgrst, 'reload schema';
commit;
select 'Misafir profil ve liderlik erişimi doğrulandı. Dokuz çevrimiçi oyun hazır.' as sonuc;
