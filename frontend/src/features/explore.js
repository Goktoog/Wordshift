import { starterSection, bindStarters } from './starters.js';
import { $, escape } from '../core/utils.js';
import { page, setSharedSet, setSetId } from '../core/state.js';
import { go } from '../core/router.js';
import { searchPublic, getPublic } from '../services/community.js';
import { detail } from './sets.js';
import { peopleSearchMarkup, bindPeopleSearch } from './people.js';
let requestId=0;
export const discoverySearch = () => `<form id="discoverySearch" class="discovery-search"><label for="discoverQuery">Toplulukta set ara</label><div class="actions"><input id="discoverQuery" name="q" maxlength="100" placeholder="Çalışacak setler mi arıyorsun?"><button class="primary">Ara</button><button type="button" id="browseSets">Keşfet</button></div><div id="discoverySuggestions" aria-live="polite"></div></form>`;
export function bindDiscovery() {
 $('discoverySearch').onsubmit=e=>{e.preventDefault();go('explore',{q:$('discoverQuery').value})};
 $('browseSets').onclick=()=>go('explore');
 bindSuggestions();
}
function bindSuggestions(owner=null){
 const input=$('discoverQuery'),box=$('discoverySuggestions');let delay,version=0;
 input.oninput=()=>{
  clearTimeout(delay);const mine=++version,q=input.value.trim();box.textContent='';if(!q)return;
  delay=setTimeout(async()=>{
   if($('discoverQuery')!==input)return;
   box.textContent='Aranıyor…';
   try{
    const rows=await searchPublic(q,owner);
    if(mine!==version||$('discoverQuery')!==input)return;
    box.textContent=rows.length?'':'Eşleşen paylaşılan set yok.';
    for(const row of rows.slice(0,5)){
     const button=document.createElement('button');button.type='button';button.className='search-suggestion';
     button.textContent=row.title+' · '+row.author_name+' · '+row.item_count+' içerik';
     button.onclick=()=>go('shared',{owner:row.owner_id,id:row.set_id});box.append(button);
    }
   }catch(e){if(mine===version&&$('discoverQuery')===input)box.textContent=e.message}
  },350);
 };
}
export function explore(arg={}) {
 const request=++requestId;
 const author=arg?.owner || null, q=arg?.q || '';
 $('view').innerHTML=`<div class="top"><div><p class="eyebrow">KEŞFET</p><h1>${author ? escape(arg.name || 'Kullanıcı')+' · Paylaşılan setler' : 'Birlikte öğrenelim'}</h1></div>${author?'<div class="actions"><button id="authorProfile" class="primary">Profilini gör</button><button id="allPublic">Tüm topluluk</button></div>':''}</div>
 <p class="muted">Yalnızca herkesle paylaşılan setler. Başkasının setini çalışmak onu kütüphanene eklemez.</p>${discoverySearch()}${author?'':peopleSearchMarkup()}${author?'':starterSection(q)}<p id="searchStatus" role="status">Yükleniyor…</p><div id="publicResults" class="grid"></div><button id="morePublic" hidden>Daha fazla göster</button>`;
 $('discoverQuery').value=q;
 const results=$('publicResults'), status=$('searchStatus'), more=$('morePublic');
 let offset=0, busy=false;
 const alive=()=>page==='explore'&&request===requestId&&$('publicResults')===results;
 $('discoverySearch').onsubmit=e=>{e.preventDefault();go('explore',{...arg,q:$('discoverQuery').value})};
 $('browseSets').onclick=()=>go('explore');
 if($('allPublic')) $('allPublic').onclick=()=>go('explore');
 if($('authorProfile')) $('authorProfile').onclick=()=>go('user',{id:author});
 if(!author) bindPeopleSearch();
 bindSuggestions(author);bindStarters();
 async function load(){
  if(busy)return;busy=true;more.disabled=true;
  try{
   const rows=await searchPublic(q,author,offset);if(!alive())return;
   for(const row of rows){
    const card=document.createElement('article');card.className='card public-set';
    card.innerHTML=`<span class="ico">▱</span><h2>${escape(row.title)}</h2><button class="author-link">${escape(row.author_name)}</button><p class="muted">${row.item_count} içerik · ${escape((row.levels||[]).join(' · '))}</p><button class="primary open-set">Seti aç</button>`;
    card.querySelector('.open-set').onclick=()=>go('shared',{owner:row.owner_id,id:row.set_id});
    card.querySelector('.author-link').onclick=()=>go('user',{id:row.owner_id});
    results.append(card);
   }
   offset+=rows.length;status.textContent=offset?`${offset} set gösteriliyor${q?' · En yakın eşleşmeler önce':''}`:'Eşleşen paylaşılan set bulunamadı.';
   more.hidden=rows.length<24;
  }catch(e){if(alive()){status.textContent=e.message;more.hidden=false;more.textContent='Tekrar dene'}}
  finally{busy=false;if(alive())more.disabled=false}
 }
 more.onclick=()=>load();void load();
}
export async function openShared(arg) {
 const request=++requestId;
 $('view').innerHTML='<p role="status">Set yükleniyor…</p>';
 try{
  if(!arg?.owner||!arg?.id)throw Error('Set bağlantısı eksik.');
  const set=await getPublic(arg.owner,arg.id);
  if(page!=='shared'||request!==requestId)return;
  setSharedSet(set);setSetId(set.id);detail();
 }catch(e){if(page==='shared'&&request===requestId){$('view').innerHTML=`<div class="card"><p>${escape(e.message)}</p><button id="backDiscover">Keşfet’e dön</button></div>`;$('backDiscover').onclick=()=>go('explore')}}
}
