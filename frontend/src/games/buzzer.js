import { $, escape } from '../core/utils.js';
import { page, session, user, setTimer, timer } from '../core/state.js';
import { record, exitBind, topStudy, finish } from '../features/session.js';
import { bonkSound } from '../ui/feedback.js';
import { botProfile, answerChance } from './bot-skill.js';
import { buzzerOptions } from './buzzer-deck.js';

export const animals=['Panda','Goril','Şempanze','Kedi','Köpek','Eşek','T-Rex'];
export const avatarPicker=(value=0)=>`<label class="bng-picker">Avatarın <select id="bngAvatar">${animals.map((name,i)=>`<option value="${i}" ${i===value?'selected':''}>${name}</option>`).join('')}</select></label>`;
function player(index,avatar,lives,name,hitBy) {
  const id=Number.isInteger(avatar)&&animals[avatar]?avatar:0;
  return `<div class="bng-seat seat-${index}" data-animal="${id}">
    <div class="bng-tag">${escape(name)} <span aria-label="${lives} can">${'♥'.repeat(lives)}${'♡'.repeat(3-lives)}</span></div>
    <div class="bng-puppet ${hitBy===index?'swing':''} ${hitBy===1-index?'bonked':''}">
      <div class="bng-head" style="--bruise:${(3-lives)*.10};--swelling:${1+(3-lives)*.026}" aria-label="${animals[id]}" role="img"><i class="ear e1"></i><i class="ear e2"></i><i class="face"></i><i class="eye a"></i><i class="eye b"></i><i class="snout"></i><i class="bump" style="opacity:${(3-lives)/3}"></i></div>
      <div class="bng-reach"><i></i></div><div class="bng-mallet"><i class="grip"></i><i class="handle"></i><i class="pad"></i></div>
    </div></div>`;
}
export function buzzerTable({names,avatars,lives,front,canBuzz,hitBy=-1,clockId='bngClock'}){
  return `<div class="bng-board"><div class="bng-prompt">${escape(front)}</div><div class="bng-arena">
    <span id="${clockId}" class="bng-stage-clock" role="timer" aria-label="Kalan süre (saniye)"></span>
    <div class="bng-table"></div>${names.map((name,i)=>player(i,avatars[i],lives[i],name,hitBy)).join('')}
    <button id="bngBuzz" class="bng-buzz" ${canBuzz?'':'disabled'}>Biliyorum!</button></div></div>`;
}
export function pressBuzzer(host,index){
  const seat=host.querySelector('.seat-'+index),arm=seat?.querySelector('.bng-reach');
  const button=host.querySelector('#bngBuzz');
  if(!arm||!button)return;
  const puppet=arm.parentElement.getBoundingClientRect(),target=button.getBoundingClientRect();
  const shoulderX=index===0?puppet.left+arm.offsetLeft:puppet.right-arm.offsetLeft;
  const shoulderY=puppet.top+arm.offsetTop+arm.offsetHeight/2;
  const dx=(target.left+target.width/2-shoulderX)*(index===0?1:-1);
  const dy=target.top+target.height*.38-shoulderY;
  arm.style.setProperty('--reach-length',Math.hypot(dx,dy)+'px');
  arm.style.setProperty('--reach-angle',Math.atan2(dy,dx)+'rad');
  seat.classList.add('pressing');button.classList.add('pressed');
}

export function buzzerAnswers(options){
  return options.length?`<div class="choices">${options.map((v,i)=>`<button data-bng-choice="${i}">${escape(v)}</button>`).join('')}</div>`:
    '<form id="bngForm"><label>Cevabın<input name="response" required maxlength="700" autocomplete="off"></label><button class="primary">Gönder</button></form>';
}
export function bindBuzzerAnswers(host,answer){
  host.querySelectorAll('[data-bng-choice]').forEach(b=>b.onclick=()=>answer(Number(b.dataset.bngChoice),null));
  const form=host.querySelector('#bngForm');
  if(form)form.onsubmit=e=>{e.preventDefault();const value=form.elements.response.value.trim();if(value)answer(-1,value)};
}

