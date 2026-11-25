import {escape} from '../core/utils.js';
import {jump} from './tower.js';
import {roadRenderer} from './crossing-scene.js';
import {hopTime,safeToGo} from './crossing-traffic.js';
import {gameTitles} from './catalog.js';

export const arcadeModes=['crossing','tower','detective'];

export function mountArcade(host,initial,send,now){
 const {mode,round,question}=initial;
 const by=id=>host.querySelector('#'+id);
 const choices=question.options.map((text,i)=>`<button data-answer data-choice="${i}">${escape(text)}</button>`).join('');
 const title=`<div class="top"><h2>${gameTitles[mode]} · ${round+1}/${initial.total}</h2><span class="timer" id="pvpClock"></span></div>`;
 const clue='<h3>'+escape(question.front)+'</h3>';
 const scenes={
  tower:`<p id="arcadeProgress"></p>${clue}<div class="tower-shaft"><div id="towerAnswers"><div class="choices">${choices}</div></div><div class="tower-base"><span class="tower-player" id="towerPlayer">🐧</span></div></div>`,
  crossing:`<p id="arcadeProgress"></p><canvas id="crossingRoad" role="img" aria-label="Üç şeritli yol ve araçlar"></canvas>${clue}<div class="choices">${choices}</div><button class="primary" id="crossingGo" hidden>Şeridi geç</button> <span id="crossingSignal"></span>`,
  detective:`<div class="detective-clue"><p>Türkçe ipucu</p>${clue}<div class="detective-word" id="detectiveWord"></div></div><p id="arcadeProgress"></p><div class="detective-keys" id="detectiveKeys"></div>`
 };
 host.innerHTML=`<section class="card ${mode}-game">${title}${scenes[mode]}<p id="arcadeNote" role="status"></p></section>`;
 let state=initial,stopped=false,sending=false,animated=false,frame;
 const choiceButtons=[...host.querySelectorAll('[data-choice]')];
 const letters=new Map();
 const crossingCanvas=by('crossingRoad');
 const paint=crossingCanvas&&roadRenderer(crossingCanvas);
 async function submit(action,value,extra){
  if(sending||stopped)return;
  sending=true;update(state);
  try{await send(action,value,extra,round)}finally{sending=false;if(!stopped)update(state)}
 }
 for(const button of choiceButtons)button.onclick=()=>submit('answer',Number(button.dataset.choice),null);
 if(mode==='detective'){
  for(const ch of new Set([...'abcdefghijklmnopqrstuvwxyz',...(initial.extraLetters||[])])){
   const button=document.createElement('button');button.textContent=ch.toUpperCase();
   button.onclick=()=>submit('letter',-1,ch);
   letters.set(ch,button);by('detectiveKeys').append(button);
  }
 }
 function keydown(e){
  if(!host.isConnected||e.ctrlKey||e.metaKey||e.altKey||e.repeat||e.target.closest?.('input,textarea,select'))return;
  const button=letters.get(e.key.toLowerCase());if(button&&!button.disabled){e.preventDefault();button.click()}
 }
 if(mode==='detective'){host.tabIndex=-1;host.focus();host.addEventListener('keydown',keydown)}
 if(paint){
  by('crossingGo').onclick=()=>submit('hop',-1,null);
  function draw(){
   if(stopped||!host.isConnected)return;
   const t=now(),time=Math.max(0,(t-Date.parse(state.startsAt))/1000),a=state.answer;
   const lane=(state.lanes?.[state.me-1]||0)%3;
   let depth=lane,bounce=0,hit=false;
   if(a?.hopAt){
    const fraction=Math.min(1,Math.max(0,(t-Date.parse(a.hopAt))/(hopTime*1000)));
    hit=!!a.collision&&fraction>=.5;depth=hit?0:a.fromLane+fraction;bounce=hit?0:Math.sin(Math.PI*fraction);
   }
   paint(time,depth,bounce,hit);
   by('crossingSignal').textContent=!by('crossingGo').hidden?(safeToGo(lane,time)?'Geçiş aralığı açık':'Araç yaklaşıyor'):'';
   frame=window.requestAnimationFrame(draw);
  }
  draw();
 }
 function update(next){
  state=next;const a=state.answer,me=state.me-1,other=1-me;
  const open=state.phase==='question'&&now()>=Date.parse(state.startsAt)&&now()<Date.parse(state.deadline);
  const disabled=!open||sending;
  for(const b of choiceButtons)b.disabled=disabled||!!a;
  let message='';
  if(a)message=a.timeout?'Süre doldu.':a.ok?'Doğru!':'Doğru cevap: '+(state.correct||'');
  if(mode==='tower'){
   by('arcadeProgress').textContent=`Katın: ${state.scores[me]/100} · Rakibin: ${state.scores[other]/100}`;
   const ledge=choiceButtons[a?.choice];if(!animated&&ledge){animated=true;ledge.classList.add(a.ok?'landed':'cracked');jump(by('towerPlayer'),ledge,a.ok)}
  }else if(mode==='detective'){
   by('detectiveWord').textContent=a&&state.correct?state.correct:state.mask;
   by('arcadeProgress').textContent='Kalan yanlış harf hakkı: '+Math.max(0,5-state.missed);
   for(const [ch,b] of letters)b.disabled=disabled||!!a||state.letters.includes(ch);
  }else{
   by('arcadeProgress').textContent=`Geçilen şerit: ${state.scores[me]/100} · Rakibin: ${state.scores[other]/100}`;
   by('crossingGo').hidden=!open||!a?.ok||!!a.hopAt;by('crossingGo').disabled=sending;
   if(a?.ok)message=a.hopAt?(a.collision?'Araca çarptın. Kaldırıma döndün.':'Güvenle geçtin!'):open?'Geçiş hakkı senin. Trafiği izle.':'Geçiş süresi doldu.';
  }
  if(by('arcadeNote').textContent!==message)by('arcadeNote').textContent=message;
 }
 update(initial);
 return {update,stop(){stopped=true;if(frame)window.cancelAnimationFrame(frame);host.removeEventListener('keydown',keydown)}};
}
