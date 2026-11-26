import {fileURLToPath} from 'node:url';
import {Window} from 'happy-dom';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('..',import.meta.url)).replace(/[\\/]$/,'');
const window=new Window({url:'http://localhost:3000/',settings:{disableJavaScriptEvaluation:true,disableCSSFileLoading:true,disableJavaScriptFileLoading:true}});
for(const [key,value] of Object.entries({window,document:window.document,history:window.history,localStorage:window.localStorage,confirm:()=>true,alert:()=>{}}))globalThis[key]=value;
document.write(readFileSync(root+'/frontend/index.html','utf8').replace(/<script[^>]*>[\s\S]*?<\/script>/g,''));
const state=await import(new URL('../frontend/src/core/state.js',import.meta.url));
const {go,initNavigation}=await import(new URL('../frontend/src/core/router.js',import.meta.url));
const {detail}=await import(new URL('../frontend/src/features/sets.js',import.meta.url));
const {begin,record}=await import(new URL('../frontend/src/features/session.js',import.meta.url));
const {reviewItems,progressKey}=await import(new URL('../frontend/src/features/progress.js',import.meta.url));
const word=(id)=>({id,type:'word',front:id,back:'TR '+id,options:[],level:'B1',extra:'example'});
const own={id:'own',name:'Personal YDS',items:[word('one'),word('two')]};
const user={id:'me',name:'Ben',guest:false,sets:[own,{id:'other',name:'Other set',items:[]}],folders:[],stats:{total:0,correct:0},xp:0,level:'A1'};
state.setUser(user);state.db.users.push(user);initNavigation();
go('home');
const panel=document.querySelector('#view').textContent;
assert.ok(panel.indexOf('Toplam XP')<panel.indexOf('Bugün nasıl çalışalım?') && panel.indexOf('Bugün nasıl çalışalım?')<panel.indexOf('Senin çalışma setlerin'));
go('sets');assert.equal(document.querySelector('#view h1').textContent,'Benim çalışma setlerim');assert.equal(document.querySelector('[data-folder]'),null);assert.ok(document.querySelector('[data-page="sets"]').classList.contains('active'));assert.equal(document.querySelectorAll('[data-set]').length,2);assert.equal(document.querySelector('[data-filter]'),null);assert.equal(document.querySelector('#discoverQuery').placeholder,'Çalışacak setler mi arıyorsun?');
go('games');const games=[...document.querySelectorAll('[data-action]')].map(b=>b.dataset.action);
assert.ok(games.includes('sentences')&&games.includes('crossing')&&games.includes('tower'));
const assertModes=()=>assert.deepEqual([...document.querySelectorAll('[data-action]')].map(b=>b.dataset.action),['cards','learn','test','exam',...games]);
go('detail','own');assertModes();
document.querySelector('[data-action="sentences"]').click();
assert.ok(state.session.pool.length&&state.session.pool.every(x=>x.level==='B1'&&x.back.includes(' ')));
document.querySelector('#exit').click();assert.equal(state.current(),own);
const originalFrame=window.requestAnimationFrame;
let frame,clock=0;
window.requestAnimationFrame=callback=>{frame=callback;return 1};
const tick=()=>{clock+=1000/60;const callback=frame;frame=null;callback?.(clock)};
const waitFrames=predicate=>{for(let i=0;i<750&&!predicate();i++)tick();assert.ok(predicate())};
document.querySelector('[data-action="crossing"]').click();tick();
for (const correct of [false,true]) {
 const item=state.session.pool[state.session.i];
 const button=[...document.querySelectorAll('[data-answer]')].find(b=>(b.textContent===item.back)===correct);
 button.click();button.click();assert.equal(state.session.score,0);assert.equal(state.session.lives,2);
 if(correct){
  const goButton=document.querySelector('#crossingGo'),signal=document.querySelector('#crossingSignal');
  waitFrames(()=>signal.dataset.safe==='false');goButton.click();
  waitFrames(()=>document.querySelector('#crossingFeedback').textContent.includes('çarptın'));
  assert.equal(state.session.lives,1);
  waitFrames(()=>!goButton.hidden&&signal.dataset.safe==='true');goButton.click();
  waitFrames(()=>!document.querySelector('#crossingNext').hidden);
  assert.match(document.querySelector('#crossingProgress').textContent,/Şerit 1\/3 · Çarpışma 1/);
  assert.equal(state.session.score,1);
 }
 document.querySelector('#crossingNext').click();
}
assert.ok(document.querySelector('#again'));document.querySelector('#exit').click();
assert.equal(state.current(),own);window.requestAnimationFrame=originalFrame;
document.querySelector('[data-action="detective"]').click();
for(const solved of [false,true]){
 const word=state.session.pool[state.session.i].front;
 const keys=[...document.querySelectorAll('[data-letter]')];
 const guesses=keys.filter(b=>solved===word.includes(b.dataset.letter));
 for(const b of (solved?guesses:guesses.slice(0,5)))b.click();
 assert.equal(document.querySelector('#detectiveWord').textContent,word);
 assert.equal(state.session.score,solved?1:0);document.querySelector('#detectiveNext').click();
}
assert.ok(document.querySelector('#again'));document.querySelector('#exit').click();
document.querySelector('[data-action="tower"]').click();
for (const correct of [true,false]) {
 const item=state.session.pool[state.session.i];
 const button=[...document.querySelectorAll('#towerAnswers [data-answer]')].find(b=>(b.textContent===item.back)===correct);
 button.click();button.click();assert.equal(state.session.score,1);
 assert.ok(button.classList.contains(correct?'landed':'cracked'));
 document.querySelector('#towerNext').click();
}
assert.ok(document.querySelector('#again'));document.querySelector('#exit').click();
begin('cards',own);const first=state.session.pool[0];document.querySelector('#flip').click();assert.ok(document.querySelector('#flip').classList.contains('is-flipped'));document.querySelector('#hard').click();assert.ok(document.querySelector('#swipeCard').classList.contains('swipe-left'));await new Promise(r=>setTimeout(r,370));assert.ok(reviewItems(user,own).some(x=>x.id===first.id));document.querySelector('#know').click();assert.ok(document.querySelector('#swipeCard').classList.contains('swipe-right'));await new Promise(r=>setTimeout(r,370));assert.ok(document.querySelector('#reviewAgain'));
begin('learn',own,'normal',true);const before=user.stats.total;document.querySelector('#skip').click();assert.equal(user.stats.total,before);assert.equal(state.session.skipped,1);assert.ok(reviewItems(user,own).length>0);
const shared={id:'shared',ownerId:'ahmet',authorName:'Ahmet',name:'Ahmet B1',publicSource:true,items:[word('a'),word('b'),word('c')]};
state.setSharedSet(shared);state.setSetId(shared.id);state.setPage('shared');detail();assert.equal(document.querySelector('#itemAdd'),null);assert.equal(document.querySelector('[data-edit]'),null);assertModes();
const snapshot=JSON.stringify(shared.items),libraryCount=user.sets.length;
for(const mode of ['runner','battle','blocks','meteor']){
 begin(mode,shared);assert.equal(state.current(),shared);assert.ok(state.session.pool.every(x=>shared.items.includes(x)));go('sets');
}
begin('cards',shared);record(state.session.pool[0],false);assert.equal(JSON.stringify(shared.items),snapshot);assert.equal(user.sets.length,libraryCount);assert.equal(reviewItems(user,shared).length,1);assert.equal(reviewItems({...user,studyProgress:{}},shared).length,0);assert.equal(reviewItems(user,{...shared,ownerId:'selen'}).length,0);
go('detail','own');assert.equal(state.current(),own);assert.equal(state.sharedSet,null);
// Card delay cannot navigate back into a session after exit.
begin('cards',own);document.querySelector('#hard').click();go('sets');await new Promise(r=>setTimeout(r,370));assert.equal(state.page,'sets');
// Own profile cards link back to their set.
go('profile');document.querySelector('[data-profile-set="own"]').click();assert.equal(state.page,'detail');assert.equal(state.current().id,'own');
clearInterval(state.timer);await window.happyDOM.abort();
console.log('PASS DOM: folderless library, discovery placeholder, shared solo game catalog, physical flip and both swipe classes, saved review, skip without wrong answer, four games from shared source, private progress/source immutability, navigation guards, profile set links.');
