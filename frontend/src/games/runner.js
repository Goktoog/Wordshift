import { $, escape } from '../core/utils.js';
import { session, timer, setTimer, page } from '../core/state.js';
import { record, finish, topStudy, exitBind, answerMarkup, bindAnswer, equal } from '../features/session.js';

export function runner() {
 const s = session;
 clearInterval(timer);
 if (s.lives <= 0 || s.i >= s.pool.length) {finish(); return}
 const x = s.pool[s.i];
 s.action ||= 'jump';
 $('view').innerHTML = topStudy('Word Runner') + `
 <div class="game-screen runner-scene" id="runnerScene">
 <div class="hud">♥ ${s.lives} · ${s.distance} m <span id="runStatus">Engel yaklaşıyor…</span></div>
 <div class="ground"></div>
 <div id="runner" class="runner human"><i class="head"></i><i class="body"></i><i class="leg left"></i><i class="leg right"></i><i class="arm"></i></div>
 <div id="runObstacle" class="obstacle ${s.action === 'duck' ? 'high' : ''}" aria-label="${s.action === 'duck' ? 'Eğilme engeli' : 'Zıplama engeli'}"><span>${s.action === 'duck' ? '↓' : '↑'}</span></div>
 <div id="runFeedback" class="run-feedback" role="status"></div></div>
 <div class="card section" id="runQuestion" hidden><div class="top"><h2>${s.action === 'duck' ? 'Eğilmek' : 'Zıplamak'} için cevapla!</h2><span class="timer" id="gateTime"></span></div><h2>${escape(x.front)}</h2><div id="gateAnswer"></div></div>`;
 exitBind();
 const scene = $('runnerScene'), obstacle = $('runObstacle'), character = $('runner');
 let phase = 'approach', elapsed = 0, last = performance.now(), deadline = 0;
 const approachDuration = {easy:3000, normal:2400, hard:1800}[s.difficulty] || 2400;
 const active = () => page === 'play' && session === s && $('runnerScene') === scene;
 const placeObstacle = progress => {
   const start = scene.clientWidth - 60, stop = scene.clientWidth * .15 + 65;
   obstacle.style.left = `${start + (stop-start)*progress}px`;
 };
 function ask() {
   phase = 'question'; scene.classList.add('waiting');
   $('runStatus').textContent = 'Engelin önündesin · 10 saniye';
   $('runQuestion').hidden = false; $('gateAnswer').innerHTML = answerMarkup(x);
   deadline = performance.now() + 10000; $('gateTime').textContent = '10 sn';
   bindAnswer(x, value => resolve(equal(value, x.back)));
 }
 function resolve(ok) {
   if (!active() || phase !== 'question') return;
   // A click received after the deadline must count as a timeout.
   ok = ok && performance.now() < deadline;
   phase = ok ? 'pass' : 'crash'; elapsed = 0;
   record(x, ok);
   $('gateTime').textContent = ok ? 'Doğru!' : 'Yanlış / süre doldu';
   $('gateAnswer').innerHTML = `<p class="${ok ? 'good' : 'bad'}">${ok ? '✓ Devam!' : '✕ Doğru cevap: '+escape(x.back)}</p>`;
   $('runFeedback').textContent = ok ? '✓' : '✕';
   $('runFeedback').className = 'run-feedback '+(ok ? 'good' : 'bad');
   scene.classList.remove('waiting');
   if (ok) {s.score++; s.distance += 100; character.classList.add(s.action)}
   else {s.lives--; $('runStatus').textContent = 'Çarpışma!'}
 }
 placeObstacle(0);
 setTimer(setInterval(() => {
   if (!active()) {clearInterval(tick); return}
   const now = performance.now(), delta = now-last; last = now;
   if (phase === 'approach') {
     elapsed += delta; const progress = Math.min(1, elapsed/approachDuration); placeObstacle(progress);
     if (progress === 1) ask();
   } else if (phase === 'question') {
     placeObstacle(1);
     $('gateTime').textContent = Math.max(0, Math.ceil((deadline-now)/1000))+' sn';
     if (now >= deadline) resolve(false);
   } else {
     elapsed += delta;
     const stop = scene.clientWidth*.15+65;
     if (phase === 'pass') {
       obstacle.style.left = `${stop-(stop+65)*Math.min(1,elapsed/850)}px`;
       if (elapsed >= 850) character.classList.remove('jump','duck');
     } else {
       obstacle.style.left = `${stop-52*Math.min(1,elapsed/220)}px`;
       if (elapsed >= 220) character.classList.add('crash');
       if (elapsed >= 700) {character.classList.remove('crash'); character.classList.add('respawning'); obstacle.style.opacity = '0'}
     }
     if (elapsed >= 1500) {clearInterval(tick); s.i++; s.action = s.action === 'jump' ? 'duck' : 'jump'; runner()}
   }
 }, 30));
 const tick = timer;
}
