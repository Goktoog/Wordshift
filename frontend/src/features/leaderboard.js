import { $, escape } from '../core/utils.js';
import { user, page } from '../core/state.js';
import { go } from '../core/router.js';
import { avatar } from '../ui/components.js';
import { leaderboard as fetchBoard, myRank } from '../services/social.js';
let scope='global', request=0;
export function leaderboard(){
 $('view').innerHTML=`<p class="eyebrow">İLERLEME</p><h1>Liderlik tablosu</h1><p class="muted">Toplam XP'ye göre sıralanır. Hesabıyla giriş yapmış kullanıcılar listelenir.</p><div class="card"><h2>${escape(user.name)}</h2><p>${user.xp} XP · ${escape(user.level)}</p><p>${user.stats.correct} doğru / ${user.stats.total} cevap</p><button id="myProgress">Profilime git</button></div>
 <div class="actions social-tabs section"><button type="button" data-scope="global">Global</button><button type="button" data-scope="city">Şehir${user.city?' · '+escape(user.city):''}</button></div><p id="boardStatus" role="status"></p><p id="myRankLine" class="muted" role="status"></p><div id="boardRows"></div><button id="boardMore" hidden>Daha fazla göster</button>`;
 $('myProgress').onclick=()=>go('profile');
 const mine=++request,rows=$('boardRows'),status=$('boardStatus'),more=$('boardMore'),rankLine=$('myRankLine');
 let offset=0,busy=false,tab=0;
 const alive=t=>page==='leaderboard'&&mine===request&&$('boardRows')===rows&&(t===undefined||t===tab);
 async function load(t){
  if(busy)return;busy=true;more.disabled=true;
  try{
   const list=await fetchBoard(scope,user.city,offset);if(!alive(t))return;
   for(const r of list){
    const row=document.createElement('button');row.type='button';row.className='board-row'+(r.user_id===user.id?' me':'');
    row.innerHTML=`<span class="board-rank">#${Number(r.place)}</span>${avatar({name:r.name,avatar:r.avatar},true)}<span class="board-name">${escape(r.name)}<small class="muted">${escape(r.city||'')}</small></span><span class="badge">${escape(r.level)}</span><strong>${Number(r.xp)} XP</strong>`;
    row.onclick=()=>go('user',{id:r.user_id});rows.append(row);
   }
   offset+=list.length;status.textContent=offset?'':'Henüz sıralamada kimse yok.';
   more.textContent='Daha fazla göster';more.hidden=list.length<50;
  }catch(e){if(alive(t)){status.textContent=e.message;more.hidden=false;more.textContent='Tekrar dene'}}
  finally{busy=false;if(alive(t))more.disabled=false}
 }
 function start(next){
  scope=next;const t=++tab;busy=false;offset=0;rows.textContent='';status.textContent='';rankLine.textContent='';more.hidden=true;
  $('view').querySelectorAll('[data-scope]').forEach(b=>b.classList.toggle('active',b.dataset.scope===scope));
  if(user.guest){status.textContent='Sıralamaya girmek için hesapla giriş yap. Misafir ilerlemesi yalnızca bu tarayıcıda kalır.';return}
  if(scope==='city'&&!user.city){
   status.textContent='Şehir sıralaması için profilinde şehir seçmelisin. ';
   const b=document.createElement('button');b.type='button';b.textContent='Profili düzenle';b.onclick=()=>go('profile');status.append(b);return;
  }
  void load(t);
  myRank(scope,user.city).then(n=>{if(alive(t))rankLine.textContent=n?`Senin sıran: #${n}`:'Henüz sıralamada değilsin. Çalışıp XP kazanınca burada görünürsün.'}).catch(()=>{});
 }
 more.onclick=()=>load(tab);
 $('view').querySelectorAll('[data-scope]').forEach(b=>b.onclick=()=>start(b.dataset.scope));
 start(scope);
}
