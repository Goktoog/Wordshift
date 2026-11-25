import { $ } from '../core/utils.js';
import { user } from '../core/state.js';

export function applyTheme(theme = localStorage.getItem('wordshift-theme') || 'dark') {
  document.body.dataset.theme = theme;
  $('theme').textContent = theme === 'dark' ? '☀' : '☾';
}

export function initSettings() {
  applyTheme();
  $('theme').onclick = () => {
    const next = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
    if (!user?.guest) localStorage.setItem('wordshift-theme', next);
    applyTheme(next);
  };
}
