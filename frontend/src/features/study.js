import { questionMedia } from './starters.js';
import { $, escape } from '../core/utils.js';
import { session, timer, setTimer, page, user } from '../core/state.js';
import { noteMistake } from './mistakes.js';
import { record, skipItem, finish, topStudy, exitBind, answerMarkup, bindAnswer, matchesAnswer } from './session.js';
import { typeNames } from './sets.js';

export function study(){
 const s=session;if(s.i>=s.pool.length){finish();return}
 const x=s.pool[s.i],mode=s.m;
 clearInterval(timer);
 $('view').innerHTML=topStudy(({cards:'Kartlar',learn:'Öğrenme',test:'Test',exam:'Deneme'}[mode]))+
 `<div class="top muted"><span>${s.i+1} / ${s.pool.length}${s.reviewOnly?' · Tekrar kümesi':''}</span><span id="clock">Doğru: ${s.score} · Boş: ${s.skipped}</span></div><div class="progress"><i style="width:${s.i/s.pool.length*100}%"></i></div><div class="card" id="question"></div>`;
 exitBind();const q=$('question');let locked=false;
 const alive=()=>page==='study'&&session===s&&$('question')===q;
 if(mode==='exam'){
  const tick=()=>{if(!alive()){clearInterval(interval);return}const n=Math.max(0,Math.ceil((s.deadline-Date.now())/1000));$('clock').textContent=Math.floor(n/60)+':'+String(n%60).padStart(2,'0');if(!n){for(const item of s.pool.slice(s.i))skipItem(item);finish()}};
  const interval=setInterval(tick,500);setTimer(interval);tick();if(!alive())return;
 }
 function next(){if(!alive())return;s.i++;s.flip=false;study()}
 if(mode==='cards'){
  q.innerHTML=`<p class="muted">Karta dokun ve çevir · ${escape(x.level)} · Sol: bilmiyorum / Sağ: biliyorum</p>
  <div class="flash-stage" id="swipeCard"><button id="flip" class="flip-card" aria-label="Kartı çevir" aria-pressed="false"><span class="flip-inner"><span class="flip-face flip-front"><small>İNGİLİZCE</small>${escape(x.front)}</span><span class="flip-face flip-back" aria-hidden="true"><small>TÜRKÇE</small>${escape(x.back)}<small>${escape(x.extra)}</small></span></span></button></div>
  <div class="actions"><button id="hard">← Bilmiyorum</button><button class="primary" id="know">Biliyorum →</button></div>`;
  const flip=$('flip'),card=$('swipeCard');let dragged=false;
  flip.onclick=()=>{if(locked||dragged){dragged=false;return}s.flip=!s.flip;flip.classList.toggle('is-flipped',s.flip);flip.setAttribute('aria-pressed',String(s.flip));flip.querySelector('.flip-front').setAttribute('aria-hidden',String(s.flip));flip.querySelector('.flip-back').setAttribute('aria-hidden',String(!s.flip))};
  function grade(ok){if(locked||!alive())return;locked=true;record(x,ok);if(ok)s.score++;$('hard').disabled=$('know').disabled=true;card.classList.add(ok?'swipe-right':'swipe-left');setTimeout(next,340)}
  $('hard').onclick=()=>grade(false);$('know').onclick=()=>grade(true);
  let startX=null,startY=0;
  flip.onpointerdown=e=>{if(locked||e.button!==0)return;dragged=false;startX=e.clientX;startY=e.clientY;flip.setPointerCapture?.(e.pointerId)};
  flip.onpointerup=e=>{if(startX===null)return;const dx=e.clientX-startX,dy=e.clientY-startY;startX=null;if(Math.abs(dx)>65&&Math.abs(dx)>Math.abs(dy)){dragged=true;grade(dx>0)}};
  flip.onpointercancel=()=>{startX=null};return;
 }
 q.innerHTML=`<span class="badge">${escape(x.level)}</span><p class="muted">${typeNames[x.type]||'Soru'}</p><h2 style="white-space:pre-wrap">${escape(x.front)}</h2>${questionMedia(x)}<div id="answers">${answerMarkup(x,mode==='learn'&&s.i%2===0)}</div><button id="skip" class="section">Boş bırak / Geç →</button>`;
 $('skip').onclick=()=>{
  if(locked||!alive())return;locked=true;skipItem(x);noteMistake(user,x,null);
  // Show the right answer first; the learner moves on with "Sonraki".
  $('skip').disabled=true;$('answers').querySelectorAll('button,input').forEach(el=>el.disabled=true);
  $('answers').insertAdjacentHTML('beforeend',`<div class="feedback bad">↷ Boş bıraktın · Doğru cevap: ${escape(x.back)}<p>${escape(x.extra)}</p></div><button class="primary" id="next">Sonraki</button>`);
  $('next').onclick=next;
 };
 bindAnswer(x,(value,button)=>{
  if(locked||!alive())return;
  if(mode==='exam'&&Date.now()>=s.deadline){for(const item of s.pool.slice(s.i))skipItem(item);finish();return}
  locked=true;const ok=matchesAnswer(value,x,!button);record(x,ok);if(ok)s.score++;
  if(button)button.classList.add(ok?'good':'bad');$('skip').disabled=true;
  $('answers').querySelectorAll('button,input').forEach(el=>el.disabled=true);
  $('answers').insertAdjacentHTML('beforeend',`<div class="feedback ${ok?'good':'bad'}">${ok?'✓ Doğru!':'✗ Doğru cevap: '+escape(x.back)}<p>${escape(x.extra)}</p></div><button class="primary" id="next">Sonraki</button>`);
  $('next').onclick=next;
 });
}
