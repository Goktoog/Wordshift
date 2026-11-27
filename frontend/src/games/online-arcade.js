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
 const buttonsFor=question=>question.options.map((text,i)=>`<button data-answer data-choice="${i}">${escape(text)}</button>`).join('');
 const choices=buttonsFor(question);
 const title=`<div class="top"><h2>${gameTitles[mode]} · Tur <span id="arcadeRound">${round+1}</span></h2><span class="timer" id="pvpClock"></span></div>`;
 const clue='<h3>'+escape(question.front)+'</h3>';
 const scenes={
  tower:`<p id="arcadeProgress"></p><div class="tower-shaft race-tower">
   ${Array.from({length:4},(_,i)=>`<div class="race-floor" style="bottom:${9+19*i}%"><small>${i+1}. kat</small></div>`).join('')}
   ${initial.names.map((name,i)=>`<div class="race-climber" data-seat="${i}" style="left:${i?65:35}%"><span class="race-tag ${i===initial.me-1?'mine':''}">${i===initial.me-1?'Sen':escape(name)}</span><span aria-hidden="true">🐧</span></div>`).join('')}
   </div>${clue}<div id="towerAnswers"><div class="choices">${choices}</div></div>`,
  crossing:`<p id="arcadeProgress"></p><canvas id="crossingRoad" role="img" aria-label="İkişer şeritli üç yol ve araçlar"></canvas><div id="crossingPrompt">${clue}<div class="choices">${choices}</div></div><button class="primary" id="crossingGo" hidden>Şeridi geç</button>`,
  detective:`<div class="gallows-pair" id="duelDrawings"></div><div class="detective-clue"><p>Türkçe ipucu</p>${clue}<div class="detective-word" id="detectiveWord"></div></div>${externalInput?'':detectiveInput}<p id="arcadeProgress"></p><div class="detective-keys" id="detectiveKeys"></div>`
 };
 host.innerHTML=`<section class="card ${mode}-game">${title}${scenes[mode]}<p id="arcadeNote" role="status"></p></section>`;
 let state=initial,stopped=false,sending=false,animated=false,frame;
 let choiceButtons=[...host.querySelectorAll('[data-choice]')];
 const letters=new Map();
 const crossingCanvas=by('crossingRoad');
 const paint=crossingCanvas&&roadRenderer(crossingCanvas,trafficFor(initial.trafficSeed||0));
 async function submit(action,value,extra,token=round){
  if(sending||stopped)return;
  sending=true;update(state);
  try{await send(action,value,extra,token)}finally{sending=false;if(!stopped)update(state)}
 }
 function bindChoices(token){
  for(const button of choiceButtons)button.onclick=()=>submit('answer',Number(button.dataset.choice),null,token);
 }
 bindChoices(round);
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
 const platforms=[...host.querySelectorAll('.race-floor')];
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
  if(climbers.length){
   const heights=state.scores.map((score,i)=>{
    const age=t-Date.parse(state.moves?.[i]?.jumpAt);
    const u=reducedMotion||!Number.isFinite(age)?1:Math.min(1,Math.max(0,age/650));
    const level=1+Math.floor(score/100)-(1-u);
    return {u,level};
   });
   const camera=Math.max(1,heights[me].level-3);
   const first=Math.ceil(camera);
   for(const [i,floor] of platforms.entries()){
    const number=first+i;
    floor.style.bottom=(9+19*(number-camera))+'%';
    const label=number+'. kat';
    if(floor.firstChild.textContent!==label)floor.firstChild.textContent=label;
   }
   for(const [i,climber] of climbers.entries()){
    const {level,u}=heights[i],move=state.moves?.[i];
    climber.hidden=i!==me&&(level<camera||level>camera+3);
    if(climber.hidden)continue;
    const position=level-camera+Math.sin(Math.PI*u)*.48;
    climber.style.bottom='calc('+(9+19*position)+'% + 6px)';
    const sprite=climber.children[1];
    if(!reducedMotion)sprite.style.transform='rotate('+Math.round(u*360)+'deg)';
    if(u<1&&climber.dataset.jump!==move.jumpAt){climber.dataset.jump=move.jumpAt;kickSnow(sprite,climber.parentElement)}
    sprite.classList.toggle('tower-hurt',t-Date.parse(move?.hurtAt)<850);
   }
  }
  frame=window.requestAnimationFrame(drawFrame);
 }
 if(paint)by('crossingGo').onclick=()=>submit('hop',-1,null);
 if(paint||climbers.length)drawFrame();
 function update(next){
  if(mode==='tower'&&next.round!==state.round){
   by('arcadeRound').textContent=next.round+1;
   host.querySelector('h3').textContent=next.question.front;
   by('towerAnswers').querySelector('.choices').innerHTML=buttonsFor(next.question);
   choiceButtons=[...by('towerAnswers').querySelectorAll('[data-choice]')];
   bindChoices(next.round);animated=false;
  }
  state=next;const a=state.answer,me=state.me-1,other=1-me;
  const spectator=mode==='crossing'&&state.lives[me]===0;
  const open=!spectator&&state.phase==='question'&&now()>=Date.parse(state.startsAt)&&now()<Date.parse(state.deadline);
  const disabled=!open||sending;
  for(const b of choiceButtons)b.disabled=disabled||!!a;
  let message='';
  if(a)message=a.timeout?'Süre doldu.':a.ok?'Doğru!':'Doğru cevap: '+(state.correct||'');
  if(mode==='tower'){
   by('arcadeProgress').textContent=`Katın: ${1+state.scores[me]/100} · Rakibin: ${1+state.scores[other]/100}`;
   const ledge=choiceButtons[a?.choice];if(!animated&&ledge){animated=true;ledge.classList.add(a.ok?'landed':'cracked');}
  }else if(mode==='detective'){
   by('detectiveWord').textContent=a&&state.correct?state.correct:state.mask;
   const drawings=by('duelDrawings'),key=state.lives.join(',');
   if(drawings.dataset.key!==key){drawings.innerHTML=duelGallows(state);drawings.dataset.key=key}
   by('arcadeProgress').textContent='Her yanlış harfte bir parça çizilir.';
   for(const [ch,b] of letters)b.disabled=disabled||!!a||state.letters.includes(ch);
  }else{
   by('arcadeProgress').textContent=`Geçilen şerit: ${state.scores[me]/100} · Rakibin: ${state.scores[other]/100}`;
   by('crossingPrompt').hidden=spectator;
   by('crossingGo').hidden=!open||!a?.ok||!!a.hopAt;by('crossingGo').disabled=sending;
   if(a?.ok)message=a.hopAt?(a.collision?'Araca çarptın. Kaldırıma döndün.':'Güvenle geçtin!'):open?'Geçiş hakkı senin. Trafiği izle.':'Geçiş süresi doldu.';
  }
  if(spectator)message='Canların bitti. Rakibini izliyorsun. Sonuç iki oyuncunun da puanıyla belirlenecek.';
  if(by('arcadeNote').textContent!==message)by('arcadeNote').textContent=message;
 }
 update(initial);
 return {update,stop(){stopped=true;if(frame)window.cancelAnimationFrame(frame);unbindInput?.()}};
}
