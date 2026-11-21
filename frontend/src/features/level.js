import { starterSets } from './starters.js';
import { levels, shuffle } from '../core/utils.js';

// ---- Seviye kanıtı: her seviyeden verilen cevaplar (kartlar hariç) ----
// Bir seviyedeki son WINDOW cevabın içinde en az MIN_ANSWERS cevap, en az MIN_DISTINCT farklı içerik
// ve en az PASS_RATE doğruluk varsa o seviye "geçilmiş" sayılır. Dört şıklı sorularda rastgele
// tahminle 30 sorudan 20+ doğru yapma ihtimali ihmal edilebilir düzeydedir.
export const EVIDENCE = { WINDOW: 100, MIN_ANSWERS: 30, MIN_DISTINCT: 15, PASS_RATE: 0.65, STRONG_RATE: 0.8 };
export const levelIndex = l => Math.max(0, levels.indexOf(l));
const higher = (a, b) => levelIndex(a) >= levelIndex(b) ? a : b;

// Bir cevabı seviye kanıtı olarak kaydet. Seviye atlandıysa { from, to } döner.
export function logAnswer(user, item, ok) {
  if (!item || !levels.includes(item.level)) return null;
  const from = computeLevel(user);
  user.levelLog ||= {};
  const log = user.levelLog[item.level] ||= [];
  log.push([item.id, ok ? 1 : 0]);
  if (log.length > EVIDENCE.WINDOW) log.splice(0, log.length - EVIDENCE.WINDOW);
  const reached = passedLevel(user);
  if (levelIndex(reached) > levelIndex(user.evidenceLevel || 'A1')) user.evidenceLevel = reached;
  const to = computeLevel(user);
  return levelIndex(to) > levelIndex(from) ? { from, to } : null;
}

export function levelEvidence(user, level) {
  const log = user.levelLog?.[level] || [];
  const correct = log.reduce((a, e) => a + e[1], 0);
  const distinct = new Set(log.map(e => e[0])).size;
  return { n: log.length, correct, distinct, rate: log.length ? correct / log.length : 0 };
}
export const passes = ev => ev.n >= EVIDENCE.MIN_ANSWERS && ev.distinct >= EVIDENCE.MIN_DISTINCT && ev.rate >= EVIDENCE.PASS_RATE;

// Kanıtı yeterli olan en yüksek seviye.
function passedLevel(user) {
  let best = 'A1';
  for (const l of levels) if (passes(levelEvidence(user, l))) best = l;
  return best;
}

// Seviye = sınavın verdiği taban, daha önce kazanılmış seviye ve güncel çalışma kanıtının yükseği.
// Seviye bir kez kazanılınca (evidenceLevel) kötü bir günle geri düşmez.
export function computeLevel(user) {
  return [user.placement?.level, user.evidenceLevel, passedLevel(user)].filter(Boolean).reduce(higher, 'A1');
}

export function levelProgress(user) {
  const level = computeLevel(user);
  const i = levelIndex(level), next = levels[i + 1] || null;
  const here = levelEvidence(user, level);
  if (!next) return { level, next: null, here, pct: 100 };
  const ev = levelEvidence(user, next);
  // Çubuk: yeterli sayıda cevap + yeterli doğruluk, ikisinin de yarısı kadar ağırlık.
  const pctAnswers = Math.min(1, ev.n / EVIDENCE.MIN_ANSWERS), pctRate = Math.min(1, ev.rate / EVIDENCE.PASS_RATE);
  const pct = Math.round((pctAnswers * .5 + (ev.n ? pctRate : 0) * .5) * 100);
  // Bu seviyeyi güçlü biliyorsa ve bir üstü henüz denenmediyse: "bir üstünü dene" önerisi.
  const suggest = here.n >= EVIDENCE.MIN_ANSWERS && here.rate >= EVIDENCE.STRONG_RATE && ev.n < EVIDENCE.MIN_ANSWERS;
  return { level, next, here, ev, pct, suggest, needAnswers: EVIDENCE.MIN_ANSWERS, needDistinct: EVIDENCE.MIN_DISTINCT, needRate: Math.round(EVIDENCE.PASS_RATE * 100) };
}

// ---- Seviye belirleme sınavı: A1'den başlar, her seviyede 5 soru, ≥4 doğruda sonraki seviyeye geçer ----
export const PER_LEVEL = 5, PASS = 4;
export function buildPlacementQuestions() {
  const words = starterSets.flatMap(s => s.items.filter(x => x.type === 'word'));
  const byLevel = Object.fromEntries(levels.map(l => [l, words.filter(w => w.level === l)]));
  const out = {};
  for (const l of levels) {
    const pool = byLevel[l];
    if (pool.length < PER_LEVEL + 3) continue;
    out[l] = shuffle(pool).slice(0, PER_LEVEL).map(w => {
      const wrong = shuffle(pool.filter(o => o.id !== w.id && o.back !== w.back)).slice(0, 3).map(o => o.back);
      return { w, options: shuffle([w.back, ...wrong]) };
    });
  }
  return out;
}

// results: { A1:[true,false,...], ... } -> ulaşılan seviye
export function placementResult(results) {
  let reached = null;
  for (const l of levels) {
    const r = results[l];
    if (!r || r.length < PER_LEVEL) break;
    if (r.filter(Boolean).length >= PASS) reached = l; else break;
  }
  return reached || 'A1';
}
