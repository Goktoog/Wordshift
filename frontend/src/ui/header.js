import { $, escape } from '../core/utils.js';
import { user, page } from '../core/state.js';
import { go } from '../core/router.js';

export function header(){ $('miniName').textContent=user.name;$('miniLevel').textContent=user.level;$('miniAvatar').innerHTML=user.avatar?'<img alt="" src="'+escape(user.avatar)+'">':escape(user.name[0]?.toUpperCase());$('folderNav').innerHTML=user.folders.map(f=>'<button class="nav" data-folder="'+escape(f.id)+'">▰ <span>'+escape(f.name)+'</span></button>').join('');$('folderNav').querySelectorAll('button').forEach(b=>b.onclick=()=>go('sets',b.dataset.folder));$('pageLabel').textContent=({home:'GENEL BAKIŞ',sets:'SETLER',detail:'ÇALIŞMA SETİ',games:'OYUNLAR',leaderboard:'LİDERLİK',profile:'PROFİL',study:'ÇALIŞMA',play:'OYUN'}[page]||page).toUpperCase()}
