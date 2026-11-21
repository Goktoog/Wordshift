import { cities, searchCities, canonicalCity } from '../data/cities.js';
import { escape } from '../core/utils.js';
export function cityPickerMarkup(value='') {
 const city=canonicalCity(value);
 return `<div class="city-picker" id="cityPicker"><label id="cityLabel" for="cityToggle">Şehir</label><input type="hidden" name="city" id="cityValue" value="${escape(city)}"><button type="button" id="cityToggle" aria-expanded="false" aria-controls="cityPanel"><span id="citySelected">${escape(city||'Şehir seç (isteğe bağlı)')}</span><span aria-hidden="true">⌄</span></button><div id="cityPanel" class="city-panel" hidden><label for="citySearch" class="sr-only">İl ara</label><input type="search" id="citySearch" role="combobox" aria-expanded="false" aria-controls="cityOptions" aria-autocomplete="list" autocomplete="off" placeholder="İl ara… Örn. Ankara"><div id="cityOptions" class="city-options" role="listbox" aria-labelledby="cityLabel"></div><p id="cityCount" class="notice" role="status"></p><button type="button" id="cityClear">Şehir belirtme</button></div></div>`;
}
export function bindCityPicker(root) {
 const $=id=>root.querySelector('#'+id), toggle=$('cityToggle'), panel=$('cityPanel'), input=$('citySearch'), list=$('cityOptions');
 let results=cities,active=-1;
 function highlight(){
  const options=[...list.querySelectorAll('[role="option"]')];
  options.forEach((el,i)=>el.classList.toggle('is-active',i===active));
  if(options[active]){input.setAttribute('aria-activedescendant',options[active].id);options[active].scrollIntoView?.({block:'nearest'})}else input.removeAttribute('aria-activedescendant');
 }
 function close(focus=true){panel.hidden=true;toggle.setAttribute('aria-expanded','false');input.setAttribute('aria-expanded','false');if(focus)toggle.focus()}
 function select(city){$('cityValue').value=city;$('citySelected').textContent=city||'Şehir seç (isteğe bağlı)';close()}
 function render(){
  results=searchCities(input.value);active=-1;list.replaceChildren();
  results.forEach((city,i)=>{const b=document.createElement('button');b.type='button';b.id='city-option-'+i;b.role='option';b.tabIndex=-1;b.setAttribute('aria-selected',String(city===$('cityValue').value));b.textContent=city;b.onclick=()=>select(city);list.append(b)});
  $('cityCount').textContent=results.length?`${results.length} il`:'İl bulunamadı.';highlight();
 }
 toggle.onclick=()=>{if(!panel.hidden){close();return}panel.hidden=false;toggle.setAttribute('aria-expanded','true');input.setAttribute('aria-expanded','true');input.value='';render();input.focus()};
 input.oninput=render;
 input.onkeydown=e=>{
  if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();active=e.key==='Home'?0:e.key==='End'?results.length-1:e.key==='ArrowDown'?Math.min(results.length-1,active+1):Math.max(0,active-1);highlight()}
  if(e.key==='Enter'){e.preventDefault();if(results.length)select(results[active<0?0:active])}
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close()}
 };
 $('cityClear').onclick=()=>select('');
 root.addEventListener('focusout',e=>{if(e.relatedTarget&&!root.contains(e.relatedTarget))close(false)});
 return {get value(){return $('cityValue').value},close};
}
