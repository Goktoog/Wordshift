import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {Window} from 'happy-dom';
import {guessHint} from '../frontend/src/games/guess-hint.js';
import {drawingWords} from '../frontend/src/games/drawing-words.js';
const win=new Window({url:'http://localhost'});
Object.assign(globalThis,{window:win,document:win.document,localStorage:win.localStorage,history:win.history});
const {logAnswer,placementResult,levelProgress,initializeMastery}=await import('../frontend/src/features/level.js');
const {starterSets}=await import('../frontend/src/data/starter-sets.js');
const {progressKey}=await import('../frontend/src/features/progress.js');
const bank=level=>starterSets.find(s=>s.id==='starter-'+level.toLowerCase());
const words=level=>[...new Map(bank(level).items.filter(x=>x.type==='word').map(x=>[x.front.trim().toLowerCase(),x])).values()];
const first=new Date(2026,10,26),second=new Date(2026,10,27),third=new Date(2026,10,28);
const student={level:'A1'},a1=words('A1'),p=levelProgress(student,first);
assert.equal(p.total,852);assert.equal(p.required,639);
for(const word of a1.slice(0,p.required)){
 logAnswer(student,word,true,'card',first);logAnswer(student,word,true,'card',first);
}
assert.equal(levelProgress(student).learned,0);
for(const word of a1.slice(0,p.required-1))logAnswer(student,word,true,'card',second);
assert.equal(levelProgress(student).learned,638);assert.equal(student.level,'A1');
logAnswer(student,a1[0],false,'card',second);assert.equal(levelProgress(student).learned,637);
logAnswer(student,a1[0],true,'card',second);
logAnswer(student,a1[p.required-1],true,'card',second);assert.equal(student.level,'A1');
const promoted=logAnswer(student,{...a1[0],id:'personal-copy'},true,'card',third);
assert.deepEqual(promoted,{from:'A1',to:'A2'});assert.equal(levelProgress(student).learned,0);
const legacyWord=bank('A1').items.find(x=>x.type==='word');
const legacy={level:'A1',studyProgress:{[progressKey(bank('A1'))]:{[legacyWord.id]:{correct:6,needsReview:false}}}};
assert.ok(initializeMastery(legacy,first));assert.equal(levelProgress(legacy).learned,0);
const restored=JSON.parse(JSON.stringify(legacy));assert.equal(initializeMastery(restored,second),false);
logAnswer(restored,legacyWord,true,'card',second);assert.equal(levelProgress(restored).learned,1);
const upper={level:'B2'},b2=words('B2').slice(0,levelProgress(upper).required);
for(const date of [first,second])for(const word of b2)logAnswer(upper,word,true,'card',date);
assert.equal(upper.level,'B2');for(const word of b2.slice(0,6))logAnswer(upper,word,true,'checked',third);
assert.equal(upper.level,'C1');
assert.equal(placementResult({A1:Array(6).fill(true),A2:[true,true,true,true,false,false]}),'A1');
assert.equal(drawingWords([{type:'word',front:'back'},{type:'word',front:'train'}]).length,1);
assert.ok(!drawingWords([]).some(w=>w.front==='back'));
assert.ok(drawingWords([]).some(w=>w.front==='deodorant'));
const db=new PGlite(),read=f=>readFileSync(new URL(f,import.meta.url),'utf8');
await db.exec(read('./community-sql.mjs').split('await db.exec(`')[1].split('`);')[0]);
for(const name of ['setup','community','social','Wordshift-Guncelleme','Wordshift-Guncelleme'])await db.exec(read('../supabase/'+name+'.sql'));
const a=crypto.randomUUID(),b=crypto.randomUUID(),c=crypto.randomUUID();
for(const [id,name] of [[a,'Deniz'],[b,'Ece'],[c,'Ada']]){
 await db.query('insert into auth.users values($1)',[id]);
 await db.query('insert into public.wordshift_workspaces(user_id,document) values($1,$2)',[id,{name,level:'A1',sets:[],folders:[]}]);
}
async function as(id){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id||'']);await db.exec('set role '+(id?'authenticated':'anon'))}
const one=async(sql,args)=>(await db.query(sql,args)).rows[0].v;
const invite=(act,id=null,peer=null)=>one('select public.wordshift_room_invites($1,$2,$3) v',[act,id,peer]);
const room=(id,action='poll',extra=null)=>one('select public.wordshift_pvp_room($1,$2,0,-1,$3) v',[id,action,JSON.stringify(extra)]);
const create=()=>one("select public.wordshift_pvp_lobby('create','draw',$1) v",[JSON.stringify([{front:'train',back:'tren'},{front:'back',back:'geri'}])]);
await as(null);await assert.rejects(()=>invite('inbox'));
await as(b);await db.query('select public.wordshift_follow($1)',[a]);
await as(a);const id=await create();assert.equal(await invite('send',id,b),'pending');
await assert.rejects(()=>invite('send',id,c));
await as(c);assert.equal((await invite('inbox')).length,0);await assert.rejects(()=>invite('accept',id));
await as(b);assert.equal((await invite('inbox'))[0].name,'Deniz');await invite('decline',id);assert.deepEqual(await invite('inbox'),[]);
await as(a);assert.equal(await invite('send',id,b),'declined');await room(id,'leave');
const current=await create();await invite('send',current,b);await as(b);assert.equal(await invite('accept',current),current);
assert.equal((await room(current)).status,'active');assert.equal((await room(current)).secret,undefined);
await as(a);assert.equal((await room(current)).secret,'train');await room(current,'leave');
const offer=(await room(current,'offer',{mode:'draw',words:[],title:'Çiz'})).offer;
await as(b);await room(current,'decline_offer',offer.id);
const counter=(await room(current,'offer',{mode:'sentences',words:[],title:'Cümleler'})).offer;
await as(a);const state=await room(current);
assert.equal(state.replayNotice.id,offer.id);assert.equal(state.replayNotice.by,2);assert.equal(state.offer.id,counter.id);
assert.equal((await room(current,'accept_offer',offer.id)).nextRoom,null);
const next=(await room(current,'accept_offer',counter.id)).nextRoom;assert.ok(next);assert.equal((await room(next)).mode,'sentences');
await db.exec('reset role');
for(const [guess,target,match] of [['rain','train',/close/],['trian','train',/close/],['ice','ice cream',/First word.*1 more word/],['a big','a big tree',/First 2 words.*1 more word/],['box','train',/Try again/]]){
 const hint=await one('select wordshift_private.guess_hint($1,$2) v',[guess,target]);assert.match(hint,match);assert.equal(hint,guessHint(guess,target));
}
// Exercise the actual result panel from the initial button through decline and a counteroffer.
const {mountRematch}=await import('../frontend/src/games/rematch.js');
const stage=document.createElement('section');document.body.append(stage);
let last=null;const base={id:'old-room',mode:'draw',me:1,names:['Deniz','Ece'],winner:1,scores:[100,50]};
const panel=mountRematch(stage,base,{send:async(...args)=>{last=args;return {}},words:()=>[],title:'Set',history(){},newMatch(){},wrongWords:'',gallows:''});
stage.querySelector('#replay').click();assert.equal(stage.querySelector('[data-picker]').hidden,false);
assert.equal(stage.querySelectorAll('[data-replay-mode]').length,11);
stage.querySelector('[data-replay-mode="battle"]').click();assert.equal(last[0],'offer');assert.equal(last[2].mode,'battle');
panel.update({...base,offer:{by:1,id:'1',mode:'battle'}});assert.equal(stage.querySelector('#withdrawOffer').hidden,false);
panel.update({...base,offer:{by:2,id:'2',mode:'draw'},replayNotice:{by:2,id:'1',mode:'battle'}});
assert.match(stage.querySelector('[data-replay-notice]').textContent,/Ece.*reddetti/);assert.match(stage.querySelector('#offerNote').textContent,/Ece.*Çiz ve Bil/);
stage.querySelector('#declineOffer').click();assert.deepEqual(last,['decline_offer',-1,'2']);
await db.close();await win.happyDOM.abort();
console.log('PASS promotion, placement, concrete drawing deck, near-guess parity, cumulative migration twice, code-free invite, decline, counteroffer and new room.');
