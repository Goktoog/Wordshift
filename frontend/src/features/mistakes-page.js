import { $, escape } from '../core/utils.js';
import { user, save } from '../core/state.js';
import { go } from '../core/router.js';
import { begin } from './session.js';
import { MASTER_AFTER, mistakeEntries, mistakeSet, removeMistake } from './mistakes.js';
const PAGE = 50;
export function mistakesPage() {
  const entries = mistakeEntries(user);
  $('view').innerHTML = `<p class="eyebrow">TEKRAR LİSTEM</p><h1>Yanlış bildiklerim</h1><p class="muted">Tüm modlarda (çalışma, oyunlar ve çevrimiçi maçlar) yanlış yaptığın, boş bıraktığın veya “bilmiyorum” dediğin kelime ve sorular otomatik buraya eklenir. Bir içeriği ${MASTER_AFTER} kez doğru bildiğinde listeden çıkar.</p>`
    + (entries.length
      ? `<div class="actions"><button class="primary" data-mistake-mode="learn">Öğren</button><button data-mistake-mode="test">Test</button><button data-mistake-mode="cards">Kartlar</button></div><p class="muted" role="status">${entries.length} içerik listede.</p><div id="mistakeRows"></div><button id="mistakeMore" hidden>Daha fazla göster</button>`
      : '<div class="card"><p>Listen şu an boş. Yanlış yaptığın kelimeler burada görünecek.</p></div>');
  if (!entries.length) return;
  let shown = 0;
  const rows = $('mistakeRows'), more = $('mistakeMore');
  function draw() {
    for (const e of entries.slice(shown, shown + PAGE)) {
      const row = document.createElement('div');
      row.className = 'card row mistake-row';
      const answer = e.item.sourceQuestion ? 'Kaynak soru' : e.item.back;
      row.innerHTML = `<div><strong>${escape(e.item.front)}</strong><p class="muted">${escape(answer)} · ${escape(e.item.level || '')} · ${e.wrong} yanlış · ${e.good || 0}/${MASTER_AFTER} doğru</p></div><button type="button">Listeden kaldır</button>`;
      row.querySelector('button').onclick = () => { removeMistake(user, e.key); save(); mistakesPage(); };
      rows.append(row);
    }
    shown = Math.min(entries.length, shown + PAGE); more.hidden = shown >= entries.length;
  }
  more.onclick = draw; draw();
  $('view').querySelectorAll('[data-mistake-mode]').forEach(b => b.onclick = () => begin(b.dataset.mistakeMode, mistakeSet(user), 'normal', false, {limit: 20}));
}
