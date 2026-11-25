import { $, escape } from '../core/utils.js';
import { page, session } from '../core/state.js';
import { answerMarkup, bindAnswer, exitBind, finish, matchesAnswer, record, topStudy } from '../features/session.js';

const lanes = 4;

function road(position) {
  const chicken = '<span class="crossing-chicken">🐔</span>';
  const strip = (className, occupied, contents = '') =>
    `<div class="crossing-strip ${className}">${contents}${occupied ? chicken : ''}</div>`;
  const traffic = ['🚙', '🚕', '🚗', '🚚'].map((car, index) =>
    strip('crossing-lane', position < lanes && position === lanes - index, `<span class="crossing-car">${car}</span>`)
  ).join('');
  return strip('crossing-bank', position === lanes) + traffic + strip('crossing-bank', position === 0);
}

export function crossing() {
  const s = session;
  if (s.i >= s.pool.length) { finish(); return; }
  const item = s.pool[s.i], position = s.score % lanes;
  $('view').innerHTML = topStudy('Kelime Geçidi') + `<div class="card crossing-game">
    <div class="top"><strong id="crossingProgress"></strong><span>${s.i + 1} / ${s.pool.length}</span></div>
    <div class="crossing-road" aria-hidden="true"></div>
    <p class="muted">Her doğru cevapla bir şerit geç. Dört doğru cevap tavuğu karşı kıyıya ulaştırır.</p>
    <h2>${escape(item.front)}</h2><div id="crossingAnswers">${answerMarkup(item)}</div>
    <p id="crossingFeedback" role="status"></p><button class="primary" id="crossingNext" hidden></button></div>`;
  exitBind();
  const scene = document.querySelector('.crossing-road');
  const draw = lane => {
    scene.innerHTML = road(lane);
    $('crossingProgress').textContent = `Geçilen yol: ${Math.floor(s.score / lanes)} · Şerit: ${lane} / ${lanes}`;
  };
  draw(position);
  let answered = false;
  bindAnswer(item, value => {
    if (answered || session !== s || page !== 'play') return;
    answered = true;
    const correct = matchesAnswer(value, item, !!$('typed'));
    record(item, correct);
    if (correct) s.score++;
    const lane = correct ? position + 1 : position;
    draw(lane);
    $('crossingFeedback').textContent = correct ? (lane === lanes ? 'Karşıya geçtin!' : 'Doğru! Bir şerit ilerledin.') : 'Bu şeritte bekle. Doğru cevap: ' + item.back;
    $('crossingAnswers').querySelectorAll('button,input').forEach(control => control.disabled = true);
    const next = $('crossingNext');
    next.textContent = s.i + 1 === s.pool.length ? 'Sonucu gör' : 'Sıradaki kelime';
    next.hidden = false;
    next.focus();
    next.onclick = () => { if (session === s && next.isConnected) { s.i++; crossing(); } };
  });
}
