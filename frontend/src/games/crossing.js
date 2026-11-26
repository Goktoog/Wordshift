import {runOver,livesLabel} from './short-run.js';
import { $, escape } from '../core/utils.js';
import { page, session } from '../core/state.js';
import { answerMarkup, bindAnswer, exitBind, finish, matchesAnswer, record, topStudy } from '../features/session.js';
import { roadRenderer } from './crossing-scene.js';
import { traffic, hopTime, safeToGo, crossingHit } from './crossing-traffic.js';

export function crossing() {
  const s=session;
  if(runOver(s)){finish();return}
  $('view').innerHTML=topStudy('Kelime Geçidi')+`<section class="card crossing-game">
    <div class="top"><strong id="crossingProgress"></strong><span id="crossingRound"></span></div>
    <canvas id="crossingRoad" role="img" aria-label="Tavuğun arkasından görülen üç şeritli yol ve aradaki güvenli refüjler"></canvas>
    <p class="muted">Kelimeyi bil, trafiği izle. Yol açıldığında “Şeridi geç” düğmesine bas. Çarpışırsan kaldırıma dönersin.</p>
    <div id="crossingQuestion"></div><p id="crossingFeedback" role="status"></p>
    <div class="actions"><button id="crossingGo" class="primary" hidden>Şeridi geç</button>
    <span id="crossingSignal" hidden></span><button id="crossingNext" class="primary" hidden></button></div></section>`;
  exitBind();
  const canvas=$('crossingRoad'),draw=roadRenderer(canvas),step=$('crossingGo'),next=$('crossingNext');
  const signal=$('crossingSignal'),feedback=$('crossingFeedback');
  const active=()=>session===s&&page==='play'&&canvas.isConnected;
  let lane=0,roads=0,hits=0,time=0,last=null,started=0,impact=0,phase='question';
  const progress=()=>{$('crossingProgress').textContent=`${livesLabel(s)} · Tamamlanan yol: ${roads} · Şerit ${lane}/${traffic.length} · Çarpışma ${hits}`};
  function updateSignal(){
    const safe=safeToGo(lane,time),label=safe?'Geçiş aralığı açık':'Araç yaklaşıyor';
    if(signal.textContent!==label)signal.textContent=label;
    signal.dataset.safe=String(safe);
  }
  function ready(){
    phase='ready';step.hidden=false;signal.hidden=false;step.disabled=false;
    updateSignal();
    step.focus();
  }
  function resolved(){
    phase='result';next.textContent=runOver(s)||s.i+1===s.pool.length?'Sonucu gör':'Sıradaki kelime';
    next.hidden=false;next.focus();
  }
  function question(){
    phase='question';next.hidden=true;feedback.textContent='';
    if(lane===traffic.length)lane=0;
    progress();$('crossingRound').textContent=`${s.i+1} / ${s.pool.length}`;
    const item=s.pool[s.i];
    $('crossingQuestion').innerHTML=`<h2>${escape(item.front)}</h2><div id="crossingAnswers">${answerMarkup(item)}</div>`;
    bindAnswer(item,(value,button)=>{
      if(!active()||phase!=='question')return;
      const ok=matchesAnswer(value,item,!button);
      $('crossingAnswers').querySelectorAll('button,input').forEach(el=>el.disabled=true);
      record(item,ok);
      if(!ok){s.lives--;progress();feedback.textContent='Doğru cevap: '+item.back;resolved();return}
      feedback.textContent='Geçiş hakkı kazandın. Güvenli anı seç.';ready();
    });
  }
  next.onclick=()=>{
    if(!active()||phase!=='result')return;
    s.i++;
    if(runOver(s)){
      finish();
      $('view').querySelector('.hero').insertAdjacentHTML('beforeend',`<p>${roads} yol tamamlandı · ${hits} çarpışma</p>`);
    }else question();
  };
  step.onclick=()=>{
    if(!active()||phase!=='ready')return;
    phase='moving';started=time;step.hidden=true;signal.hidden=true;feedback.textContent='Geçiyorsun…';
  };
  function advance(dt){
    time+=dt;
    if(phase==='impact'&&time-impact>=.6){
      lane=0;progress();if(s.lives===0){resolved();return}feedback.textContent='Kaldırıma döndün. Aynı hakla yeniden geçebilirsin.';ready();
    }
    if(phase!=='moving')return;
    const t=Math.min(1,(time-started)/hopTime);
    if(crossingHit(lane,started,time-dt,time)){
      phase='impact';impact=time;hits++;s.lives--;progress();feedback.textContent='Araca çarptın!';return;
    }
    if(t>=1){
      s.score++;lane++;if(lane===traffic.length)roads++;
      progress();feedback.textContent=lane===traffic.length?'Karşı kıyıya ulaştın!':'Refüje ulaştın. Burada güvendesin.';
      resolved();
    }
  }
  function frame(now){
    if(!active())return;
    // Small steps keep impacts consistent across display refresh rates. Hidden tabs do not fast-forward.
    let dt=last===null||document.hidden?0:Math.min(.08,(now-last)/1000);last=now;
    while(dt>0){const slice=Math.min(dt,1/120);advance(slice);dt-=slice}
    const moving=phase==='moving'||phase==='impact';
    const t=moving?Math.min(1,((phase==='impact'?impact:time)-started)/hopTime):0;
    draw(time,lane+t,Math.sin(Math.PI*t),phase==='impact');
    if(phase==='ready')updateSignal();
    window.requestAnimationFrame(frame);
  }
  question();draw(time,lane,0,false);window.requestAnimationFrame(frame);
}
