import { escape } from '../core/utils.js';
import { mountPad } from './sketchpad.js';

export function mountStudio(host, first, send){
 const narrator=first.turn===first.me, draw=first.mode==='draw', token=first.round;
 let state=first,busy=false;
 host.innerHTML='<section class="card"><div class="top"><div><p class="eyebrow">Tur '+(token+1)+' / '+first.total+'</p><h2>'+(draw?'Çiz ve Bil':'Yasak Kelime')+'</h2></div><span class="timer" id="pvpClock"></span></div>'+
  (narrator?'<p>'+(draw?'Bu kelimeyi çiz.':'Bu kelimeyi dört yasağı kullanmadan anlat.')+'</p><h3 class="studio-secret">'+escape(first.secret)+'</h3>':
   '<p>'+(draw?'Çizilen kelimeyi İngilizce tahmin et.':'İpucunu oku ve İngilizce kelimeyi tahmin et.')+'</p>')+
  (draw?'<div data-pad></div>':(narrator?'<div class="ban-list">'+first.banned.map(w=>'<span class="badge">'+escape(w)+'</span>').join('')+'</div><small>Yasaklardan birini veya hedef kelimeyi gönderirsen −25 puan.</small>':'')+'<ul data-clues aria-live="polite"></ul>')+
  ((!narrator||!draw)?'<form data-entry><label>'+(narrator?'İpucun':'Tahminin')+'<input autocomplete="off" maxlength="180" required></label><button class="primary">Gönder</button></form>':'')+
  '<p class="studio-message" role="status"></p></section>';
 const note=host.querySelector('.studio-message'),form=host.querySelector('form'),list=host.querySelector('[data-clues]');
 const pad=draw?mountPad(host.querySelector('[data-pad]'),narrator,async (stroke,n)=>{
  const result=await send('stroke',n,stroke,token);if(result?.round===token)pad.update(result.log||[]);
 }):null;
 let lastLog=-1;
 if(form)form.onsubmit=async e=>{
  e.preventDefault();const field=form.querySelector('input'),text=field.value.trim();if(!text||busy)return;
  busy=true;
  try{const result=await send(narrator?'clue':'guess',state.log.length,text,token);if(result)field.value=''}finally{busy=false}
 };
 function update(next){
  state=next;const log=next.log||[];
  if(pad)pad.update(log);
  if(list&&lastLog!==log.length){list.innerHTML=log.map(text=>'<li>'+escape(text)+'</li>').join('');lastLog=log.length}
  const allowed=next.phase==='question'&&Date.parse(next.serverNow)>=Date.parse(next.startsAt);
  if(form){form.querySelector('button').disabled=busy||!allowed||(!narrator&&!log.length)||narrator&&log.length>=24;form.querySelector('input').disabled=next.phase!=='question'}
  if(pad)host.querySelector('canvas').style.pointerEvents=allowed?'auto':'none';
  const msg=next.event?.text||'';if(note.textContent!==msg){note.textContent=msg;note.classList.toggle('burst',msg.includes('💥'))}
 }
 update(first);
 return {update,stop(){}};
}
