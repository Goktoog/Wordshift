import { starterSets } from '../data/starter-sets.js';
import { levels, shuffle } from '../core/utils.js';
import { progressKey } from './progress.js';

const COVERAGE = 0.75;
export const levelIndex = level => Math.max(0, levels.indexOf(level));
export const computeLevel = user => levels[Math.max(...[user.level, user.evidenceLevel, user.placement?.level].map(levelIndex))];
const normalize = text => String(text || '').trim().toLowerCase().replace(/\s+/g, ' ');
const localDay = date => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000;
const catalogs = new Map();

function catalog(level) {
  if (catalogs.has(level)) return catalogs.get(level);
  const set = starterSets.find(s => s.id === 'starter-' + level.toLowerCase());
  const words = new Map(), ids = new Map();
  for (const item of set?.items || []) {
    if (item.type !== 'word') continue;
    const key = normalize(item.front);
    if (!words.has(key)) words.set(key, item.id);
    ids.set(item.id, words.get(key));
  }
  const result = {set, words, ids};
  catalogs.set(level, result);
  return result;
}

// Older progress contains counts but no dates. Import each eligible word as a
// single exposure so a correct recall on a later day can complete it.
function mastery(user, today) {
  if (user.wordMastery) return user.wordMastery;
  const all = user.wordMastery = {};
  for (const level of levels) {
    const {set, ids} = catalog(level);
    if (!set) continue;
    const prior = user.studyProgress?.[progressKey(set)] || {};
    const log = user.promotion?.level === level ? user.promotion.attempts : user.levelLog?.[level];
    const latest = new Map((log || []).filter(entry => ids.has(entry[0])).map(entry => [entry[0], entry]));
    for (const [id, canonical] of ids) {
      const entry = latest.get(id);
      if (prior[id]?.needsReview || (entry && !entry[1])) continue;
      if (!prior[id]?.correct && !entry?.[1]) continue;
      const group = all[level] ||= {};
      const row = group[canonical] ||= {day:today, known:false, checked:false};
      if (entry?.[2] === 'checked') row.checked = true;
    }
  }
  return all;
}
export function initializeMastery(user, date = new Date()) {
  if (user.wordMastery) return false;
  mastery(user, localDay(date));
  return true;
}

export function levelProgress(user, date = new Date()) {
  const level = computeLevel(user), next = levels[levelIndex(level) + 1];
  const {words} = catalog(level);
  const group = mastery(user, localDay(date))[level] || {};
  let learned = 0, verified = 0, pending = 0;
  for (const id of words.values()) {
    const word = group[id];
    if (!word) continue;
    if (!word.known) { pending++; continue; }
    learned++;
    if (word.checked) verified++;
  }
  const total = words.size, required = Math.ceil(total * COVERAGE);
  const needVerified = levelIndex(level) >= levelIndex('B2') ? Math.min(6, required) : 0;
  return {level, next, total, required, learned, verified, pending, needVerified,
    coverage:total ? Math.floor(100 * learned / total) : 0};
}
export function logAnswer(user, item, ok, source = 'checked', date = new Date()) {
  if (item?.type !== 'word' || !levels.includes(item.level)) return null;
  const id = catalog(item.level).words.get(normalize(item.front));
  if (!id) return null;
  const today = localDay(date);
  const group = mastery(user, today)[item.level] ||= {};
  if (!ok) { delete group[id]; return null; }
  const old = group[id];
  const known = Boolean(old && (old.known || today > old.day));
  group[id] = {day:Math.max(old?.day ?? today, today), known, checked:source === 'checked' || Boolean(old?.checked)};
  if (item.level !== computeLevel(user) || !known) return null;
  const p = levelProgress(user, date);
  if (!p.next || !p.required || p.learned < p.required || p.verified < p.needVerified) return null;
  user.evidenceLevel = p.next;
  user.level = p.next;
  return {from:p.level, to:p.next};
}

export const PER_LEVEL=6,PASS=5;
export function buildPlacementQuestions() {
  const words = starterSets.flatMap(s => s.items.filter(x => x.type === 'word'));
  const byLevel = Object.fromEntries(levels.map(l => [l, words.filter(w => w.level === l)]));
  const out = {};
  for (const l of levels) {
    const pool = [...new Map(byLevel[l].map(w=>[w.front.trim().toLowerCase(),w])).values()];
    if (pool.length < PER_LEVEL + 3) continue;
    out[l] = shuffle(pool).slice(0, PER_LEVEL).map(w => {
      const wrong = shuffle([...new Set(pool.filter(o => o.front !== w.front && o.back !== w.back).map(o=>o.back))]).slice(0,3);
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
