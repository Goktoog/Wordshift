import {registerHooks} from 'node:module';
import assert from 'node:assert/strict';
const A2=Array.from({length:20},(_,i)=>({id:'a2-'+i,type:'word',level:'A2',front:'word'+i,back:'kelime'+i}));
const A1=A2.map((x,i)=>({...x,level:'A1',id:'a1-'+i,front:'base'+i}));
const sets=JSON.stringify([{id:'starter-a1',items:A1},{id:'starter-a2',items:A2}]);
globalThis.fake={user:{guest:false,xp:0,level:'A1',sets:[],stats:{total:0,correct:0}},saves:0,toasts:[]};
const stub=(suffix,src)=>({suffix,src});
const stubs=[stub('/core/state.js','export const user=globalThis.fake.user;export const save=()=>{globalThis.fake.saves++};'),
 stub('/ui/header.js','export const header=()=>{};'),
 stub('/ui/feedback.js','export const toast=m=>globalThis.fake.toasts.push(m);'),
 stub('/features/starters.js','export const starterSets='+sets+';'),
 stub('/data/starter-sets.js','export const starterSets='+sets+';')];
registerHooks({load(url,ctx,next){const s=stubs.find(x=>url.endsWith(x.suffix));return s?{format:'module',shortCircuit:true,source:s.src}:next(url,ctx)}});
const {creditOnline,wrongWordsMarkup,findItem}=await import('../frontend/src/features/pvp-credit.js');
const {computeLevel,logAnswer}=await import('../frontend/src/features/level.js');
const u=globalThis.fake.user;
// Doğru cevap: XP + istatistik; kayıtlı içerik bulunur.
assert.equal(findItem('word3','kelime3').id,'a2-3');
assert.equal(creditOnline({room:'r1',round:0,kind:'a',front:'word3',back:'kelime3',ok:true}),true);
assert.equal(u.xp,10);assert.equal(u.stats.total,1);assert.equal(u.stats.correct,1);
// Aynı cevap iki kez sayılmaz (yeniden bağlanma).
assert.equal(creditOnline({room:'r1',round:0,kind:'a',front:'word3',back:'kelime3',ok:true}),false);assert.equal(u.xp,10);
// Yanlış cevap: listeye ve maç kaydına eklenir, XP artmaz.
creditOnline({room:'r1',round:1,kind:'a',front:'word4',back:'',ok:false});
assert.equal(u.xp,10);assert.equal(u.stats.total,2);
assert.ok(u.mistakes['i:a2-4']);assert.deepEqual(u.pvpMistakes.r1,[{front:'word4',back:'kelime4'}]);
assert.match(wrongWordsMarkup('r1'),/word4/);assert.equal(wrongWordsMarkup('yok'),'');
// Bilinmeyen (yerel setlerde olmayan) kelime: XP verilir, back biliniyorsa listeye girer, seviye kanıtı yazılmaz.
creditOnline({room:'r1',round:2,kind:'a',front:'unknownword',back:'bilinmeyen',ok:false});
assert.ok(Object.keys(u.mistakes).some(k=>k.startsWith('t:unknownword')));
// An online answer can supply the later recall of each distinct starter word.
const yesterday=new Date();yesterday.setDate(yesterday.getDate()-1);
for(const w of A1)logAnswer(u,w,true,'card',yesterday);
for(const [round,w] of A1.slice(0,15).entries())creditOnline({room:'r2',round,kind:'a',front:w.front,back:w.back,ok:true});
assert.equal(computeLevel(u),'A2');assert.equal(u.level,'A2');assert.ok(u.toasts===undefined);
assert.ok(globalThis.fake.toasts.some(t=>/A1 → A2/.test(t)));
assert.ok(u.pvpSeen.length<=80);
// Misafir XP yalnızca yerel kaydetme yoluna gider.
u.guest=true;const xp=u.xp;assert.equal(creditOnline({room:'r3',round:0,kind:'a',front:'a',back:'b',ok:true}),true);assert.equal(u.xp,xp+10);
console.log('PASS: online XP, dedupe, wrong-word list, per-match log, level-up via evidence, guest guard.');
