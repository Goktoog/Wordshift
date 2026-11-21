import { escape } from '../core/utils.js';
import { sound } from '../ui/feedback.js';

const ROCKET='<svg viewBox="0 0 40 70" width="40" height="70" aria-hidden="true"><path d="M20 2C28 14 30 30 28 48H12C10 30 12 14 20 2Z" fill="#e8ecf5"/><circle cx="20" cy="24" r="5" fill="#4aa3ff"/><path d="M12 40 2 58l10-6Zm16 0 10 18-10-6Z" fill="#ed986f"/><rect x="14" y="48" width="12" height="6" fill="#8a93a8"/></svg>';
// Shared by solo and online. The launcher never changes position; only its angle changes.
export function mountMeteor(host,{prompt,options,deadline,startsAt=0,now=()=>Date.now(),onAnswer}) {
 host.innerHTML=`<div class="meteor-hud"><strong>Hedefi bul</strong><span class="timer" data-clock role="timer">10 sn</span></div><div class="space meteor-arena"><div class="meteor-stars"></div>${options.map((o,i)=>`<button class="meteor rock" data-rock="${i}" aria-label="${escape(o)}"><span>${escape(o)}</span></button>`).join('')}<div class="launcher"><span class="launcher-rocket">${ROCKET}</span><strong class="target-word">${escape(prompt)}</strong></div><div class="meteor-result" role="status"></div></div>`;
 const arena=host.querySelector('.meteor-arena'),rocket=host.querySelector('.launcher-rocket'),clock=host.querySelector('[data-clock]'),result=host.querySelector('.meteor-result'),rocks=[...host.querySelectorAll('[data-rock]')];
 let stopped=false,locked=false,frame,flight=null,flightDone=null,latestTime=now(),lastPuff=0;
 const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const seeds=rocks.map(()=>Math.random()*6.28),origin=()=>({x:arena.clientWidth/2,y:arena.clientHeight-72});
 const aim=(x,y)=>{const p=origin();rocket.style.transform=`rotate(${Math.max(-85,Math.min(85,Math.atan2(x-p.x,p.y-y)*180/Math.PI))}deg)`};
 arena.onpointermove=e=>{const box=arena.getBoundingClientRect();aim(e.clientX-box.left,e.clientY-box.top)};
 const active=()=>!stopped&&host.isConnected;
 function feedback(ok,correct){if(!active())return;result.textContent=ok?'✓ Doğru!':'✕ '+(correct?'Doğru: '+correct:'Süre doldu');result.className='meteor-result '+(ok?'good':'bad');sound(ok)}
 async function fire(index){
  if(!active()||locked||now()<startsAt)return;
  if(now()>=deadline)index=-1;
  locked=true;rocks.forEach(b=>b.disabled=true);
  const answerPromise=Promise.resolve().then(()=>onAnswer(index)).then(value=>({value}),error=>({error}));
  if(index>=0){
   const b=rocks[index],p=origin();aim(b.offsetLeft+b.offsetWidth/2,b.offsetTop+b.offsetHeight/2);
   const missile=document.createElement('span');missile.className='meteor-missile';missile.innerHTML='<span>'+ROCKET+'</span><i></i>';arena.append(missile);
   flight={el:missile,from:p,to:{x:b.offsetLeft+b.offsetWidth/2,y:b.offsetTop+b.offsetHeight/2},start:performance.now(),duration:reduced?1:380,target:b};
   await new Promise(resolve=>{flightDone=resolve});
  }
  try {const settled=await answerPromise;if(settled.error)throw settled.error;const outcome=settled.value;if(active()&&outcome)feedback(outcome.ok,outcome.correct)}catch(e){if(active()){result.textContent=e.message;result.className='meteor-result bad';if(now()<deadline){locked=false;rocks.forEach((b,i)=>{b.classList.remove('explode');b.innerHTML='<span>'+escape(options[i])+'</span>'})}}}
 }
 rocks.forEach((b,i)=>{b.onclick=()=>void fire(i);b.onfocus=()=>aim(b.offsetLeft+b.offsetWidth/2,b.offsetTop+b.offsetHeight/2)});
 function tick(time){
  if(!active()){stop();return}
  latestTime=now();const remaining=Math.max(0,Math.ceil((deadline-latestTime)/1000));
  clock.textContent=latestTime<startsAt?'Hazır ol…':remaining+' sn';arena.classList.toggle('urgent',remaining<=3&&!locked);clock.classList.toggle('urgent-text',remaining<=3&&!locked);
  rocks.forEach((b,i)=>{
   const width=Math.min(160,Math.max(95,arena.clientWidth*.32));b.style.width=width+'px';
   const col=i%2,row=Math.floor(i/2),zone=arena.clientWidth/2;
   const dx=reduced?0:Math.sin(time/1100+seeds[i])*Math.min(18,zone*.08),dy=reduced?0:Math.cos(time/1400+seeds[i])*16;
   b.style.left=Math.max(4,Math.min(arena.clientWidth-width-4,col*zone+(zone-width)/2+dx))+'px';
   b.style.top=(30+row*135+dy)+'px';b.disabled=locked||latestTime<startsAt;
  });
  if(flight){const f=flight,k=Math.min(1,(time-f.start)/f.duration);f.el.style.left=(f.from.x+(f.to.x-f.from.x)*k)+'px';f.el.style.top=(f.from.y+(f.to.y-f.from.y)*k)+'px';f.el.style.transform=`translate(-50%,-50%) rotate(${Math.atan2(f.to.x-f.from.x,f.from.y-f.to.y)*180/Math.PI}deg)`;
   if(!reduced&&time-lastPuff>45){lastPuff=time;const puff=document.createElement('i');puff.className='puff smoke';puff.style.left=(f.from.x+(f.to.x-f.from.x)*k)+'px';puff.style.top=(f.from.y+(f.to.y-f.from.y)*k)+'px';arena.append(puff);setTimeout(()=>puff.remove(),750)}
   if(k===1){f.el.remove();f.target.classList.add('explode');f.target.innerHTML='<span>💥</span>';host.closest('#view')?.classList.add('impact-shake');const view=host.closest('#view');setTimeout(()=>view?.classList.remove('impact-shake'),450);explosionSound();flight=null;flightDone?.();flightDone=null;}
  }
  if(latestTime>=deadline&&!locked)void fire(-1);
  frame=window.requestAnimationFrame(tick);
 }
 function stop(){stopped=true;window.cancelAnimationFrame(frame);flightDone?.();flightDone=null;arena.onpointermove=null}
 frame=window.requestAnimationFrame(tick);
 return {stop,feedback,setAnswer(outcome){if(!locked){locked=true;rocks.forEach(b=>b.disabled=true);feedback(outcome.ok,outcome.correct)}}};
}
function explosionSound(){try{const c=new(window.AudioContext||window.webkitAudioContext)(),o=c.createOscillator(),g=c.createGain();o.type='sawtooth';o.frequency.setValueAtTime(100,c.currentTime);o.frequency.exponentialRampToValueAtTime(25,c.currentTime+.18);g.gain.setValueAtTime(.035,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.2);o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+.22);o.onended=()=>c.close()}catch{}}
