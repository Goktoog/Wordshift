import {escape} from '../core/utils.js';
import {user} from '../core/state.js';
import {go} from '../core/router.js';
import {pools,matchHistory} from '../services/pvp.js';
import {wrongWordsMarkup} from '../features/pvp-credit.js';
export const poolForSet=set=>({'starter-yds':'YDS','starter-yokdil':'YOKDIL'})[set?.id]||'';
export const poolLabel=l=>({YOKDIL:'YÖKDİL'}[l]||l);
import { gameTitles, gameModes } from './catalog.js';
export { gameTitles };
export function mountPools(host,onSelect,getPool=()=>''){
 const owner=user;let busy=false,stopped=false,interval;
 host.innerHTML='<p role="status">Oyuncu havuzları kontrol ediliyor…</p>';
 async function refresh(){if(stopped||!host.isConnected||owner!==user){window.clearInterval(interval);return}if(busy)return;busy=true;
  try{const data=await pools(getPool());if(stopped||!host.isConnected||owner!==user)return;
   const byMode=new Map(data.pools.map(pool=>[pool.mode,pool]));
   const ordered=gameModes.map(mode=>byMode.get(mode)).filter(Boolean);
   host.innerHTML=`<h3>Canlı oyuncu havuzları</h3><p class="muted">Sayılar seni içermez. “Uygun” oyuncular ${escape(poolLabel(data.level))} ${['YDS','YOKDIL'].includes(data.level)?'havuzunda':'seviyesinde'}. Yaklaşık 3 saniyede bir güncellenir.</p><div class="pool-grid">${ordered.map(p=>`<div class="pool-card"><strong>${gameTitles[p.mode]}</strong><span class="pool-count">${p.waiting} kişi bekliyor</span><span>${p.compatible} uygun rakip</span><small>${p.compatible>0?'Uygun rakip var; eşleşme denenebilir.':p.waiting>0?'Bekleyen oyuncular farklı seviyede.':'Şu anda kuyrukta başka oyuncu yok.'}</small><small>${p.estimateSeconds!==null?`Son ${p.samples} eşleşmede ortalama bekleme: ${Math.max(1,Math.round(p.estimateSeconds))} sn. Yeni eşleşme için garanti değildir.`:'Tahmini süre: yeterli eşleşme verisi yok.'}</small><button data-pool="${p.mode}">Online rakip ara</button></div>`).join('')}</div>`;
   if(gameModes.some(mode=>!data.pools.some(p=>p.mode===mode))){
    const note=document.createElement('p');note.className='notice';note.setAttribute('role','status');
    note.textContent='Sunucudaki oyun listesi eski. Dokuz oyunu etkinleştirmek için Supabase SQL Editor’da güncel Wordshift-Guncelleme.sql dosyasını çalıştır.';
    host.prepend(note);
   }
   host.querySelectorAll('[data-pool]').forEach(b=>b.onclick=()=>onSelect(b.dataset.pool));
  }catch(e){if(host.isConnected)host.innerHTML='<p class="error" role="status">'+escape(e.message)+'</p>'}finally{busy=false}
 }
 void refresh();interval=window.setInterval(refresh,3000);return ()=>{stopped=true;window.clearInterval(interval)};
}
export function mountMatchHistory(host){
 const owner=user;if(owner.guest){
  const matches=owner.localMatches||[];
  host.innerHTML='<h2>Bu cihazdaki maçlarım</h2>'+ (matches.length?matches.map(m=>{
   const result=m.winner==null?'Berabere':m.winner===m.me?'Kazandın':'Kaybettin';
   return `<div class="card history-match"><strong>${escape(gameTitles[m.mode])} · ${result}</strong><p>${escape(m.opponent)} · ${m.scores[m.me-1]} : ${m.scores[2-m.me]} · ${new Date(m.date).toLocaleString('tr-TR')}</p></div>`;
  }).join(''):'<p>Henüz tamamlanmış maçın yok.</p>');return;
 }
 host.innerHTML='<h2>Çevrimiçi maç geçmişim</h2><p class="history-note" role="status">Yükleniyor…</p><div class="history-list"></div><button class="history-more" hidden>Daha fazla göster</button>';
 const note=host.querySelector('.history-note'),list=host.querySelector('.history-list'),more=host.querySelector('.history-more');let offset=0,busy=false;
 async function load(){if(busy)return;busy=true;more.disabled=true;
  try{const rows=await matchHistory(offset);if(!host.isConnected||user!==owner)return;
   rows.forEach(r=>{const me=r.me-1,other=1-me,won=r.winner===r.me,result=r.winner===null?'Berabere':won?'Kazandın':'Kaybettin',duration=Math.max(0,Math.round((Date.parse(r.ended_at)-Date.parse(r.started_at))/1000));
    const card=document.createElement('details');card.className='card history-match';card.innerHTML=`<summary><span><strong>${gameTitles[r.mode]||escape(r.mode)}</strong><span class="muted">${new Date(r.ended_at).toLocaleString('tr-TR')} · ${escape(r.names[other])}</span></span><span class="${won?'good':r.winner===null?'':'bad'}">${result} · ${r.scores[me]} : ${r.scores[other]}</span></summary><div class="history-detail"><p>${escape(r.reason)}</p><button class="history-opponent">Rakip: ${escape(r.names[other])}</button><p>Set: ${escape(r.title)} · ${escape(poolLabel(r.level))} · ${Math.floor(duration/60)} dk ${duration%60} sn · ${r.rounds} tur</p><table><thead><tr><th></th><th>Sen</th><th>Rakip</th></tr></thead><tbody><tr><td>Puan</td><td>${r.scores[me]}</td><td>${r.scores[other]}</td></tr><tr><td>Doğru cevap</td><td>${r.correct_counts[me]}</td><td>${r.correct_counts[other]}</td></tr><tr><td>Yanlış / süre aşımı</td><td>${r.wrong_counts[me]}</td><td>${r.wrong_counts[other]}</td></tr>${['runner','meteor','buzzer'].includes(r.mode)?`<tr><td>Kalan can</td><td>${r.lives[me]}</td><td>${r.lives[other]}</td></tr>`:''}${r.mode==='battle'?`<tr><td>İsabet / atış</td><td>${r.hits[me].length} / ${r.shots[me].length}</td><td>${r.hits[other].length} / ${r.shots[other].length}</td></tr>`:''}</tbody></table>${wrongWordsMarkup(r.id)}</div>`;
    if(!r.players[other])card.querySelector('.history-opponent').disabled=true;else card.querySelector('.history-opponent').onclick=()=>go('user',{id:r.players[other]});list.append(card);
   });offset+=rows.length;note.textContent=offset?'Son maçlar önce gösterilir. Ayrıntıları açmak için maça dokun.':'Henüz tamamlanmış çevrimiçi maçın yok.';more.hidden=rows.length<20;more.textContent='Daha fazla göster';
  }catch(e){if(host.isConnected){note.textContent=e.message;more.hidden=false;more.textContent='Yeniden dene'}}finally{busy=false;more.disabled=false}
 }
 more.onclick=()=>void load();void load();
}
