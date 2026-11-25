import { $, escape } from '../core/utils.js';
import { user, page } from '../core/state.js';
export function header(){
 $('miniName').textContent=user.name;$('miniLevel').textContent=user.level;
 $('miniAvatar').innerHTML=user.avatar?'<img alt="" src="'+escape(user.avatar)+'">':escape(user.name[0]?.toUpperCase());
 document.querySelectorAll('.nav[data-page]').forEach(b=>b.classList.toggle('active',(b.dataset.page===page||(b.dataset.page==='games'&&page==='online'))));
 $('pageLabel').textContent=({home:'GENEL BAKIŞ',sets:'BENİM SETLERİM',explore:'KEŞFET',starter:'Başlangıç seti',shared:'TOPLULUK SETİ',user:'KULLANICI PROFİLİ',detail:'ÇALIŞMA SETİ',games:'OYUNLAR',online:'ÇEVRİMİÇİ OYUN',leaderboard:'LİDERLİK',mistakes:'YANLIŞLARIM',profile:'PROFİL',study:'ÇALIŞMA',play:'OYUN'}[page]||page);
 if(user.guest)$('cloudStatus').innerHTML='Misafir modu · Çalışmaların kaydedilmez. <button id="guestJoin">Giriş yap / Üye ol</button>';
 if($('guestJoin'))$('guestJoin').onclick=()=>$('logout').click();
}
