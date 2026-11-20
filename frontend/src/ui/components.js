import { $, escape } from '../core/utils.js';

export function avatar(u,small=false){return '<span class="avatar '+(small?'small':'')+'">'+(u.avatar?'<img alt="Profil" src="'+escape(u.avatar)+'">':escape(u.name.slice(0,1).toUpperCase()))+'</span>'}
export function tile(icon,title,desc,action){return '<button class="tile" data-action="'+action+'"><span class="ico">'+icon+'</span><strong>'+title+'</strong><span class="muted">'+desc+'</span></button>'}export function bindActions(fn){$('view').querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>fn(b.dataset.action))}
