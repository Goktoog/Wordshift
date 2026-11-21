import { starterSets } from './starters.js';
import { $, escape, shuffle, levels } from '../core/utils.js';
import { user, timer, session, save, allWords, current, setSetId, setSession, setPage, setSharedSet } from '../core/state.js';
import { modal } from '../ui/modal.js';
import { header } from '../ui/header.js';
import { toast, sound } from '../ui/feedback.js';
import { go, render } from '../core/router.js';
import { newSet } from './sets.js';
import { updateProgress, reviewItems, itemProgress } from './progress.js';
import { computeLevel, isMastered, logMastery } from './level.js';
export const gameModes=['runner','battle','match','blocks','meteor'];
export function chooseSet(m){
 modal('<h2>Çalışma setini seç</h2><select name="set">'+[...user.sets,...starterSets].map(s=>'<option value="'+escape(s.id)+'">'+escape(s.name)+(s.starterSource?' · Başlangıç':'')+'</option>').join('')+'</select>'+(['runner','battle'].includes(m)?'<label>Zorluk</label><select name="difficulty"><option value="easy">Kolay</option><option value="normal" selected>Normal</option><option value="hard">Zor</option></select>':''),d=>begin(m,[...user.sets,...starterSets].find(s=>s.id===d.get('set')),d.get('difficulty')||'normal',false,{limit:20}));
}
export function record(x,ok,withSound=true){
 const set=current();if(!set)return;
 const wasMastered=isMastered(itemProgress(user,set,x));
 updateProgress(user,set,x,ok);
 if(!wasMastered&&isMastered(itemProgress(user,set,x)))logMastery(user);
 user.stats.total++;user.stats.correct+=ok?1:0;if(ok)user.xp+=10;
 user.level=computeLevel(user);
 save();header();if(withSound)sound(ok);
}
export function skipItem(x){updateProgress(user,current(),x,null);session.skipped++;save()}
export function returnToSet(){const s=current();go(s?.starterSource?'starter':s?.publicSource?'shared':'detail',s?.starterSource?s.id:s?.publicSource?{owner:s.ownerId,id:s.id}:s?.id)}
export function begin(m,set,difficulty='normal',onlyReview=false,settings={}){
 if(!set)return;
 let source=onlyReview?reviewItems(user,set):set.items;
 const filter=settings.content||'all';
 if(filter==='questions')source=source.filter(x=>x.type!=='word');
 else if(filter==='source-exam')source=source.filter(x=>x.sourceQuestion);
 else if(filter!=='all')source=source.filter(x=>x.type===filter);
 const suitable=['test','exam','learn'].includes(m)?source:source.filter(x=>x.type==='word');
 const ordered=filter==='source-exam'?suitable.slice().sort((a,b)=>a.questionNumber-b.questionNumber):shuffle(suitable);
 const limit=Number(settings.limit)||0, pool=limit?ordered.slice(0,limit):ordered;
 if(!pool.length){toast(onlyReview?'Tekrar edilecek uygun içerik yok.':'Bu içerik seçimiyle bu modda çalışılacak öğe yok. Kelimeler veya Tüm içerikler seçimini dene.');return}
 clearInterval(timer);setSharedSet(set.publicSource?set:null);setSetId(set.id);
 // Keep browser Back pointing to the actual source set.
 history.pushState({page:set.starterSource?'starter':set.publicSource?'shared':'detail',arg:set.starterSource?set.id:set.publicSource?{owner:set.ownerId,id:set.id}:set.id},'');
 setSession({m,pool,i:0,score:0,skipped:0,flip:false,difficulty,deadline:Date.now()+(filter==='source-exam'?10800000:1800000),reviewOnly:onlyReview,settings});
 setPage(gameModes.includes(m)?'play':'study');
 if(m==='match'||m==='blocks'){session.pool=pool.slice(0,8);session.cards=shuffle(session.pool.flatMap(x=>[{x,side:'a'},{x,side:'b'}]));session.done=[];session.pick=null}
 if(m==='runner')Object.assign(session,{distance:0,lives:3,gate:null,action:'jump'});
 if(m==='battle')Object.assign(session,{enemy:[],mine:[],shots:[],botShots:[],phase:'question',message:''});
 render();
}
export function opts(x){if(x.sourceQuestion)return ['A','B','C','D','E'];const options=x.options?.length?x.options:shuffle(session.pool.filter(w=>w.type==='word'&&w.id!==x.id)).slice(0,3).map(w=>w.back);return shuffle([...new Set([x.back,...options])])}
export function answerMarkup(x,typed=false){const options=opts(x);if(!x.sourceQuestion&&((typed&&x.type==='word')||(x.type==='blank'&&!x.options?.length)||options.length<2))return '<form id="answerForm"><input id="typed" required autocomplete="off" placeholder="Cevabını yaz"><button class="primary">Kontrol et</button></form>';return '<div class="choices">'+options.map((o,i)=>'<button data-answer="'+i+'">'+escape(o)+'</button>').join('')+'</div>'}
export function bindAnswer(x,callback){$('view').querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>callback(b.textContent,b));if($('answerForm'))$('answerForm').onsubmit=e=>{e.preventDefault();callback($('typed').value)}}
export const equal=(a,b)=>a.trim().toLocaleLowerCase('tr')===b.trim().toLocaleLowerCase('tr');
export function topStudy(title){return '<div class="top"><div><p class="eyebrow">'+escape(current()?.name)+'</p><h1>'+title+'</h1></div><button id="exit">Sete dön</button></div>'}
export function exitBind(){$('exit').onclick=returnToSet}
export function finish(){
 clearInterval(timer);const s=session,set=current(),remaining=reviewItems(user,set);
 $('view').innerHTML=topStudy('Tamamlandı!')+`<div class="hero"><span class="ico">🏆</span><h1>${s.score} doğru</h1><p class="muted">${s.pool.length} içerik · ${s.skipped||0} boş · ${user.xp} toplam XP</p><div class="actions"><button class="primary" id="again">Tekrar başla</button>${remaining.length?`<button id="reviewAgain">Bilmediklerim / boşlar (${remaining.length})</button>`:''}</div></div>`;
 exitBind();$('again').onclick=()=>begin(s.m,set,s.difficulty,false,s.settings);
 if($('reviewAgain'))$('reviewAgain').onclick=()=>begin('learn',set,s.difficulty,true);
}

export function matchesAnswer(value,item,typed=false){if(equal(value,item.back))return true;return typed&&item.type==='word'&&item.back.split(/[,;]/).some(s=>equal(value,s));}
