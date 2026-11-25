import { $, escape } from '../core/utils.js';
import { session, page } from '../core/state.js';
import { answerMarkup, bindAnswer, exitBind, finish, matchesAnswer, record, topStudy } from '../features/session.js';

function kickSnow(player) {
  const base = player.parentElement, puff = document.createElement('span');
  puff.className = 'tower-powder';
  puff.setAttribute('aria-hidden','true');
  puff.style.left = '50%';
  for (let i = 0; i < 12; i++) {
    const fleck = document.createElement('i'), angle = Math.PI * (i + .5) / 12;
    fleck.style.setProperty('--dx', Math.round(Math.cos(angle) * (24 + i % 3 * 8)) + 'px');
    fleck.style.setProperty('--dy', -Math.round(Math.sin(angle) * (8 + i % 4 * 4)) + 'px');
    puff.append(fleck);
  }
  base.append(puff);
  puff.addEventListener('animationend', () => puff.remove(), {once:true});
}
function jump(player, target, landed) {
  const start = player.getBoundingClientRect();
  const end = target.getBoundingClientRect();
  const dx = end.left + (end.width - start.width) / 2 - start.left;
  const dy = end.top - start.bottom;
  const destination = landed ? `translate(${dx}px,${dy}px)` : 'translate(0,0)';
  player.style.transform = destination;
  if (!player.animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  kickSnow(player);
  const arc = [
    {transform:'translate(0,0)'},
    {transform:`translate(${dx * .65}px,${dy - 34}px)`, offset:.45},
    {transform:`translate(${dx}px,${dy}px)`, offset:landed ? 1 : .65}
  ];
  if (!landed) arc.push({transform:destination});
  player.animate(arc, {duration:landed ? 550 : 750, easing:'ease-in-out'});
}

export function tower() {
  const s = session;
  if (s.i >= s.pool.length) { finish(); return; }
  const item = s.pool[s.i];
  $('view').innerHTML = topStudy('Kelime Kulesi') + `<section class="card tower-game">
    <div class="top"><strong id="towerHeight">Kat ${s.score}</strong><span>${s.i + 1} / ${s.pool.length}</span></div>
    <h2>${escape(item.front)}</h2><p class="muted">Doğru anlamın olduğu platforma zıpla.</p>
    <div class="tower-shaft" id="towerShaft">
      <div id="towerAnswers">${answerMarkup(item)}</div>
      <div class="tower-base"><span class="tower-player" id="towerPlayer" aria-hidden="true">🐧</span></div>
    </div>
    <p id="towerFeedback" role="status"></p><button id="towerNext" class="primary" hidden></button></section>`;
  exitBind();
  const shaft = $('towerShaft'), player = $('towerPlayer'), answers = $('towerAnswers');
  shaft.style.setProperty('--launch', (s.towerPosition ?? 50) + '%');
  // A set with a single translation uses the same typed-answer fallback as study mode.
  if ($('answerForm')) answers.insertAdjacentHTML('afterbegin', '<div class="tower-ledge">Bir üst kat</div>');
  let answered = false;
  bindAnswer(item, (value, button) => {
    if (answered || session !== s || page !== 'play') return;
    answered = true;
    const correct = matchesAnswer(value, item, !button);
    const target = button || answers.querySelector('.tower-ledge');
    record(item, correct);
    answers.querySelectorAll('button,input').forEach(control => control.disabled = true);
    target.classList.add(correct ? 'landed' : 'cracked');
    jump(player, target, correct);
    if (correct) {
      s.score++;
      const bounds = shaft.getBoundingClientRect(), ledge = target.getBoundingClientRect();
      if (bounds.width) s.towerPosition = Math.max(12, Math.min(88, 100 * (ledge.left + ledge.width / 2 - bounds.left) / bounds.width));
    }
    $('towerHeight').textContent = 'Kat ' + s.score;
    $('towerFeedback').textContent = correct ? 'Doğru! Bir kat yükseldin.' : 'Platform çatladı. Doğru cevap: ' + item.back;
    const next = $('towerNext');
    next.hidden = false;
    next.textContent = s.i + 1 === s.pool.length ? 'Sonucu gör' : 'Sıradaki kelime';
    next.focus();
    next.onclick = () => { if (session === s && next.isConnected) { s.i++; tower(); } };
  });
}
