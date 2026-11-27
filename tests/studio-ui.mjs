import {Window} from 'happy-dom';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {starterSets} from '../frontend/src/data/starter-sets.js';
import {forbiddenWords,normalizeGuess,violation} from '../frontend/src/games/taboo-cards.js';
import {paint,width,height} from '../frontend/src/games/sketchpad.js';

let entries=0;
for(const s of starterSets)for(const item of s.items.filter(x=>x.type==='word')){
 const banned=forbiddenWords(item);
 assert.equal(new Set(banned).size,4);assert.ok(banned.every(Boolean));assert.ok(!banned.includes(normalizeGuess(item.front)));entries++;
}
assert.equal(violation('The RAIN!','umbrella',['rain','wet','cover','handle']),'rain');
assert.equal(violation('a train','umbrella',['rain','wet','cover','handle']),null);
assert.deepEqual(forbiddenWords({front:'x',banned:['one','two','three','four']}),['one','two','three','four']);
const pixels=new Uint8Array(width*height);
paint(pixels,{tool:'rect',color:1,size:1,points:[[4,4],[14,14]]});
paint(pixels,{tool:'fill',color:2,size:1,points:[[8,8]]});assert.equal(pixels[width*8+8],2);assert.equal(pixels[0],0);assert.equal(pixels[width*4+4],1);
for(const tool of ['triangle','ellipse','line','pen']){
 const board=new Uint8Array(width*height);paint(board,{tool,color:3,size:6,points:[[5,8],[38,48]]});assert.ok(board.filter(p=>p===3).length>20);
}
const win=new Window({url:'http://localhost',settings:{disableJavaScriptEvaluation:true,disableCSSFileLoading:true,disableJavaScriptFileLoading:true}});
Object.assign(globalThis,{window:win,document:win.document,history:win.history,localStorage:win.localStorage,FormData:win.FormData,confirm:()=>true});
document.write(readFileSync(new URL('../frontend/index.html',import.meta.url),'utf8').replace(/<script[^>]*>[\s\S]*?<\/script>/g,''));
const {setUser}=await import('../frontend/src/core/state.js'),{initModal}=await import('../frontend/src/ui/modal.js');
const {go,initNavigation}=await import('../frontend/src/core/router.js'),{editGoal,dailyInfo}=await import('../frontend/src/features/goals.js');
const {begin}=await import('../frontend/src/features/session.js');
const u={id:'u',guest:true,name:'Misafir',sets:[],level:'B1',xp:0,stats:{total:0,correct:0}},$=id=>document.getElementById(id);
localStorage.setItem('wordshift-guest-v1',JSON.stringify({...u,matchKey:'local'}));setUser(u);initNavigation();initModal();go('home');editGoal(()=>go('home'));
document.querySelector('[name=goal][value=yokdil]').checked=true;await $('modalForm').onsubmit({preventDefault(){},target:$('modalForm')});
assert.equal(u.learningGoal,'yokdil');assert.match(document.querySelector('.goal-card').textContent,/YÖKDİL/);
assert.equal(JSON.parse(localStorage.getItem('wordshift-guest-v1')).learningGoal,'yokdil');
go('profile');$('editGoal').click();document.querySelector('[name=goal][value=work]').checked=true;
await $('modalForm').onsubmit({preventDefault(){},target:$('modalForm')});assert.equal(u.learningGoal,'work');
const day=new Date(2026,10,27);assert.deepEqual(dailyInfo('yds','B1',day),dailyInfo('yds','B1',day));assert.notDeepEqual(dailyInfo('yds','B1',day).word,dailyInfo('yds','B1',new Date(2026,10,28)).word);
assert.notDeepEqual(dailyInfo('yds','A1',day).tip,dailyInfo('yds','C1',day).tip);
const set=starterSets[0];begin('taboo',set);$('passPlay').click();$('revealSecret').click();
const bad=document.querySelector('.ban-list span').textContent;const clue=$('writeClue');clue.querySelector('input').value=bad;clue.onsubmit({preventDefault(){},target:clue});assert.match($('view').textContent,/−25/);
begin('draw',set);$('passPlay').click();$('revealSecret').click();
const c=$('soloPad').querySelector('canvas');
c.getBoundingClientRect=()=>({left:12,top:20,width:320,height:200});c.setPointerCapture=()=>{};
const e=(x,y)=>({pointerId:2,button:0,pointerType:'touch',clientX:x,clientY:y});
c.onpointerdown(e(20,30));c.onpointermove(e(100,90));await c.onpointerup(e(110,100));assert.equal($('handoff').disabled,false);
$('handoff').click();$('showClue').click();assert.ok($('wordGuess'));assert.equal(document.querySelector('.studio-secret'),null);
await win.happyDOM.abort();console.log('PASS studio: '+entries+' four-ban cards, whole words, drawing tools and bounded fill, pointer input, pass-and-play, goal persistence, daily rotation and level.');
