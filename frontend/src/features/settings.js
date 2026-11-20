import { $ } from '../core/utils.js';
import { toast, sound } from '../ui/feedback.js';

function theme(){const t=localStorage.getItem('wordshift-theme')||'dark';document.body.dataset.theme=t;$('theme').textContent=t==='dark'?'☀':'☾'}
export function initSettings(){theme();$('theme').onclick=()=>{localStorage.setItem('wordshift-theme',document.body.dataset.theme==='dark'?'light':'dark');theme()};}