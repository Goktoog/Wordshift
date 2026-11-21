import {Window} from 'happy-dom';
import {readFileSync,existsSync} from 'node:fs';
import assert from 'node:assert/strict';
import {starterSets} from '../frontend/src/data/starter-sets.js';
const win=new Window({url:'https://goktoog.github.io/Wordshift/',settings:{disableJavaScriptEvaluation:true,disableCSSFileLoading:true,disableJavaScriptFileLoading:true}});
Object.assign(globalThis,{window:win,document:win.document,history:win.history,localStorage:win.localStorage,confirm:()=>true,alert:()=>{}});
document.write(readFileSync(new URL('../frontend/index.html',import.meta.url),'utf8').replace(/<script[^>]*>[\s\S]*?<\/script>/g,''));
const state=await import('../frontend/src/core/state.js');
const {go,initNavigation}=await import('../frontend/src/core/router.js');
const {begin,record,returnToSet,matchesAnswer,opts}=await import('../frontend/src/features/session.js');
const {study}=await import('../frontend/src/features/study.js');
const {reviewItems}=await import('../frontend/src/features/progress.js');
const {questionMedia}=await import('../frontend/src/features/starters.js');
assert.deepEqual(starterSets.map(s=>s.name),['A1','A2','B1','B2','C1','YDS','YÖKDİL']);
let words=0,questions=0;
for(const s of starterSets){
 assert.ok(s.publicSource&&s.starterSource);assert.equal(new Set(s.items.map(x=>x.id)).size,s.items.length);
 for(const type of ['word','blank','translate','paragraph','mc'])assert.ok(s.items.some(x=>x.type===type),s.name+' '+type);
 for(const x of s.items){
  assert.ok(x.front.trim()&&x.back.trim()&&x.source);assert.ok(!x.options.includes(x.back));assert.equal(new Set(x.options).size,x.options.length);
  if(x.type==='word')words++;else{questions++;assert.ok(x.options.length>=3)}
  for(const key of ['questionImage','passageImage'])if(x[key])assert.ok(existsSync(new URL('../frontend/'+x[key].replace(/^\.\//,''),import.meta.url)),x[key]);
 }
}
const yds=starterSets.find(s=>s.name==='YDS'),exam=yds.items.filter(x=>x.sourceQuestion);
assert.equal(exam.length,80);assert.deepEqual(exam.map(x=>x.questionNumber),Array.from({length:80},(_,i)=>i+1));
// Independently transcribed from the four columns of the supplied PDF answer-key page.
const keys=('C A B D C A C B C C B D E D B B B E A D '+
'B D B E B A B B A C B A A D B D C A B D '+
'B B E C D A E E D E C D E D C E C B E D '+
'E A E C C B C B B D B E C D C B D C C D').split(' ');
assert.deepEqual(exam.map(x=>x.back),keys);
for(const q of exam){assert.deepEqual(opts(q),['A','B','C','D','E']);if(q.questionNumber>=17&&q.questionNumber<=26||q.questionNumber>=43&&q.questionNumber<=62)assert.ok(q.passageImage)}
assert.equal(questionMedia({questionImage:'https://example.com/untrusted.png'}),'');
const me={id:'guest-test',name:'Misafir',guest:true,sets:[],folders:[],stats:{total:0,correct:0},xp:0,level:'A1'};state.setUser(me);state.db.users.push(me);initNavigation();go('home');
assert.equal(document.querySelectorAll('[data-starter]').length,7);go('sets');assert.equal(document.querySelectorAll('[data-starter]').length,7);assert.equal(me.sets.length,0);
go('starter',yds.id);assert.equal(state.current(),yds);assert.equal(document.querySelector('#itemAdd'),null);assert.equal(document.querySelector('#publishSet'),null);assert.equal(document.querySelector('#authorSets'),null);
const snapshot=JSON.stringify(yds);const content=document.querySelector('#studyContent');content.value='source-exam';content.onchange();assert.equal(document.querySelector('#studyLimit').value,'0');document.querySelector('[data-action="test"]').click();
assert.equal(state.session.pool.length,80);assert.equal(state.session.pool[0].questionNumber,1);assert.equal(document.querySelectorAll('#answers [data-answer]').length,5);assert.equal(document.querySelector('#typed'),null);assert.ok(document.querySelector('#question img'));
const correct=[...document.querySelectorAll('[data-answer]')].find(b=>b.textContent===keys[0]);correct.click();assert.equal(state.session.score,1);assert.equal(me.stats.correct,1);assert.equal(JSON.stringify(yds),snapshot);
state.session.i=16;study();assert.equal(document.querySelectorAll('#question img').length,2);document.querySelector('#skip').click();assert.equal(reviewItems(me,yds).length,1);assert.equal(reviewItems({...me,studyProgress:{}},yds).length,0);
returnToSet();assert.equal(state.page,'starter');assert.equal(state.current(),yds);
for(const type of ['word','blank','paragraph','translate','questions']){begin('test',yds,'normal',false,{content:type,limit:20});assert.ok(state.session.pool.length<=20);assert.ok(state.session.pool.every(x=>type==='questions'?x.type!=='word':x.type===type));returnToSet()}
for(const game of ['runner','battle','match','blocks','meteor']){begin(game,yds,'normal',false,{limit:20});assert.ok(state.session.pool.every(x=>x.type==='word'));assert.equal(state.current(),yds);returnToSet()}
assert.equal(matchesAnswer('yürürlüğü sağlama',{type:'word',back:'uygulama, yürürlüğü sağlama'},true),true);assert.equal(matchesAnswer('sağlama',{type:'word',back:'uygulama, yürürlüğü sağlama'},true),false);
// Explicit copy is independent; merely studying never inserts it into the library.
assert.equal(me.sets.length,0);document.querySelector('#copySet').click();assert.equal(me.sets.length,1);assert.ok(!me.sets[0].publicSource);assert.notEqual(me.sets[0].items[0].id,yds.items[0].id);assert.equal(JSON.stringify(yds),snapshot);
clearInterval(state.timer);await win.happyDOM.abort();console.log(`PASS starters: ${words} word entries, ${questions} questions; 80 source answers checked, all assets exist, 7 visible sets, source passages/choices, personal isolation, filtering/limits, 5 games, return route and independent copy.`);
