import { escape } from '../core/utils.js';

export const NAME_ANIMS = [['none', 'Yok'], ['wiggle', 'Wiggle'], ['jump', 'Zıpla'], ['expand', 'Açıl / kapan'], ['pulse', 'Parlama nabzı']];
export const NAME_GLOWS = [[0, 'Kapalı'], [1, 'Hafif'], [2, 'Güçlü']];
export const NAME_SWATCHES = ['#c1fa6b', '#ffd166', '#ff7a90', '#ff9f43', '#4aa3ff', '#b388ff', '#5ee6d0', '#ffffff'];

// Sunucuyla aynı kurallar: renk #rrggbb, glow 0-2, animasyon listedeki değerlerden biri.
export function cleanNameStyle(s = {}) {
  const color = /^#[0-9a-f]{6}$/i.test(s?.color || '') ? s.color.toLowerCase() : '';
  const glow = [1, 2].includes(Number(s?.glow)) ? Number(s.glow) : 0;
  const anim = NAME_ANIMS.some(([v]) => v === s?.anim && v !== 'none') ? s.anim : 'none';
  return { color, glow, anim };
}

// İsmi stilli HTML olarak döndürür. Wiggle ve zıplama harf harf dalga olarak çalışır.
export function styledName(name, style) {
  const st = cleanNameStyle(style), text = String(name ?? '');
  if (!st.color && !st.glow && st.anim === 'none') return escape(text);
  const vars = (st.color ? '--nm:' + st.color + ';' : '') + (st.glow ? '--nm-glow:' + st.glow + ';' : '');
  const classes = 'nm' + (st.color ? ' nm-color' : '') + (st.glow ? ' nm-glow-' + st.glow : '') + (st.anim !== 'none' ? ' nm-' + st.anim : '');
  const perLetter = st.anim === 'wiggle' || st.anim === 'jump';
  const inner = perLetter
    ? Array.from(text).map((ch, i) => ch === ' ' ? ' ' : '<span class="nm-l" style="animation-delay:' + (i * 0.09).toFixed(2) + 's" aria-hidden="true">' + escape(ch) + '</span>').join('')
    : escape(text);
  return '<span class="' + classes + '" style="' + vars + '" aria-label="' + escape(text) + '">' + inner + '</span>';
}

const CROWN = '<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><path d="M3 8l4.5 4L12 4l4.5 8L21 8l-2 11H5L3 8Z" fill="currentColor"/></svg>';
export const adminBadge = () => '<span class="badge-admin" title="Wordshift yöneticisi"><i class="shine" aria-hidden="true"></i>' + CROWN + '<b>ADMIN</b></span>';
