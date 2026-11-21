import { $, escape } from '../core/utils.js';
import { user } from '../core/state.js';
import { go } from '../core/router.js';
export function leaderboard(){
 $('view').innerHTML=`<p class="eyebrow">İLERLEME</p><h1>Liderlik tablosu</h1><p class="muted">Global ve şehir sıralaması henüz açık değil. Burada kendi ilerlemeni görebilirsin.</p><div class="card"><h2>${escape(user.name)}</h2><p>${user.xp} XP · ${escape(user.level)}</p><p>${user.stats.correct} doğru / ${user.stats.total} cevap</p><button id="myProgress">Profilime git</button></div>`;
 $('myProgress').onclick=()=>go('profile');
}
