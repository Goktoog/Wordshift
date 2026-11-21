// Yanlış bildiğim içerikler: her modda yanlış, boş veya "bilmiyorum" denen kelime/soru otomatik eklenir.
// Bir içerik MASTER_AFTER kez doğru bilinince listeden çıkar. Saf veri işlemleri: DOM veya ağ kullanmaz.
export const MASTER_AFTER = 10, MAX_ITEMS = 500;
const FIELDS = ['id','type','level','front','back','extra','sourceQuestion','questionNumber','questionImage','passageImage','source'];
export const mistakeKey = x => x.id ? 'i:' + x.id : 't:' + (x.front + '|' + x.back).toLocaleLowerCase('tr').slice(0, 160);
function snapshot(x) {
  const out = {};
  for (const f of FIELDS) if (x[f] !== undefined && x[f] !== null) out[f] = typeof x[f] === 'string' ? x[f].slice(0, 600) : x[f];
  out.type ||= 'word';
  if (Array.isArray(x.options) && x.options.length <= 8) out.options = x.options.map(o => String(o).slice(0, 300));
  return out;
}
// ok: true doğru, false yanlış, null boş/bilmiyorum. countGood=false: doğru cevap sayılmaz (kartlar gibi).
// Dönüş: 'added' | 'updated' | 'good' | 'mastered' | null
export function noteMistake(user, x, ok, countGood = true) {
  if (!user || !x || typeof x.front !== 'string' || !x.front || typeof x.back !== 'string') return null;
  const list = user.mistakes ||= {}, key = mistakeKey(x), entry = list[key];
  if (ok === true) {
    if (!entry || !countGood) return null;
    entry.good = (entry.good || 0) + 1;
    if (entry.good >= MASTER_AFTER) { delete list[key]; return 'mastered'; }
    return 'good';
  }
  if (entry) { entry.wrong = (entry.wrong || 0) + 1; entry.last = Date.now(); return 'updated'; }
  list[key] = { item: snapshot(x), wrong: 1, good: 0, last: Date.now() };
  const keys = Object.keys(list);
  if (keys.length > MAX_ITEMS) for (const k of keys.sort((a, b) => list[a].last - list[b].last).slice(0, keys.length - MAX_ITEMS)) delete list[k];
  return 'added';
}
export const removeMistake = (user, key) => { if (user?.mistakes) delete user.mistakes[key]; };
export const mistakeEntries = user => Object.entries(user?.mistakes || {}).map(([key, e]) => ({key, ...e})).sort((a, b) => (b.last || 0) - (a.last || 0));
// Çalışma modlarına verilebilen sanal set (başlangıç setleri gibi herkese açık kaynak sayılır).
export const mistakeSet = user => ({id: 'mistakes', name: 'Yanlış bildiklerim', description: '', items: mistakeEntries(user).map(e => ({...e.item})), publicSource: true, ownerId: 'me', mistakes: true});
