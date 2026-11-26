import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;create table public.wordshift_workspaces(user_id uuid primary key,document jsonb);`);
const migration=readFileSync(new URL('../supabase/pvp.sql',import.meta.url),'utf8');await db.exec(migration);await db.exec(migration);
const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222',c='33333333-3333-4333-8333-333333333333';
for(const [id,name,level] of [[a,'Ahmet','B1'],[b,'Selen','B1'],[c,'Ece','A2']]){await db.query('insert into auth.users values($1)',[id]);await db.query('insert into public.wordshift_workspaces values($1,$2)',[id,{name,level}])}
async function as(id,role='authenticated'){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id||'']);await db.exec('set role '+role)}
const words=[['garden','bahçe'],['flower','çiçek'],['tree','ağaç'],['house','ev'],['road','yol'],['school','okul'],['water','su'],['apple','elma']].map(([front,back])=>({front,back,secret:'private'}));
const lobby=async(action,mode='meteor',code='',list=words)=>(await db.query('select public.wordshift_pvp_lobby($1,$2,$3,$4,$5) r',[action,mode,JSON.stringify(list),'Test seti',code])).rows[0].r;
const rpc=async(id,action='poll',token=0,value=-1,extra=null)=>(await db.query('select public.wordshift_pvp_room($1,$2,$3,$4,$5) r',[id,action,token,value,JSON.stringify(extra)])).rows[0].r;
async function admin(sql,args=[]){await db.exec('reset role');return db.query(sql,args)}
async function startClock(id){await admin("update wordshift_private.rooms set starts_at=now()-interval '1 second',deadline=now()+interval '10 seconds' where id=$1",[id])}
async function make(mode){await as(a);const id=await lobby('create',mode),first=await rpc(id);await as(b);assert.equal(await lobby('join',mode,first.code),id);await startClock(id);await as(a);return [id,await rpc(id)]}
await as(null,'anon');await assert.rejects(()=>lobby('create'));await assert.rejects(()=>rpc(a));
await as(a);await assert.rejects(()=>db.query('select * from wordshift_private.rooms'));await assert.rejects(()=>lobby('create','meteor','',words.slice(0,3)));
await assert.rejects(()=>lobby('create','meteor','',[...words.slice(0,3),words[0]]));
// Exact-level quick matching; changing mode cannot create a second active room.
const queue=await lobby('quick','runner');assert.equal(await lobby('quick','blocks'),queue);
await as(c);const otherQueue=await lobby('quick','runner');assert.notEqual(otherQueue,queue);await rpc(otherQueue,'leave');
await as(b);assert.equal(await lobby('quick','runner'),queue);let s=await rpc(queue);assert.equal(s.status,'active');assert.equal(s.me,2);assert.equal(s.question.back,undefined);assert.equal(s.deck,undefined);
await as(c);await assert.rejects(()=>rpc(queue));await assert.rejects(()=>lobby('join','runner',s.code));
await as(a);await rpc(queue,'leave');
// Synchronized rounds, no early/stale/duplicate score, server-controlled expiry.
const [id]=await make('meteor');
await admin("update wordshift_private.rooms set starts_at=now()+interval '1 minute',deadline=now()+interval '2 minutes' where id=$1",[id]);await as(a);s=await rpc(id);let expected=words.find(w=>w.front===s.question.front).back,choice=s.question.options.indexOf(expected);
s=await rpc(id,'answer',s.round,choice);assert.equal(s.scores[0],0);
await startClock(id);await as(a);s=await rpc(id,'answer',0,choice);assert.equal(s.scores[0],100);assert.equal(s.correct,expected);
s=await rpc(id,'answer',0,choice);assert.equal(s.scores[0],100);
await as(b);s=await rpc(id);assert.equal(s.answer,null);assert.equal(s.correct,undefined);assert.equal(s.opponentAnswered,true);
s=await rpc(id,'answer',0,-1);assert.equal(s.phase,'feedback');assert.equal(s.scores[1],0);
await admin("update wordshift_private.rooms set deadline=now()-interval '1 second' where id=$1",[id]);await as(a);s=await rpc(id,'answer',0,choice);assert.equal(s.round,1);assert.equal(s.scores[0],100);
await admin("update wordshift_private.rooms set starts_at=now()-interval '12 seconds',deadline=now()-interval '1 second' where id=$1",[id]);await as(a);s=await rpc(id,'answer',1,0);assert.equal(s.answer.timeout,true);assert.equal(s.scores[0],100);await rpc(id,'leave');
// Blocks: only matching index pairs score, duplicate pairs idempotent, no answer mapping exposed.
const [blocks]=await make('blocks');await as(a);s=await rpc(blocks);assert.equal(s.right_order,undefined);let pair=s.left[0],translation=words.find(w=>w.front===pair.text).back,right=s.right.find(r=>r.text===translation).key;
s=await rpc(blocks,'pair',0,pair.key,right);assert.equal(s.scores[0],100);assert.deepEqual(s.completed,[pair.key]);
await admin("update wordshift_private.rooms set last_attempt=array[null::timestamptz,null::timestamptz] where id=$1",[blocks]);await as(a);s=await rpc(blocks,'pair',0,pair.key,right);assert.equal(s.scores[0],100);assert.equal(s.completed.length,1);
await admin("update wordshift_private.rooms set deadline=now()-interval '1 second' where id=$1",[blocks]);await as(b);s=await rpc(blocks);assert.equal(s.status,'finished');assert.equal(s.winner,1);
// Fleet shape checks, hidden enemy cells, exact turn and shot permission.
const [battle]=await make('battle');await as(a);
await assert.rejects(()=>rpc(battle,'fleet',0,-1,[[0,1,6],[10,11],[20]]));
await assert.rejects(()=>rpc(battle,'fleet',0,-1,[[0,1,2],[2,3],[20]]));
s=await rpc(battle,'fleet',0,-1,[[0,1,2],[10,15],[24]]);assert.equal(s.status,'placing');assert.equal(s.ready[0],true);assert.equal(s.fleets,undefined);assert.equal(s.enemy,undefined);
await as(b);s=await rpc(battle,'fleet',0,-1,[[5,6,7],[12,17],[23]]);assert.equal(s.status,'active');assert.deepEqual(s.fleet,[5,6,7,12,17,23]);
await startClock(battle);await as(a);s=await rpc(battle,'shot',0,5);assert.equal(s.shots.length,0); // no free shot
await as(b);s=await rpc(battle,'answer',0,0);assert.equal(s.answer,null); // not your turn
await as(a);s=await rpc(battle);choice=s.question.options.indexOf(words.find(w=>w.front===s.question.front).back);s=await rpc(battle,'answer',s.round,choice);assert.equal(s.phase,'shoot');
s=await rpc(battle,'shot',0,5);assert.equal(s.turn,2);assert.deepEqual(s.hits,[5]);assert.equal(s.event.hit,true);let round=s.round;
s=await rpc(battle,'shot',0,6);assert.deepEqual(s.shots,[5]);assert.equal(s.round,round);
await admin("update wordshift_private.rooms set deadline=now()-interval '1 second' where id=$1",[battle]);await as(b);s=await rpc(battle,'answer',round,0);assert.equal(s.turn,1);assert.equal(s.round,round+1);await rpc(battle,'leave');
// Disconnect forfeits, resume and stale-room expiry.
const [disconnect]=await make('runner');await admin("update wordshift_private.rooms set seen[2]=now()-interval '91 seconds' where id=$1",[disconnect]);await as(a);s=await rpc(disconnect);assert.equal(s.winner,1);assert.equal(s.status,'finished');assert.equal(await lobby('resume'),null);

// Survival: both players share rounds; three wrong answers eliminate, duplicate requests don't consume extra lives.
for (const mode of ['runner','meteor']) {
 const [survival]=await make(mode);
 for(let roundNo=0;roundNo<3;roundNo++){
  await startClock(survival);await as(a);let roundState=await rpc(survival);const correct=roundState.question.options.indexOf(words.find(w=>w.front===roundState.question.front).back);
  roundState=await rpc(survival,'answer',roundNo,-1);assert.equal(roundState.lives[0],2-roundNo);
  roundState=await rpc(survival,'answer',roundNo,-1);assert.equal(roundState.lives[0],2-roundNo);
  await as(b);roundState=await rpc(survival,'answer',roundNo,correct);
  if(roundNo<2){assert.equal(roundState.status,'active');await admin("update wordshift_private.rooms set deadline=now()-interval '1 second' where id=$1",[survival]);await as(a);await rpc(survival)}
  else{assert.equal(roundState.status,'finished');assert.equal(roundState.winner,2);assert.deepEqual(roundState.lives,[0,3]);assert.deepEqual(roundState.wrongCounts,[3,0]);}
 }
 await as(a);let history=(await db.query('select public.wordshift_pvp_history(0) r')).rows[0].r;const entry=history.find(h=>h.id===survival);assert.ok(entry);assert.equal(entry.me,1);assert.equal(entry.winner,2);assert.deepEqual(entry.scores,[0,300]);assert.equal(entry.deck,undefined);
 await rpc(survival);history=(await db.query('select public.wordshift_pvp_history(0) r')).rows[0].r;assert.equal(history.filter(h=>h.id===survival).length,1);
 await as(c);history=(await db.query('select public.wordshift_pvp_history(0) r')).rows[0].r;assert.ok(!history.some(h=>h.id===survival));
}
// Simultaneous life exhaustion is a draw; a missed deadline costs exactly one life each.
const [timed]=await make('meteor');await admin("update wordshift_private.rooms set lives=array[1,1],deadline=now()-interval '1 second' where id=$1",[timed]);await as(a);s=await rpc(timed);assert.equal(s.status,'finished');assert.equal(s.winner,null);assert.deepEqual(s.lives,[0,0]);s=await rpc(timed);assert.deepEqual(s.lives,[0,0]);
// Sentence ordering is checked on the server, including repeated word tokens.
const [sent]=await make('sentences');await as(a);s=await rpc(sent);assert.equal(s.mode,'sentences');assert.equal(s.total,6);
const sentenceBank=(await admin('select front,back from wordshift_private.sentences')).rows;
const sentence=sentenceBank.find(w=>w.front===s.question.front).back,available=[...s.question.options],order=sentence.split(' ').map(word=>{const i=available.indexOf(word);available[i]=null;return i});
await as(a);s=await rpc(sent,'sentence',0,-1,order);assert.equal(s.answer.ok,true);assert.equal(s.scores[0],100);s=await rpc(sent,'sentence',0,-1,order);assert.equal(s.scores[0],100);
await as(b);s=await rpc(sent,'sentence',0,-1,order.map(()=>0));assert.equal(s.answer.ok,false);await rpc(sent,'leave');
// Pools: counts exclude caller and stale rooms, compatibility honors level, no invented estimates.
await as(a);const newQueue=await lobby('quick','meteor');let pool=(await db.query('select public.wordshift_pvp_pools() r')).rows[0].r.pools.find(x=>x.mode==='meteor');assert.equal(pool.waiting,0);
await as(b);pool=(await db.query('select public.wordshift_pvp_pools() r')).rows[0].r.pools.find(x=>x.mode==='meteor');assert.equal(pool.waiting,1);assert.equal(pool.compatible,1);assert.equal(pool.estimateSeconds,null);
await as(c);pool=(await db.query('select public.wordshift_pvp_pools() r')).rows[0].r.pools.find(x=>x.mode==='meteor');assert.equal(pool.waiting,1);assert.equal(pool.compatible,0);
await admin("update wordshift_private.rooms set seen[1]=now()-interval '31 seconds' where id=$1",[newQueue]);await as(b);pool=(await db.query('select public.wordshift_pvp_pools() r')).rows[0].r.pools.find(x=>x.mode==='meteor');assert.equal(pool.waiting,0);
// Battleship: all six occupied cells must be hit, winning shot writes one persistent result.
const [winBattle]=await make('battle');await as(a);await rpc(winBattle,'fleet',0,-1,[[0,1,2],[10,15],[24]]);await as(b);await rpc(winBattle,'fleet',0,-1,[[5,6,7],[12,17],[23]]);
for(const target of [5,6,7,12,17,23]){
 await startClock(winBattle);await as(a);s=await rpc(winBattle);const answer=s.question.options.indexOf(words.find(w=>w.front===s.question.front).back);s=await rpc(winBattle,'answer',s.round,answer);s=await rpc(winBattle,'shot',s.round,target);
 if(target!==23){await startClock(winBattle);await as(b);s=await rpc(winBattle,'answer',s.round,-1)}
}
assert.equal(s.status,'finished');assert.equal(s.winner,1);await as(a);const finishedBattle=(await db.query('select public.wordshift_pvp_history(0) r')).rows[0].r.find(x=>x.id===winBattle);assert.equal(finishedBattle.hits[0].length,6);
// Historic results survive room garbage collection and cannot be edited by a member.
await assert.rejects(()=>db.exec("delete from wordshift_private.match_history"));await admin("delete from wordshift_private.rooms where id=$1",[winBattle]);await as(a);assert.ok((await db.query('select public.wordshift_pvp_history(0) r')).rows[0].r.some(x=>x.id===winBattle));
await as(null,'anon');await assert.rejects(()=>db.query('select public.wordshift_pvp_pools()'));await assert.rejects(()=>db.query('select public.wordshift_pvp_history(0)'));
// First buzz wins under the room lock, wrong answers transfer the same prompt, and three hits end the match.
const prompts=[{front:'I have lived here ____ 2020.',back:'since',options:['since','for','until']}];
await as(a);const duel=await lobby('create','buzzer','',prompts);
s=await rpc(duel,'avatar',0,6);assert.equal(s.avatars[0],6);
await as(b);await lobby('join','buzzer',s.code);await startClock(duel);
const expire=async()=>{await admin("update wordshift_private.rooms set deadline=now()-interval '1 second' where id=$1",[duel]);await as(a);return rpc(duel)};
await as(b);s=await rpc(duel,'buzz',0);assert.equal(s.turn,2);
await as(a);s=await rpc(duel,'buzz',0);assert.equal(s.turn,2);assert.deepEqual(s.question.options,[]);
s=await rpc(duel,'answer',0,0);assert.equal(s.answer,null);
await as(b);s=await rpc(duel);s=await rpc(duel,'answer',0,s.question.options.indexOf('for'));assert.equal(s.turn,1);assert.equal(s.correct,undefined);
await as(a);s=await rpc(duel);s=await rpc(duel,'answer',0,s.question.options.indexOf('until'));assert.equal(s.phase,'feedback');assert.deepEqual(s.lives,[3,3]);
s=await expire();assert.equal(s.round,1);
for(let i=1;i<=3;i++){
 await startClock(duel);await as(b);await rpc(duel,'buzz',i);
 s=await expire();assert.equal(s.turn,1);assert.equal(s.phase,'claimed');
 const right=s.question.options.indexOf('since');assert.ok(right>=0);
 s=await rpc(duel,'answer',i,right);assert.equal(s.event.by,1);assert.deepEqual(s.lives,[3,3-i]);
 s=await rpc(duel,'answer',i,right);assert.deepEqual(s.lives,[3,3-i]);
 s=await expire();
}
assert.equal(s.status,'finished');assert.equal(s.winner,1);
const log=(await db.query('select public.wordshift_pvp_history(0) r')).rows[0].r.find(x=>x.id===duel);
assert.deepEqual(log.lives,[3,0]);assert.equal(log.winner,1);
// Guest keys identify only temporary room seats. Public player names and XP stay separate.
const keys=Array.from({length:3},()=>crypto.randomUUID()+crypto.randomUUID());
const guestLobby=async(key,action,mode,code='')=>(await db.query('select public.wordshift_guest_lobby($1,$2,$3,$4,$5,$6,$7) r',[key,'B1',action,mode,JSON.stringify(words),'Guest test',code])).rows[0].r;
const guestRoom=async(key,id,action='poll',token=0,value=-1,extra=null)=>(await db.query('select public.wordshift_guest_room($1,$2,$3,$4,$5,$6,$7) r',[key,'B1',id,action,token,value,JSON.stringify(extra)])).rows[0].r;
await as(null,'anon');
await assert.rejects(()=>guestLobby('invalid','create','tower'));
const guestPools=(await db.query("select public.wordshift_guest_pools($1,'B1') r",[keys[0]])).rows[0].r;
const {gameModes}=await import('../frontend/src/games/catalog.js');
assert.deepEqual(guestPools.pools.map(p=>p.mode).sort(),[...gameModes].sort());
for(const mode of gameModes){
 const id=await guestLobby(keys[0],'create',mode);
 const waiting=await guestRoom(keys[0],id);
 assert.equal(await guestLobby(keys[1],'join',mode,waiting.code),id);
 assert.equal(await guestLobby(keys[0],'resume',mode),id);
 await assert.rejects(()=>guestRoom(keys[2],id));
 await startClock(id);await as(null,'anon');
 let s=await guestRoom(keys[1],id);
 assert.deepEqual(s.names,['Misafir','Misafir']);assert.equal(s.me,2);
 if(mode==='tower'||mode==='crossing'){
  const choice=s.question.options.indexOf(words.find(w=>w.front===s.question.front).back);
  s=await guestRoom(keys[1],id,'answer',0,choice);assert.ok(s.answer.ok);
  if(mode==='tower')assert.equal(s.scores[1],100);
  else{
   assert.equal(s.scores[1],0);
   // At 0.1 seconds lane 0 is clear, near 2.05 seconds the car crosses the path.
   await admin("update wordshift_private.rooms set starts_at=now()-interval '0.1 seconds' where id=$1",[id]);await as(null,'anon');
   s=await guestRoom(keys[1],id,'hop');assert.equal(s.answer.collision,false);assert.equal(s.scores[1],100);
   assert.equal((await guestRoom(keys[1],id,'hop')).scores[1],100);
   s=await guestRoom(keys[0],id,'answer',0,choice);
   await admin("update wordshift_private.rooms set starts_at=now()-interval '2.05 seconds' where id=$1",[id]);await as(null,'anon');
   s=await guestRoom(keys[0],id,'hop');assert.equal(s.answer.collision,true);assert.deepEqual(s.lanes,[0,1]);assert.equal(s.phase,'feedback');
  }
 }else if(mode==='detective'){
  const word=words.find(w=>w.back===s.question.front).front;
  assert.equal(s.correct,undefined);assert.deepEqual(s.question.options,[]);assert.match(s.mask,/^_+$/);
  for(const ch of new Set(word))s=await guestRoom(keys[1],id,'letter',0,-1,ch);
  assert.equal(s.scores[1],100);assert.equal(s.correct,word);
  s=await guestRoom(keys[0],id);assert.deepEqual(s.letters,[]);assert.equal(s.correct,undefined);
  for(const ch of 'zqjxv')s=await guestRoom(keys[0],id,'letter',0,-1,ch);
  assert.equal(s.missed,5);assert.equal(s.answer.ok,false);assert.equal(s.phase,'feedback');
 }
 await guestRoom(keys[0],id,'leave');assert.equal((await guestRoom(keys[1],id)).status,'finished');
 assert.equal((await admin('select count(*) n from wordshift_private.match_history where id=$1',[id])).rows[0].n,0);await as(null,'anon');
}
const mixedId=await guestLobby(keys[0],'quick','tower');
await as(a);assert.equal(await lobby('quick','tower'),mixedId);await rpc(mixedId,'leave');
const mixedHistory=(await db.query('select public.wordshift_pvp_history(0) r')).rows[0].r.find(x=>x.id===mixedId);
assert.deepEqual(mixedHistory.players,[null,a]);assert.equal(mixedHistory.names[0],'Misafir');
assert.equal((await admin('select count(*) n from public.wordshift_workspaces')).rows[0].n,3);

// One guest completes the whole race while the other stays on the first question.
const {safeToGo}=await import('../frontend/src/games/crossing-traffic.js');
for(const mode of ['tower','detective','crossing']){
 await as(null,'anon');
 const room=await guestLobby(keys[0],'create',mode);
 const lobbyState=await guestRoom(keys[0],room);
 await guestLobby(keys[1],'join',mode,lobbyState.code);
 await startClock(room);await as(null,'anon');
 const stationary=await guestRoom(keys[0],room);
 for(let turn=0;turn<3;turn++){
  let racing=await guestRoom(keys[1],room);
  assert.equal(racing.round,turn);assert.equal(racing.goal,3);
  if(mode==='detective'){
   const solution=words.find(w=>w.back===racing.question.front).front;
   for(const letter of new Set(solution))racing=await guestRoom(keys[1],room,'letter',turn,-1,letter);
  }else{
   const solution=words.find(w=>w.front===racing.question.front).back;
   const button=racing.question.options.indexOf(solution);
   racing=await guestRoom(keys[1],room,'answer',turn,button);
   if(mode==='crossing'){
    let elapsed=.1;
    while(!safeToGo(turn,elapsed,20)||!safeToGo(turn,elapsed+.15,20))elapsed+=.1;
    await admin("update wordshift_private.rooms set starts_at=now()-$2::float8*interval '1 second' where id=$1",[room,elapsed]);
    await as(null,'anon');racing=await guestRoom(keys[1],room,'hop',turn);
   }
   assert.ok(racing.moves[1][mode==='crossing'?'hopAt':'jumpAt']);
  }
  assert.equal(racing.scores[1],100*(turn+1));
  if(turn===2){assert.equal(racing.status,'finished');assert.equal(racing.winner,2);break}
  const still=await guestRoom(keys[0],room);
  assert.equal(still.round,0);assert.deepEqual(still.question,stationary.question);
  assert.deepEqual(still.lives,[3,3]);
  await admin("update wordshift_private.rooms set race_ends[2]=now()-interval '1 second' where id=$1",[room]);
  await as(null,'anon');const replay=await guestRoom(keys[1],room,'answer',turn,0);
  assert.equal(replay.round,turn+1);assert.equal(replay.answer,null);assert.deepEqual(replay.scores,racing.scores);
 }
}
const [lifeRoom,firstLife]=await make('tower');let life=firstLife;
for(let turn=0;turn<3;turn++){
 const solution=words.find(w=>w.front===life.question.front).back;
 life=await rpc(lifeRoom,'answer',turn,life.question.options.findIndex(x=>x!==solution));
 assert.equal(life.lives[0],2-turn);
 if(turn<2){
  await admin("update wordshift_private.rooms set race_ends[1]=now()-interval '1 second' where id=$1",[lifeRoom]);
  await as(a);life=await rpc(lifeRoom);
 }
}
assert.equal(life.status,'finished');assert.equal(life.winner,2);
const {buzzerSeconds}=await import('../frontend/src/games/buzzer-deck.js');
for(const type of ['word','blank','translate','paragraph','mc']){
 for(const options of [[],['a long proposed answer','another proposed answer']]){
  for(const front of ['garden', 'long prompt '.repeat(15).trim(), 'length cap '.repeat(150).trim()]){
   const q={front,back:'a long written response',options,type};
   for(const answering of [false,true]){
    const result=await admin('select extract(epoch from wordshift_private.buzzer_time($1::jsonb,$2))::int as sec',[JSON.stringify(q),answering]);
    assert.equal(result.rows[0].sec,buzzerSeconds(q,options,answering));
   }
  }
 }
}
assert.equal(buzzerSeconds({front:'garden',back:'bahçe',type:'word'},[]),10);
assert.ok(buzzerSeconds({front:'long prompt '.repeat(15),back:'answer',type:'paragraph'},[])>35);
await db.close();console.log('PASS PvP SQL: auth/room isolation, matchmaking/counts, three-life survival/deadlines/draw, nine game modes, guest seats, hidden letters, timed traffic and local-only guest history, buzzer ownership/steals/lives, sentence validation, hidden fleets/turns/win, duplicate/stale actions, disconnect outcomes, immutable private history/retention.');
