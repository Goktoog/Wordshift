import { starterSets } from './starters.js';
import { levels, shuffle } from '../core/utils.js';
import { allItems } from '../core/state.js';
import { itemProgress } from './progress.js';

// Bir seviyeyi "geçmiş" saymak için o seviyeden öğrenilmesi gereken içerik sayısı.
export const NEED = { A1: 8, A2: 10, B1: 12, B2: 14, C1: 16, C2: 18 };
export const isMastered = p => (p.attempts || 0) >= 2 && (p.correct || 0) / p.attempts >= 0.75;
export const today = () => new Date().toISOString().slice(0, 10);

// Kullanıcının kendi setleri + hazır setler; her öğe için kişisel ilerleme dahil.
export function masteredByLevel(user) {
  const counts = Object.fromEntries(levels.map(l => [l, 0]));
  const seen = new Set();
  const count = (set, item) => {
    if (!counts.hasOwnProperty(item.level) || seen.has(item.id)) return;
    if (isMastered(itemProgress(user, set, item))) { seen.add(item.id); counts[item.level]++; }
  };
  for (const s of user.sets) for (const x of s.items) count(s, x);
  for (const s of starterSets) for (const x of s.items) count(s, x);
  return counts;
}

// Seviye = sınavın verdiği taban ile çalışma kanıtından gelen seviyenin yükseği.
export function computeLevel(user, counts = masteredByLevel(user)) {
  let best = 'A1';
  for (const l of levels) if (counts[l] >= NEED[l]) best = l;
  const floor = user.placement?.level || 'A1';
  return levels.indexOf(floor) > levels.indexOf(best) ? floor : best;
}

// Son 14 günde günlük ortalama kaç yeni içerik öğrenildi?
export function dailyRate(user) {
  const log = user.masteryLog || {};
  const since = Date.now() - 14 * 86400000;
  const days = Object.entries(log).filter(([d]) => new Date(d).getTime() >= since);
  if (!days.length) return 0;
  return days.reduce((a, [, n]) => a + n, 0) / days.length;
}

export function levelProgress(user) {
  const counts = masteredByLevel(user), level = computeLevel(user, counts);
  const i = levels.indexOf(level), next = levels[i + 1] || null;
  if (!next) return { level, next: null, counts, pct: 100, have: counts[level], need: NEED[level], remaining: 0, eta: null };
  // Sonraki seviyeye geçiş: o seviyeden NEED kadar içerik öğrenmek.
  const have = Math.min(counts[next], NEED[next]), need = NEED[next];
  const rate = dailyRate(user), remaining = need - have;
  return { level, next, counts, pct: Math.round(have / need * 100), have, need, remaining, eta: rate > 0 ? Math.ceil(remaining / rate) : null };
}

// Öğrenme anını yakala: updateProgress'ten önce/sonra "öğrenildi" durumu değişti mi?
export function logMastery(user) {
  user.masteryLog ||= {};
  const d = today();
  user.masteryLog[d] = (user.masteryLog[d] || 0) + 1;
  const keys = Object.keys(user.masteryLog).sort();
  for (const k of keys.slice(0, Math.max(0, keys.length - 60))) delete user.masteryLog[k];
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
