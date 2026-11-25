import { gameTiles } from '../games/catalog.js';
import { online, openOnline, getPool, setPool } from '../games/online.js';
import { mountPools } from '../games/pvp-panels.js';
import { starterById } from '../data/starter-sets.js';
import { starterSection, bindStarters } from '../features/starters.js';
import { $, escape, uid } from './utils.js';
import { user, page, timer, allWords, save, setPage, setSession, setSetId, setSharedSet } from './state.js';
import { modal } from '../ui/modal.js';
import { header } from '../ui/header.js';
import { tile, bindActions } from '../ui/components.js';
import { newSet, setList, bindSets, detail } from '../features/sets.js';
import { chooseSet } from '../features/session.js';
import { study } from '../features/study.js';
import { play } from '../games/index.js';
import { profile } from '../features/profile.js';
import { leaderboard } from '../features/leaderboard.js';
import { discoverySearch, bindDiscovery, explore, openShared } from '../features/explore.js';
import { openUser } from '../features/people.js';
import { mistakesPage } from '../features/mistakes-page.js';
export let routeArg=null;
export function initNavigation(){
 history.replaceState({page:'home'},'');
 window.addEventListener('popstate',e=>{if(user)go(e.state?.page||'home',e.state?.arg,false)});
 $('sidebarSet').onclick=newSet;
 document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>go(b.dataset.page));
}
export function go(p,arg,push=true){
 if(push)history.pushState({page:p,arg},'');
 clearInterval(timer);setPage(p);setSession(null);setSharedSet(null);routeArg=arg;
 if(p==='detail')setSetId(arg);
 if(p==='starter'){setSharedSet(starterById(arg)||null);setSetId(arg)}
 render();
}
export function render(){
 header();const v=$('view');
 if(page==='home'){
  const acc=user.stats.total?Math.round(user.stats.correct/user.stats.total*100):0;
  v.innerHTML=`<div class="hero"><p class="eyebrow">ÇALIŞMA PANELİ</p><h1>Merhaba, ${escape(user.name)}.</h1><p class="muted">Bugün nasıl çalışmak istersin?</p>${discoverySearch()}</div>
  <div class="grid"><div class="card stat"><span class="muted">Kütüphanendeki kelimeler</span><strong>${allWords().length}</strong></div><div class="card stat"><span class="muted">Doğruluk</span><strong>${acc}%</strong></div><div class="card stat"><span class="muted">Toplam XP</span><strong>${user.xp}</strong></div></div>
  <div class="section"><div class="top"><h2>Senin çalışma setlerin</h2><button class="primary" id="quick">＋ Set oluştur</button></div>${setList(user.sets.slice(-4).reverse())}</div>${starterSection()}
  <div class="section"><h2>Bugün nasıl çalışalım?</h2><div class="grid">${tile('▱','Kartlar','Çevir, kaydır, tekrar et','cards')+tile('✎','Öğren','Sorularla pekiştir','learn')+tile('◎','Test','Karma sorular','test')+tile('✦','Oyunlar','Kelimelerle oyna','games')}</div></div>`;
  $('quick').onclick=newSet;bindDiscovery();bindSets();bindStarters();bindActions(m=>m==='games'?go('games'):chooseSet(m));return;
 }
 if(page==='sets'){
  v.innerHTML=`<div class="top"><div><p class="eyebrow">SENİN KÜTÜPHANEN</p><h1>Benim çalışma setlerim</h1><p class="muted">Oluşturduğun ve kütüphanene kopyaladığın setler. Bir setin içinde adını değiştirebilir veya silebilirsin.</p></div><div class="actions"><button class="primary" id="setBtn">＋ Set oluştur</button></div></div>
  <div class="card">${discoverySearch()}<p class="muted">Bu arama toplulukta paylaşılmış setleri bulur.</p></div>
  <div class="section">${setList(user.sets)}</div>${starterSection()}`;
  $('setBtn').onclick=newSet;bindSets();bindDiscovery();bindStarters();return;
 }
 if(page==='explore'){explore(routeArg);return}
 if(page==='shared'){void openShared(routeArg);return}
 if(page==='user'){void openUser(routeArg);return}
 if(page==='detail'||page==='starter'){detail();return}
 if(page==='online'){online(routeArg?.autoQuick);return}
 if(page==='games'){
  v.innerHTML='<p class="eyebrow">OYUN SALONU</p><h1>Oyna ve öğren.</h1><h2>Tek oyunculu / botlara karşı</h2><p class="muted">Kendi setini seç veya Keşfet’te bir set açıp oyun başlat.</p><div class="grid">'+gameTiles()+'</div><section class="section card"><h2>Çevrimiçi PvP</h2><p>İki oyuncu, ortak başlangıç ve sunucuda tutulan maç sonuçları.</p><label>Eşleşme havuzu <select id="gamePool"><option value="">Seviyem · '+escape(user.level||'A1')+'</option><option value="YDS">YDS</option><option value="YOKDIL">YÖKDİL</option></select></label><p class="muted">YDS ve YÖKDİL seviye değil sınavdır: bu havuzlarda oyuncuların A1–C2 seviyesi fark etmeden, kod olmadan eşleşirsin. “Seviyem” havuzunda yalnızca kendi seviyendeki oyuncularla eşleşirsin.</p><button class="primary" id="onlineLobby">Oda oluştur / Koda katıl</button><div class="section" id="gamePools"></div></section>';
  const poolBox=$('gamePool');poolBox.value=getPool();let stopPools=()=>{};
  const showPools=()=>{stopPools();stopPools=mountPools($('gamePools'),mode=>openOnline(null,mode,true,poolBox.value),()=>poolBox.value)};
  poolBox.onchange=()=>{setPool(poolBox.value);showPools()};showPools();
  $('onlineLobby').onclick=()=>openOnline(null,'runner',false,poolBox.value);bindActions(chooseSet);return;
 }
 if(page==='leaderboard'){leaderboard();return}
 if(page==='mistakes'){mistakesPage();return}
 if(page==='profile'){profile(user);return}
 if(page==='study'){study();return}
 if(page==='play'){play();return}
}
