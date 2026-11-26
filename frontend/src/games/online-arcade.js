import {escape} from '../core/utils.js';
export {arcadeModes} from './short-run.js';
import {roadRenderer} from './crossing-scene.js';
import {hopTime,safeToGo} from './crossing-traffic.js';
import {gameTitles} from './catalog.js';



export function mountArcade(host,initial,send,now){
 const {mode,round,question}=initial;
 const by=id=>host.querySelector('#'+id);
 const choices=question.options.map((text,i)=>`<button data-answer data-choice="${i}">${escape(text)}</button>`).join('');
 const title=`<div class="top"><h2>${gameTitles[mode]} · Tur ${round+1} · Hedef 3</h2><span class="timer" id="pvpClock"></span></div>`;
 const clue='<h3>'+escape(question.front)+'</h3>';
 const scenes={
  tower:`<p id="arcadeProgress"></p><div class="tower-shaft race-tower">
   ${Array.from({length:4},(_,i)=>`<div class="race-floor" style="bottom:${9+21*i}%"><small>${i}. kat</small></div>`).join('')}
   ${initial.names.map((name,i)=>`<div class="race-climber" data-seat="${i}" style="left:${i?65:35}%"><span class="race-tag ${i===initial.me-1?'mine':''}">${i===initial.me-1?'Sen':escape(name)}</span><span aria-hidden="true">🐧</span></div>`).join('')}
   </div>${clue}<div id="towerAnswers"><div class="choices">${choices}</div></div>`,
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
   const lane=(state.lanes?.[me]||0)%3;
   by('crossingSignal').textContent=by('crossingGo').hidden?'':safeToGo(lane,time,racers[me].x)?'Geçiş aralığı açık':'Araç yaklaşıyor';
  }
  for(const [i,climber] of climbers.entries()){
   const floor=state.scores[i]/100,at=Date.parse(state.moves?.[i]?.jumpAt);
   const u=Number.isFinite(at)?Math.min(1,Math.max(0,(t-at)/650)):1;
   const lift=floor?floor-1+u+Math.sin(Math.PI*u)*.48:0;
   climber.style.bottom=(9+21*lift)+'%';
  }
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
   by('arcadeProgress').textContent='Bu kelimede kalan yanlış harf hakkı: '+Math.max(0,5-state.missed);
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
