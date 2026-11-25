// Çevrimiçi maçlarda verilen cevapları XP, seviye kanıtı ve "yanlış bildiklerim" listesine işler.
// Sunucu soruları yalnızca {front, back} olarak taşır; seviye/kimlik için içerik yerel setlerden bulunur.
import { sentences } from '../data/sentences.js';
import { starterSets } from './starters.js';
import { user, save } from '../core/state.js';
import { header } from '../ui/header.js';
import { toast } from '../ui/feedback.js';
import { escape } from '../core/utils.js';
import { logAnswer, computeLevel } from './level.js';
import { noteMistake } from './mistakes.js';
const norm = s => String(s || '').trim().toLocaleLowerCase('tr');
let staticIndex = null;
function index() {
  if (staticIndex) return staticIndex;
  staticIndex = new Map();
  for (const x of [...starterSets.flatMap(s => s.items.filter(i => i.type === 'word')), ...sentences]) {
    const k = norm(x.front); if (!staticIndex.has(k)) staticIndex.set(k, []); staticIndex.get(k).push(x);
  }
  return staticIndex;
}
export function findItem(front, back) {
  const k = norm(front), found = [...(index().get(k) || []), ...user.sets.flatMap(s => s.items.filter(x => x.type === 'word' && norm(x.front) === k))];
  if (!found.length) return null;
  if (back) return found.find(x => norm(x.back) === norm(back)) || null;
  return found.length === 1 ? found[0] : null;
}
// Aynı cevap iki kez sayılmasın (yeniden bağlanma, yenileme): son 80 anahtar hesapta saklanır.
export function creditOnline({room, round, kind, front, back = '', ok}) {
  if (!user || !room || !front) return false;
  const key = [room, round, kind, front].join('|');
  user.pvpSeen ||= [];
  if (user.pvpSeen.includes(key)) return false;
  user.pvpSeen.push(key); if (user.pvpSeen.length > 80) user.pvpSeen.splice(0, user.pvpSeen.length - 80);
  const item = findItem(front, back);
  user.stats.total++; user.stats.correct += ok ? 1 : 0; if (ok) user.xp += 10;
  const up = item ? logAnswer(user, item, ok) : null;
  user.level = computeLevel(user);
  if (item) noteMistake(user, item, ok);
  else if (back) noteMistake(user, {type: 'word', front, back}, ok);
  if (!ok) {
    const all = user.pvpMistakes ||= {}, list = all[room] ||= [];
    const found = item?.back || back;
    if (!list.some(w => norm(w.front) === norm(front))) list.push({front, back: found || ''});
    for (const old of Object.keys(all).slice(0, Math.max(0, Object.keys(all).length - 30))) delete all[old];
  }
  save(); header();
  if (up) toast('🎉 Seviye atladın: ' + up.from + ' → ' + up.to);
  return true;
}
// Bir maçta yanlış bildiğin kelimeler (maç geçmişinde ve maç sonu ekranında gösterilir).
export function wrongWordsMarkup(room) {
  const list = user?.pvpMistakes?.[room] || [];
  if (!list.length) return '';
  return '<div class="match-wrong"><h3>Bu maçta yanlış bildiğin kelimeler</h3><ul>' + list.map(w => '<li><strong>' + escape(w.front) + '</strong>' + (w.back ? ' → ' + escape(w.back) : '') + '</li>').join('') + '</ul><p class="muted">Bunlar “Yanlış bildiklerim” listene de eklendi.</p></div>';
}
