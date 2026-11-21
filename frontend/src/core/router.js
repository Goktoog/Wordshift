import { online, openOnline } from '../games/online.js';
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
export let folderFilter=null, routeArg=null;
export function initNavigation(){
 history.replaceState({page:'home'},'');
 window.addEventListener('popstate',e=>{if(user)go(e.state?.page||'home',e.state?.arg,false)});
 $('sidebarSet').onclick=newSet;
 document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>go(b.dataset.page));
 $('newFolder').onclick=()=>modal('<h2>Yeni klasör</h2><label>İsim</label><input name="name" required maxlength="80" placeholder="Örn. Seyahat İngilizcesi">',d=>{
  if(!d.get('name').trim())return;
  const id=uid();user.folders.push({id,name:d.get('name').trim()});save();go('sets',id);
 });
}
export function go(p,arg,push=true){
 if(push)history.pushState({page:p,arg},'');
 clearInterval(timer);setPage(p);setSession(null);setSharedSet(null);routeArg=arg;
 folderFilter=p==='sets'?(arg||null):null;
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
  const folder=user.folders.find(f=>f.id===folderFilter);
  v.innerHTML=`<div class="top"><div><p class="eyebrow">SENİN KÜTÜPHANEN</p><h1>${folder?escape(folder.name):'Benim çalışma setlerim'}</h1><p class="muted">${folder?'Bu klasöre koyduğun setler.':'Oluşturduğun ve kütüphanene kopyaladığın setler.'}</p></div><div class="actions"><button id="folderBtn">＋ Klasör</button><button class="primary" id="setBtn">＋ Set oluştur</button></div></div>
  ${folder?'<button id="allMine">← Benim tüm setlerim</button>':''}
  <div class="card">${discoverySearch()}<p class="muted">Bu arama toplulukta paylaşılmış setleri bulur.</p></div>
  <div class="section">${setList(user.sets.filter(s=>!folderFilter||s.folder===folderFilter))}</div>${folder?'':starterSection()}`;
  $('folderBtn').onclick=$('newFolder').onclick;$('setBtn').onclick=newSet;
  if($('allMine'))$('allMine').onclick=()=>go('sets');bindSets();bindDiscovery();bindStarters();return;
 }
 if(page==='explore'){explore(routeArg);return}
 if(page==='shared'){void openShared(routeArg);return}
 if(page==='user'){void openUser(routeArg);return}
 if(page==='detail'||page==='starter'){detail();return}
 if(page==='online'){online(routeArg?.autoQuick);return}
 if(page==='games'){
  v.innerHTML='<p class="eyebrow">OYUN SALONU</p><h1>Oyna ve öğren.</h1><h2>Tek oyunculu / botlara karşı</h2><p class="muted">Kendi setini seç veya Keşfet’te bir set açıp oyun başlat.</p><div class="grid">'+tile('🏃','Word Runner','Engelleri aş, doğru cevabı yetiştir','runner')+tile('⚓','Amiral Battı','Kelimeyi bil, botun gemisini vur','battle')+tile('▦','Kelime blokları','İngilizce ve Türkçe blokları eşleştir','blocks')+tile('🚀','Meteor avı','Doğru meteoru seç','meteor')+tile('▤','Cümle Düellosu','Kelimeleri sıraya koy, doğru cümleyi kur','sentences')+'</div><section class="section card"><h2>Çevrimiçi PvP</h2><p>İki oyuncu, ortak başlangıç ve sunucuda tutulan maç sonuçları.</p><button class="primary" id="onlineLobby">Oda oluştur / Koda katıl</button><div class="section" id="gamePools"></div></section>';
  $('onlineLobby').onclick=()=>openOnline();mountPools($('gamePools'),mode=>openOnline(null,mode,true));bindActions(chooseSet);return;
 }
 if(page==='leaderboard'){leaderboard();return}
 if(page==='mistakes'){mistakesPage();return}
 if(page==='profile'){profile(user);return}
 if(page==='study'){study();return}
 if(page==='play'){play();return}
}