export function buzzer(){
  const s=session;
  $('view').innerHTML=topStudy('Kafanı Kırarım')+`<div class="card" id="bngSolo">
    <p>İlk basan cevaplar. Yanlış cevapta aynı soru rakibe geçer. Üç isabet maçı kazandırır.</p>
    <p>Bot seviyesi: <strong>${botProfile(s.difficulty).label}</strong></p>
    ${avatarPicker()}<button class="primary" id="bngStart">Botla başla</button></div>`;
  exitBind();
  const host=$('bngSolo'),alive=()=>session===s&&page==='play'&&host.isConnected;
  $('bngStart').onclick=()=>{
    if(!alive())return;
    const avatar=Number($('bngAvatar').value),avatars=[avatar,(avatar+1+Math.floor(Math.random()*6))%7];
    const names=[user.name,'Bot'],lives=[3,3],difficulty=s.difficulty;
    const profile=botProfile(difficulty);
    let chance,botKnows;
    let round=0,phase,actor,item,options,deadline,botAt,attempted,hitBy,message;
    const now=()=>performance.now();
    function draw(pressed=-1){
      host.innerHTML=buzzerTable({names,avatars,lives,front:item.front,canBuzz:phase==='buzz',hitBy})+
        `<div class="bng-status"><p role="status">${escape(message)}</p></div>`+
        (phase==='answer'&&actor===0?buzzerAnswers(options):'');
      $('bngBuzz').onclick=()=>{if(alive()&&phase==='buzz'){tick();if(phase==='buzz')claim(0)}};
      bindBuzzerAnswers(host,(choice,text)=>{
        if(!alive()||phase!=='answer'||actor!==0)return;
        tick();if(phase==='answer'&&actor===0)answer(text===null?options[choice]===item.back:text.toLocaleLowerCase('tr')===item.back.trim().toLocaleLowerCase('tr'));
      });
      showClock();
      if(pressed>=0)pressBuzzer(host,pressed);
    }
    function startRound(){
      item=s.pool[round%s.pool.length];options=buzzerOptions(item,s.pool);
      phase='buzz';attempted=[false,false];hitBy=-1;deadline=now()+10000;
      chance=answerChance(profile,item);
      botKnows=Math.random()<chance;
      // A confident bot can still wait, and an unsure bot may risk a guess.
      const wait=profile.hesitate+(botKnows?-.10:.23);
      botAt=Math.random()<wait?Infinity:now()+profile.read+Math.min(2200,item.front.length*13)+(botKnows?0:1100)+Math.random()*1200;
      message='Soruyu oku ve butona bas.';draw();
    }
    function claim(n,note){
      const pressed=phase==='buzz'?n:-1;
      phase='answer';actor=n;deadline=now()+10000;botAt=now()+1100+Math.random()*900;
      message=note||(n?'Bot cevaplıyor…':'Cevap sırası sende.');draw(pressed);
    }
    function answer(ok){
      attempted[actor]=true;
      if(actor===0){record(item,ok,false);if(ok)s.score++}
      if(ok){
        lives[1-actor]--;hitBy=actor;bonkSound();
        message=(actor===0?'Doğru bildin!':'Bot doğru bildi.')+' Bıng!';
      }else if(!attempted[1-actor]){
        claim(1-actor,actor===1?'Bot bilemedi. Aynı soru sende.':'Cevap hakkı bota geçti.');return;
      }else message='İkiniz de bilemediniz. Doğru cevap: '+item.back;
      phase='feedback';deadline=now()+2200;draw();
    }
    function showClock(){const el=$('bngClock');if(el){const left=Math.max(0,Math.ceil((deadline-now())/1000));el.hidden=phase==='feedback';el.textContent=String(left);el.classList.toggle('urgent-text',left<=3)}}
    function tick(){
      if(!alive()){clearInterval(clock);return}
      if(phase==='buzz'&&now()>=deadline){phase='feedback';deadline=now()+2200;message='Süre doldu. Doğru cevap: '+item.back;draw()}
      else if(phase==='buzz'&&now()>=botAt)claim(1);
      else if(phase==='answer'&&now()>=deadline)answer(false);
      else if(phase==='answer'&&actor===1&&now()>=botAt)answer(botKnows);
      else if(phase==='feedback'&&now()>=deadline){
        if(lives.includes(0)){
          clearInterval(clock);finish();
          const hero=$('view').querySelector('.hero');hero.querySelector('h1').textContent=lives[0]?'Kazandın!':'Bot kazandı';
          hero.querySelector('p').textContent=`${round+1} tur · Kalan canlar: Sen ${lives[0]} / Bot ${lives[1]} · ${s.score} doğru cevap`;
        }else{round++;startRound()}
      }
      if(alive())showClock();
    }
    clearInterval(timer);const clock=setInterval(tick,100);setTimer(clock);startRound();
  };
}
