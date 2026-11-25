import { tile } from '../ui/components.js';

const games = [
  ['runner', '🏃', 'Word Runner', 'Engelleri aş, doğru cevabı yetiştir'],
  ['battle', '⚓', 'Amiral Battı', 'Kelimeyi bil, botun gemisini vur'],
  ['blocks', '▦', 'Kelime blokları', 'İngilizce ve Türkçe blokları eşleştir'],
  ['meteor', '🚀', 'Meteor avı', 'Doğru karşılığı vur'],
  ['sentences', '▤', 'Cümle Düellosu', 'Seviyeye uygun hazır cümleleri kur'],
  ['tower', '🧊', 'Kelime Kulesi', 'Doğru platformu seç, bir kat yukarı zıpla'],
  ['detective', '🔎', 'Kelime Dedektifi', 'Türkçe ipucundan İngilizce kelimeyi harf harf çöz'],
  ['crossing', '🐔', 'Kelime Geçidi', 'Doğru cevabı bul, tavuğu karşıya geçir'],
];

export const gameModes = games.map(([mode]) => mode);
export const gameTiles = () => games.map(([mode, icon, title, description]) =>
  tile(icon, title, description, mode)
).join('');
