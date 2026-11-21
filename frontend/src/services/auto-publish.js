import { publishSet } from './community.js';
// Sets marked visibility:'public' are kept in sync with Keşfet automatically.
// Only the fields that are actually published are compared, so study progress never triggers a re-publish.
const published = new Map();
let timer = null;
const fingerprint = set => JSON.stringify([set.name, set.items.map(x => [x.id, x.type, x.front, x.back, x.extra, x.level, x.options])]);
export const markPublished = set => published.set(set.id, fingerprint(set));
export const markPrivate = set => published.delete(set.id);
function say(message) { const el = document.getElementById('cloudStatus'); if (el) el.textContent = message; }
export function scheduleAutoPublish(user) {
  clearTimeout(timer);
  if (!user || user.guest) return;
  timer = setTimeout(async () => {
    for (const set of user.sets) {
      if (set.visibility !== 'public' || !set.items.length || set.items.length > 500 || set.starterSource) continue;
      if (set.items.some(x => x.questionImage)) continue;
      const print = fingerprint(set);
      if (published.get(set.id) === print) continue;
      try { await publishSet(set); published.set(set.id, print); say('✓ “' + set.name + '” Keşfet’te yayında.'); }
      catch (e) { say('“' + set.name + '” yayınlanamadı: ' + e.message); }
    }
  }, 1500);
}
