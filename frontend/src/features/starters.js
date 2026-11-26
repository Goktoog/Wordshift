import { starterSets } from '../data/starter-sets.js';
import { $, escape } from '../core/utils.js';
import { go } from '../core/router.js';
export { starterSets };
export function starterSection(query='') {
 const normal=s=>s.toLocaleLowerCase('tr').replace(/ı/g,'i');
 const matching=starterSets.filter(s=>normal(s.name+' '+s.description).includes(normal(query.trim())));
 return `<section class="section starter-section"><div class="top"><div><p class="eyebrow">HERKESE AÇIK BAŞLANGIÇ KÜTÜPHANESİ</p><h2>Hazır setlerle başla</h2></div><span class="badge">7 başlangıç seti</span></div><p class="muted">Bu ortak setler kişisel kütüphanenden ayrıdır. İlerlemen ve tekrar listen sana aittir.</p><div class="grid">${matching.map(s=>`<button class="tile starter-tile" data-starter="${s.id}"><span class="starter-level">${escape(s.name)}</span><strong>${escape(s.name)}</strong><span class="muted">${s.items.filter(x=>x.type==='word').length} kelime · ${s.items.filter(x=>x.type!=='word').length} soru</span><p>${escape(s.description)}</p></button>`).join('')||'<p class="muted">Bu aramayla eşleşen başlangıç seti yok.</p>'}</div></section>`;
}
export function bindStarters(){ $('view').querySelectorAll('[data-starter]').forEach(b=>b.onclick=()=>go('starter',b.dataset.starter)); }
export function sourceLabel(item) {
 const s=item.source;if(!s)return '';
 return s.label+(s.question?' · Soru '+s.question:'')+(s.page?' · PDF s. '+s.page:'');
}
export function questionMedia(item) {
 // Only bundled catalog assets are renderable; arbitrary user-provided URLs are not used here.
 const valid=p=>typeof p==='string'&&/^\.\/assets\/starter\/yds-2026-(q\d{2}|passage-\d+)\.png$/.test(p);
 return [item.passageImage,item.questionImage].filter(valid).map((p,i)=>`<figure class="source-question"><img src="${escape(p)}" alt="${escape(item.passageImage&&i===0?'Bu soru grubunun kaynak okuma parçası':item.front+' — soru ve A–E seçenekleri')}" loading="lazy"><figcaption><a href="${escape(p)}" target="_blank" rel="noopener">Görseli büyük aç ↗</a></figcaption></figure>`).join('');
}

// Older personal copies have different item IDs but retain the source image and answer.
const examSolutions=new Map(starterSets.flatMap(s=>s.items).filter(x=>x.sourceQuestion).map(x=>[x.questionImage,x]));
export function answerExplanation(item){
 if(item.sourceQuestion && /^Yüklenen PDF cevap anahtarına göre doğru seçenek:/i.test(item.extra||'')){
  const original=examSolutions.get(item.questionImage);
  if(original?.back===item.back)return original.extra;
 }
 return item.extra||'';
}
