import { $, escape, shuffle } from '../core/utils.js';
import { session, timer, setTimer, user, page, current } from '../core/state.js';
import { record, begin, opts, finish, topStudy, exitBind, answerMarkup, bindAnswer, equal } from '../features/session.js';
import { toast, sound } from '../ui/feedback.js';

import { shipCells as cells, canPlace } from './fleet-layout.js';

function placement() {
 const s = session;
 s.fleet ||= [3, 2, 1].map(length => ({length, vertical: false, cells: []}));
 s.selectedShip ??= 0;
 const selected = s.fleet[s.selectedShip];
 const ready = s.fleet.every(ship => ship.cells.length);
 $('view').innerHTML = topStudy('Filonu yerleştir') + `<div class="card">
 <p>Gemiyi seç, ardından tahtada başlangıç karesine dokun. Yerleştirdiğin gemiyi de seçip taşıyabilir veya döndürebilirsin.</p>
 <div class="fleet-tools">${s.fleet.map((ship, i) => `<div class="fleet-tool ${i === s.selectedShip ? 'selected' : ''}">
 <button data-select-ship="${i}" aria-pressed="${i === s.selectedShip}">⛴ ${ship.length} hücre · ${ship.cells.length ? 'Yerleştirildi' : 'Yerleştir'}${i === s.selectedShip ? ' ✓' : ''}</button>
 <button data-rotate-ship="${i}" ${ship.length === 1 ? 'disabled' : ''} aria-label="${ship.length} hücrelik gemiyi döndür">↻ Döndür · ${ship.vertical ? 'Dikey' : 'Yatay'}</button></div>`).join('')}</div>
 <p id="fleetHint" role="status">Seçili: ${selected.length} hücrelik gemi. Döndürme ilk hücre etrafında yapılır.</p>
 <div class="board fleet-board">${Array.from({length:25}, (_, i) => {
 const owner = s.fleet.findIndex(ship => ship.cells.includes(i));
 return `<button data-place="${i}" aria-label="Satır ${Math.floor(i/5)+1}, sütun ${i%5+1}${owner < 0 ? ', boş' : ', '+s.fleet[owner].length+' hücrelik gemi'}" class="${owner < 0 ? '' : 'ship '+(owner === s.selectedShip ? 'selected-ship' : '')}">${owner < 0 ? '' : `<span class="ship-part ${s.fleet[owner].vertical ? 'vertical' : ''}">⛴</span>`}</button>`;
 }).join('')}</div>
 <div class="actions section"><button id="resetFleet">Baştan yerleştir</button><button class="primary" id="startBattle" ${ready ? '' : 'disabled'}>Savaşa başla</button></div></div>`;
 exitBind();
 $('view').querySelectorAll('[data-select-ship]').forEach(b => b.onclick = () => {s.selectedShip = +b.dataset.selectShip; placement()});
 $('view').querySelectorAll('[data-rotate-ship]').forEach(b => b.onclick = () => {
   const index = +b.dataset.rotateShip, ship = s.fleet[index];
   s.selectedShip = index;
   if (ship.cells.length) {
     const rotated = cells(ship.cells[0], ship.length, !ship.vertical);
     if (!canPlace(s.fleet, index, rotated)) {placement(); $('fleetHint').textContent = 'Döndürülemiyor: sınır veya başka gemi var. Önce gemiyi boş bir alana taşı.'; toast('Döndürmek için yeterli boş alan yok.'); return}
     ship.cells = rotated;
   }
   ship.vertical = !ship.vertical; placement();
 });
 $('view').querySelectorAll('[data-place]').forEach(b => b.onclick = () => {
   const start = +b.dataset.place, owner = s.fleet.findIndex(ship => ship.cells.includes(start));
   if (owner >= 0) {s.selectedShip = owner; placement(); return}
   const group = cells(start, selected.length, selected.vertical);
   if (!canPlace(s.fleet, s.selectedShip, group)) {toast('Gemi bu alana sığmıyor veya başka gemiyle çakışıyor.'); return}
   selected.cells = group;
   placement();
 });
 $('resetFleet').onclick = () => {s.fleet = null; s.selectedShip = 0; placement()};
 $('startBattle').onclick = () => {
   if (!s.fleet.every(ship => ship.cells.length)) return;
   s.mine = s.fleet.flatMap(ship => ship.cells); s.enemy = [];
   for (const len of [3,2,1]) {
     let group;
     do {group = cells(Math.floor(Math.random()*25), len, Math.random()>.5)} while (!group || group.some(i => s.enemy.includes(i)));
     s.enemy.push(...group);
   }
   s.placed = true; battle();
 };
}

export function battle(){let s=session;if(!s.placed){placement();return}let won=s.enemy.every(i=>s.shots.includes(i)),lost=s.mine.every(i=>s.botShots.includes(i));if(won||lost){$('view').innerHTML=topStudy(won?'Zafer!':'Bot kazandı.')+'<div class="hero"><h2>'+s.score+' doğru cevap</h2><button id="again" class="primary">Yeni maç</button></div>';exitBind();$('again').onclick=()=>begin('battle',current(),s.difficulty);return}let x=s.pool[s.i%s.pool.length];function board(ships,shots,enemy){return '<div class="board">'+Array.from({length:25},(_,i)=>'<button '+(enemy?'data-shot="'+i+'"':'disabled')+' class="'+(shots.includes(i)?ships.includes(i)?'hit':'miss':!enemy&&ships.includes(i)?'ship':'')+'" '+(enemy&&(s.phase!=='shoot'||shots.includes(i))?'disabled':'')+'>'+ (shots.includes(i)?ships.includes(i)?'✹':'·':!enemy&&ships.includes(i)?'⛴':'')+'</button>').join('')+'</div>'}$('view').innerHTML=topStudy('Amiral Battı')+'<div class="boards"><div><h3>Senin filon</h3>'+board(s.mine,s.botShots,false)+'</div><div><h3>Bot filosu</h3>'+board(s.enemy,s.shots,true)+'</div></div><div class="card section"><p class="muted">'+escape(s.message||'Kelimeyi bil, atış hakkı kazan.')+'</p>'+(s.phase==='shoot'?'<h2>Bir hedef seç!</h2>':'<h2>'+escape(x.front)+'</h2>'+answerMarkup(x))+'</div>';exitBind();function botTurn(){if(s.enemy.every(i=>s.shots.includes(i))){battle();return}let possible=Array.from({length:25},(_,i)=>i).filter(i=>!s.botShots.includes(i)),smart={easy:0,normal:.3,hard:.6}[s.difficulty]??.3,near=[];
  // Bot only uses what it has legitimately seen: neighbours of its own earlier hits.
  for(const h of s.botShots.filter(i=>s.mine.includes(i)))for(const n of [h-5,h+5,h%5>0?h-1:-1,h%5<4?h+1:-1])if(n>=0&&n<25&&possible.includes(n))near.push(n);
  let target=near.length&&Math.random()<smart?shuffle(near)[0]:shuffle(possible)[0];s.botShots.push(target);s.message=s.mine.includes(target)?'Bot isabet etti!':'Bot ıskaladı.';s.i++;s.phase='question';battle()}if(s.phase==='shoot')$('view').querySelectorAll('[data-shot]').forEach(b=>b.onclick=()=>{s.shots.push(+b.dataset.shot);sound(s.enemy.includes(+b.dataset.shot));botTurn()});else bindAnswer(x,v=>{let ok=equal(v,x.back);record(x,ok);if(ok){s.score++;s.phase='shoot';s.message='Doğru! Şimdi hedefini seç.';battle()}else{toast('Doğru: '+x.back);botTurn()}})}
