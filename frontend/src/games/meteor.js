import { $, escape } from '../core/utils.js';
import { session, timer } from '../core/state.js';
import { record, opts, finish, topStudy, exitBind, equal } from '../features/session.js';
import { toast } from '../ui/feedback.js';
import { turnTimer, timerMarkup } from './turn-timer.js';

const ROCKET = '<svg viewBox="0 0 40 70" width="40" height="70" aria-hidden="true"><path d="M20 2C28 14 30 30 28 48H12C10 30 12 14 20 2Z" fill="#e8ecf5"/><circle cx="20" cy="24" r="5" fill="#4aa3ff"/><path d="M12 40 2 58l10-6Zm16 0 10 18-10-6Z" fill="#ed986f"/><rect x="14" y="48" width="12" height="6" fill="#8a93a8"/></svg>';
const MISSILE = '<svg viewBox="0 0 14 30" width="14" height="30" aria-hidden="true"><path d="M7 0C11 6 12 14 11 24H3C2 14 3 6 7 0Z" fill="#f2f4fa"/><path d="M3 18 0 26l3-2Zm8 0 3 8-3-2Z" fill="#ed986f"/></svg><i class="flame"></i>';

// Meteor avı: roket yerinde sabit durur, sadece fareyi yönsel olarak takip eder.
// Ateşte dumanlı bir füze seçilen meteora gider, patlar; doğruysa ekranda tik çıkar. Her soru 10 saniye.
export function meteor() {
  const s = session;
  if (s.i >= s.pool.length) { finish(); return; }
  const x = s.pool[s.i], o = opts(x), deadline=Date.now()+10000;
  $('view').innerHTML = topStudy('Meteor avı') + '<div class="card"><h2>' + escape(x.front) + '</h2>' + timerMarkup() +
    '<div class="space solo-meteor"><strong class="solo-target">' + escape(x.front) + '</strong><div class="rocket-wrap" id="rocket">' + ROCKET + '</div>' +
    o.map((v, i) => '<button class="meteor" data-meteor="' + i + '" style="left:' + (i % 2 ? 53 : 4) + '%;top:' + (25 + Math.floor(i / 2) * 105) + 'px">☄ ' + escape(v) + '</button>').join('') +
    '</div></div>';
  exitBind();
  s.firing = false;
  const arena = $('view').querySelector('.space'), rocket = $('rocket');
  const base = () => ({ x: arena.clientWidth / 2, y: arena.clientHeight - 66 });
  const angleTo = (tx, ty) => { const b = base(); return Math.max(-85, Math.min(85, Math.atan2(tx - b.x, b.y - ty) * 180 / Math.PI)); };
  const aim = deg => { rocket.style.transform = 'rotate(' + deg + 'deg)'; };
  const alive = () => session === s && arena.isConnected;

  // Fare yalnızca yönü belirler; roket konumu değişmez.
  arena.onpointermove = e => { if (s.firing) return; const r = arena.getBoundingClientRect(); aim(angleTo(e.clientX - r.left, e.clientY - r.top)); };

  const next = delay => setTimeout(() => { if (!alive()) return; s.i++; meteor(); }, delay);
  const burst = (px, py) => { const b = document.createElement('div'); b.className = 'boom'; b.style.left = px + 'px'; b.style.top = py + 'px'; arena.append(b); };

  function resolve(ok, chosen, target) {
    record(x, ok);
    if (ok) s.score++;
    else {
      toast('Doğru: ' + x.back);
      // Show which meteor was right and leave it up long enough to read.
      $('view').querySelectorAll('[data-meteor]').forEach(m => { if (equal(o[+m.dataset.meteor], x.back)) m.classList.add('reveal'); });
      arena.insertAdjacentHTML('afterend', '<p class="feedback bad answer-reveal" role="status">✕ Doğru cevap: ' + escape(x.back) + '</p>');
    }
    if (chosen) { chosen.textContent = ok ? '✓' : '✕'; chosen.classList.add('exploded'); }
    if (target) {burst(target.x, target.y);const view=$('view');view.classList.add('impact-shake');setTimeout(()=>view.classList.remove('impact-shake'),400);}
    if (ok) { const t = document.createElement('div'); t.className = 'big-tick'; t.textContent = '✓'; arena.append(t); }
    next(ok ? 900 : 3800);
  }

  $('view').querySelectorAll('[data-meteor]').forEach(b => b.onclick = () => {
    if (s.firing) return;
    if(Date.now()>=deadline){s.firing=true;clearInterval(timer);resolve(false,null,null);return}
    s.firing = true; clearInterval(timer);
    arena.classList.add('firing');
    const a = arena.getBoundingClientRect(), r = b.getBoundingClientRect(), from = base();
    const tx = r.left - a.left + r.width / 2, ty = r.top - a.top + r.height / 2, deg = angleTo(tx, ty);
    aim(deg);
    const m = document.createElement('div'); m.className = 'missile'; m.innerHTML = MISSILE; m.style.transform = 'rotate(' + deg + 'deg)'; arena.append(m);
    const t0 = performance.now(), dur = 600; let lastPuff = 0, n = 0;
    const step = now => {
      if (!alive()) return;
      const k = Math.min(1, (now - t0) / dur), px = from.x + (tx - from.x) * k, py = from.y + (ty - from.y) * k;
      m.style.left = px + 'px'; m.style.top = py + 'px';
      if (now - lastPuff > 35) { lastPuff = now; const p = document.createElement('i'); p.className = 'puff ' + (n++ % 3 ? 'smoke' : 'fire'); p.style.left = px + 'px'; p.style.top = py + 'px'; arena.append(p); setTimeout(() => p.remove(), 750); }
      if (k < 1) requestAnimationFrame(step); else { m.remove(); resolve(equal(o[+b.dataset.meteor], x.back), b, { x: tx, y: ty }); }
    };
    requestAnimationFrame(step);
  });

  turnTimer(s, 10, () => {
    if (!alive() || s.firing) return;
    s.firing = true; arena.classList.add('firing');
    toast('Süre doldu.'); resolve(false, null, null);
  });
}
