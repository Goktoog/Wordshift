import { $, escape, levels } from '../core/utils.js';
import { user, save } from '../core/state.js';
import { modal } from '../ui/modal.js';
import { header } from '../ui/header.js';
import { toast } from '../ui/feedback.js';
import { buildPlacementQuestions, placementResult, computeLevel, PER_LEVEL, PASS } from './level.js';

export function openPlacement(onDone) {
  const qs = buildPlacementQuestions(), active = levels.filter(l => qs[l]);
  const actions = document.querySelector('#dialog .dialog-actions');
  modal('', () => false);
  actions.hidden = true;
  const restore = () => { actions.hidden = false; $('dialog').removeEventListener('close', restore); };
  $('dialog').addEventListener('close', restore);
  const close = () => $('dialog').close();
  const body = h => { $('modalBody').innerHTML = h; };

  const intro = () => {
    body(`<h2>Seviye belirleme sınavı</h2><p class="muted">A1'den başlayarak her seviyeden ${PER_LEVEL} kelime sorusu gelir. Bir seviyede en az ${PASS} doğru yaparsan bir üst seviyeye geçersin; yapamazsan sınav biter ve seviyen belirlenir. Bu resmi bir CEFR sonucu değil, yaklaşık bir tahmindir.</p><div class="actions"><button type="button" id="plStart" class="primary">Başla</button><button type="button" id="plCancel">Vazgeç</button></div>`);
    $('plStart').onclick = () => run(0, 0, {});
    $('plCancel').onclick = close;
  };

  const run = (li, qi, results) => {
    const l = active[li];
    if (!l) return finish(results);
    const { w, options } = qs[l][qi];
    body(`<p class="eyebrow">SEVİYE ${escape(l)} · SORU ${qi + 1}/${PER_LEVEL}</p><div class="progress"><i style="width:${Math.round((li * PER_LEVEL + qi) / (active.length * PER_LEVEL) * 100)}%"></i></div><h2>${escape(w.front)}</h2><div class="choices">${options.map((o, i) => `<button type="button" data-i="${i}">${escape(o)}</button>`).join('')}</div><button type="button" id="plSkip" class="section">Bilmiyorum →</button>`);
    const answer = ok => {
      (results[l] ||= []).push(ok);
      if (qi + 1 < PER_LEVEL) return run(li, qi + 1, results);
      if (results[l].filter(Boolean).length >= PASS) return run(li + 1, 0, results);
      finish(results);
    };
    $('modalBody').querySelectorAll('[data-i]').forEach(b => b.onclick = () => answer(options[b.dataset.i] === w.back));
    $('plSkip').onclick = () => answer(false);
  };

  const finish = results => {
    const level = placementResult(results);
    const before = user.level;
    user.placement = { level, date: new Date().toISOString().slice(0, 10), scores: Object.fromEntries(Object.entries(results).map(([k, v]) => [k, v.filter(Boolean).length])) };
    user.level = computeLevel(user);
    save(); header();
    const rows = Object.entries(results).map(([k, v]) => `<div class="row"><strong>${escape(k)}</strong><span>${v.filter(Boolean).length}/${PER_LEVEL}</span></div>`).join('');
    body(`<h2>Tahmini seviyen: ${escape(user.level)}</h2><p class="muted">${before !== user.level ? `Seviyen ${escape(before)} → ${escape(user.level)} olarak güncellendi.` : 'Seviyen değişmedi.'}</p>${rows}<div class="actions"><button type="button" id="plDone" class="primary">Tamam</button></div>`);
    $('plDone').onclick = () => { close(); toast('Seviyen güncellendi.'); onDone?.(); };
  };
  intro();
}
