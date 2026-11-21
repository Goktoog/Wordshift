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
await db.close();console.log('PASS PvP SQL: auth/room isolation, matchmaking/counts, three-life survival/deadlines/draw, five game modes, sentence validation, hidden fleets/turns/win, duplicate/stale actions, disconnect outcomes, immutable private history/retention.');
