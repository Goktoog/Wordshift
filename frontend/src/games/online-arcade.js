import {bindDetectiveInput,detectiveInput} from './detective-input.js';
import {escape} from '../core/utils.js';
export {arcadeModes} from './short-run.js';
import {roadRenderer} from './crossing-scene.js';
import {hopTime,trafficFor} from './crossing-traffic.js';
import {duelGallows} from './gallows.js';
import {kickSnow} from './tower.js';
import {gameTitles} from './catalog.js';



export function mountArcade(host,initial,send,now,externalInput){
 const {mode,round,question}=initial;
 const by=id=>host.querySelector('#'+id);
 const choices=question.options.map((text,i)=>`<button data-answer data-choice="${i}">${escape(text)}</button>`).join('');
 const title=`<div class="top"><h2>${gameTitles[mode]} · Tur ${round+1}</h2><span class="timer" id="pvpClock"></span></div>`;
 const clue='<h3>'+escape(question.front)+'</h3>';
 const scenes={
  tower:`<p id="arcadeProgress"></p><div class="tower-shaft race-tower">
   ${Array.from({length:4},(_,i)=>`<div class="race-floor" style="bottom:${9+21*i}%"><small>${i}. kat</small></div>`).join('')}
   ${initial.names.map((name,i)=>`<div class="race-climber" data-seat="${i}" style="left:${i?65:35}%"><span class="race-tag ${i===initial.me-1?'mine':''}">${i===initial.me-1?'Sen':escape(name)}</span><span aria-hidden="true">🐧</span></div>`).join('')}
   </div>${clue}<div id="towerAnswers"><div class="choices">${choices}</div></div>`,
  crossing:`<p id="arcadeProgress"></p><canvas id="crossingRoad" role="img" aria-label="İkişer şeritli üç yol ve araçlar"></canvas>${clue}<div class="choices">${choices}</div><button class="primary" id="crossingGo" hidden>Şeridi geç</button>`,
  detective:`<div class="gallows-pair" id="duelDrawings"></div><div class="detective-clue"><p>Türkçe ipucu</p>${clue}<div class="detective-word" id="detectiveWord"></div></div>${externalInput?'':detectiveInput}<p id="arcadeProgress"></p><div class="detective-keys" id="detectiveKeys"></div>`
 };
 host.innerHTML=`<section class="card ${mode}-game">${title}${scenes[mode]}<p id="arcadeNote" role="status"></p></section>`;
 let state=initial,stopped=false,sending=false,animated=false,frame;
 const choiceButtons=[...host.querySelectorAll('[data-choice]')];
 const letters=new Map();
 const crossingCanvas=by('crossingRoad');
 const paint=crossingCanvas&&roadRenderer(crossingCanvas,trafficFor(initial.trafficSeed||0));
 async function submit(action,value,extra){
  if(sending||stopped)return;
  sending=true;update(state);
  try{await send(action,value,extra,round)}finally{sending=false;if(!stopped)update(state)}
 }
 for(const button of choiceButtons)button.onclick=()=>submit('answer',Number(button.dataset.choice),null);
 let unbindInput;
 if(mode==='detective'){
  let chain=Promise.resolve();
  function enqueue(text){
   for(const ch of text){
    if(!letters.has(ch))continue;
    chain=chain.then(async()=>{
     if(stopped||!host.isConnected||state.answer||state.phase!=='question'||state.letters.includes(ch)||
       now()<Date.parse(state.startsAt)||now()>=Date.parse(state.deadline))return;
     await submit('letter',-1,ch);
    });
   }
  }
  for(const ch of new Set([...'abcdefghijklmnopqrstuvwxyz',...(initial.extraLetters||[])])){
   const button=document.createElement('button');button.textContent=ch.toUpperCase();
   button.onclick=()=>enqueue(ch);
   letters.set(ch,button);by('detectiveKeys').append(button);
  }
  unbindInput=bindDetectiveInput(externalInput||host.querySelector('.detective-input'),host,enqueue);
 }
 const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const climbers=[...host.querySelectorAll('.race-climber')];
 function drawFrame(){
  if(stopped||!host.isConnected)return;
  const t=now(),me=state.me-1;
  if(paint){
   const time=Math.max(0,(t-Date.parse(state.trackStart||state.startsAt))/1000);
   const racers=state.names.map((name,i)=>{
    const move=state.moves?.[i]||(i===me?state.answer:null);
    let depth=(state.lanes?.[i]||0)%3,hop=0,hit=false;
    if(move?.hopAt){
     const elapsed=(t-Date.parse(move.hopAt))/1000;
     const fraction=Math.min(1,Math.max(0,elapsed/hopTime));
     if(move.collision && fraction>=.55){depth=0;hit=elapsed<1.1}
     else if(fraction<1){depth=move.fromLane+fraction;hop=Math.sin(Math.PI*fraction)}
     else if(state.status==='finished'&&!move.collision)depth=move.fromLane+1;
    }
    return {depth,hop,hit,x:i===0?-20:20,rival:i!==me,name};
   });
   paint(time,0,0,false,racers);
  }
  // Expand the shared scale when the players are more than three floors apart.
  const floors=state.scores.map(score=>Math.floor(score/100));
  const stride=Math.max(1,Math.ceil((Math.max(...floors)-Math.min(...floors))/3));
  const base=Math.max(0,Math.max(...floors)-3*stride);
  for(const [i,climber] of climbers.entries()){
   const move=state.moves?.[i],age=t-Date.parse(move?.jumpAt);
   const u=Number.isFinite(age)?Math.min(1,Math.max(0,age/650)):1;
   const floor=floors[i],position=Math.max(0,(floor-base-(1-u))/stride)+Math.sin(Math.PI*u)*.48;
   climber.style.bottom=(9+21*position)+'%';
   const sprite=climber.children[1];
   if(!reducedMotion)sprite.style.transform='rotate('+Math.round(u*360)+'deg)';
   if(u<1&&!reducedMotion&&climber.dataset.jump!==move.jumpAt){climber.dataset.jump=move.jumpAt;kickSnow(sprite,climber.parentElement)}
   sprite.classList.toggle('tower-hurt',t-Date.parse(move?.hurtAt)<850);
  }
  if(climbers.length)host.querySelectorAll('.race-floor small').forEach((label,i)=>{const value=(base+i*stride)+'. kat';if(label.textContent!==value)label.textContent=value});
  frame=window.requestAnimationFrame(drawFrame);
 }
 if(paint)by('crossingGo').onclick=()=>submit('hop',-1,null);
 if(paint||climbers.length)drawFrame();
 function update(next){
  state=next;const a=state.answer,me=state.me-1,other=1-me;
  const open=state.phase==='question'&&now()>=Date.parse(state.startsAt)&&now()<Date.parse(state.deadline);
  const disabled=!open||sending;
  for(const b of choiceButtons)b.disabled=disabled||!!a;
  let message='';
  if(a)message=a.timeout?'Süre doldu.':a.ok?'Doğru!':'Doğru cevap: '+(state.correct||'');
  if(mode==='tower'){
   by('arcadeProgress').textContent=`Katın: ${state.scores[me]/100} · Rakibin: ${state.scores[other]/100}`;
   const ledge=choiceButtons[a?.choice];if(!animated&&ledge){animated=true;ledge.classList.add(a.ok?'landed':'cracked');}
  }else if(mode==='detective'){
   by('detectiveWord').textContent=a&&state.correct?state.correct:state.mask;
   const drawings=by('duelDrawings'),key=state.lives.join(',');
   if(drawings.dataset.key!==key){drawings.innerHTML=duelGallows(state);drawings.dataset.key=key}
   by('arcadeProgress').textContent='Her yanlış harfte bir parça çizilir.';
   for(const [ch,b] of letters)b.disabled=disabled||!!a||state.letters.includes(ch);
  }else{
   by('arcadeProgress').textContent=`Geçilen şerit: ${state.scores[me]/100} · Rakibin: ${state.scores[other]/100}`;
   by('crossingGo').hidden=!open||!a?.ok||!!a.hopAt;by('crossingGo').disabled=sending;
   if(a?.ok)message=a.hopAt?(a.collision?'Araca çarptın. Kaldırıma döndün.':'Güvenle geçtin!'):open?'Geçiş hakkı senin. Trafiği izle.':'Geçiş süresi doldu.';
  }
  if(by('arcadeNote').textContent!==message)by('arcadeNote').textContent=message;
 }
 update(initial);
 return {update,stop(){stopped=true;if(frame)window.cancelAnimationFrame(frame);unbindInput?.()}};
}
