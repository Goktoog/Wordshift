import { $, escape } from '../core/utils.js';
import { user, page } from '../core/state.js';
import { go, folderFilter } from '../core/router.js';
export function header(){
 $('miniName').textContent=user.name;$('miniLevel').textContent=user.level;
 $('miniAvatar').innerHTML=user.avatar?'<img alt="" src="'+escape(user.avatar)+'">':escape(user.name[0]?.toUpperCase());
 $('folderNav').innerHTML=user.folders.map(f=>`<button class="nav ${page==='sets'&&folderFilter===f.id?'active':''}" data-folder="${escape(f.id)}">▰ <span>${escape(f.name)}</span></button>`).join('');
 $('folderNav').querySelectorAll('button').forEach(b=>b.onclick=()=>go('sets',b.dataset.folder));
 document.querySelectorAll('.nav[data-page]').forEach(b=>b.classList.toggle('active',(b.dataset.page===page||(b.dataset.page==='games'&&page==='online'))&&!(page==='sets'&&folderFilter)));
 $('pageLabel').textContent=page==='sets'&&folderFilter?(user.folders.find(f=>f.id===folderFilter)?.name||'KLASÖR'):({home:'GENEL BAKIŞ',sets:'BENİM SETLERİM',explore:'KEŞFET',starter:'Başlangıç seti',shared:'TOPLULUK SETİ',user:'KULLANICI PROFİLİ',detail:'ÇALIŞMA SETİ',games:'OYUNLAR',online:'ÇEVRİMİÇİ OYUN',leaderboard:'LİDERLİK',profile:'PROFİL',study:'ÇALIŞMA',play:'OYUN'}[page]||page);
 if(user.guest)$('cloudStatus').innerHTML='Misafir modu · Çalışmaların bu tarayıcıda saklanır. <button id="guestJoin">Giriş yap / Üye ol</button>';
 if($('guestJoin'))$('guestJoin').onclick=()=>$('logout').click();
}
