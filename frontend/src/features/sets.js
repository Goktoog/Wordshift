import { gameTiles, onlineGamePicker } from '../games/catalog.js';
import { openOnline } from '../games/online.js';
import { poolForSet, poolLabel } from '../games/pvp-panels.js';
import { questionMedia, answerExplanation } from './starters.js';
import { $, escape, uid, levels } from '../core/utils.js';
import { user, save, current } from '../core/state.js';
import { go } from '../core/router.js';
import { modal } from '../ui/modal.js';
import { tile, bindActions } from '../ui/components.js';
import { botOptions } from '../games/bot-skill.js';
import { begin, gameModes } from './session.js';
import { reviewItems } from './progress.js';
import { publication, publishSet, unpublishSet } from '../services/community.js';
import { markPublished, markPrivate } from '../services/auto-publish.js';
import { toast } from '../ui/feedback.js';
const poolNote=s=>{const p=poolForSet(s);return p?`Bu set <strong>${poolLabel(p)}</strong> havuzunda eşleşir: karşındaki oyuncunun A1–C2 seviyesi fark etmez, herkes ${poolLabel(p)} çalışır.`:`Hızlı eşleşmede kendi seviyendeki (<strong>${escape(user.level||'A1')}</strong>) oyuncularla eşleşirsin. YDS veya YÖKDİL havuzunda eşleşmek için ilgili hazır seti aç ya da Oyunlar sayfasından havuz seç.`};
export function setList(sets){return '<div class="grid">'+(sets.length?sets.map(s=>`<button class="tile" data-set="${escape(s.id)}"><span class="ico">▱</span><strong>${escape(s.name)}</strong><span class="muted">${s.items.length} içerik</span></button>`).join(''):'<div class="card muted">Henüz çalışma seti yok. Yeni bir set oluşturabilir veya Keşfet’te çalışabilirsin.</div>')+'</div>'}
export function bindSets(){$('view').querySelectorAll('[data-set]').forEach(b=>b.onclick=()=>go('detail',b.dataset.set))}
function visibilityField(selected,guest){return '<label>Görünürlük</label><select name="visibility" '+(guest?'disabled':'')+'><option value="public" '+(selected==='public'?'selected':'')+'>Herkese açık · Keşfet’te görünür</option><option value="private" '+(selected!=='public'?'selected':'')+'>Gizli · Yalnızca ben görürüm</option></select><p class="notice">'+(guest?'Misafir setleri gizlidir. Herkese açık set için hesapla giriş yap.':'İstediğin zaman değiştirebilirsin. Herkese açık setin en az bir içerik eklendiğinde Keşfet’te görünür.')+'</p>'}
export function newSet(){if(user.guest)return;modal('<h2>Çalışma seti oluştur</h2><label>Set adı</label><input name="name" maxlength="120" required placeholder="Örn. B1 günlük konuşma">'+visibilityField(user.guest?'private':'public',user.guest),d=>{
 const s={id:uid(),name:d.get('name').trim(),items:[],visibility:user.guest?'private':(d.get('visibility')==='private'?'private':'public')};if(!s.name)return;user.sets.push(s);save();go('detail',s.id);
})}
export function detail(){
 const s=current();if(!s){go('sets');return}
 const readOnly=user.guest||!!s.publicSource, review=reviewItems(user,s), words=s.items.filter(x=>x.type==='word');
 $('view').innerHTML=`<div class="top"><div><p class="eyebrow">${s.starterSource?'BAŞLANGIÇ SETİ':readOnly?'TOPLULUK SETİ':'SENİN ÇALIŞMA SETİN'}</p><h1>${escape(s.name)}</h1><p class="muted">${s.items.length} içerik${readOnly?' · '+escape(s.authorName):''}</p></div><div class="actions">${readOnly?(s.starterSource?'':'<button id="authorSets">Oluşturanın setleri</button>')+ (user.guest?'':'<button id="copySet">Kütüphaneme kopyala</button>'):'<button id="renameSet">✎ Adı / görünürlüğü düzenle</button><button id="bulk">Toplu ekle</button><button class="primary" id="itemAdd">＋ İçerik ekle</button><button class="danger" id="deleteSet">🗑 Seti sil</button>'}</div></div>
 ${s.starterSource?`<p class="notice">${escape(s.description)} Hazır içerik ortak, ilerleme ve tekrar listen kişiseldir. CEFR etiketleri yaklaşık çalışma düzeyidir.</p>`:''}
 <div class="study-controls card"><label>Çalışılacak içerik<select id="studyContent"><option value="all">Tüm içerikler</option><option value="word">Yalnızca kelimeler</option><option value="questions">Yalnızca sorular</option><option value="blank">Boşluk doldurma</option><option value="paragraph">Paragraf</option><option value="translate">Çeviri</option><option value="mc">Çoktan seçmeli / diğer</option>${s.items.some(x=>x.sourceQuestion)?`<option value="source-exam">PDF’deki YDS soruları (${s.items.filter(x=>x.sourceQuestion).length})</option>`:''}</select></label><label>Oturum uzunluğu<select id="studyLimit"><option value="20" ${s.starterSource?'selected':''}>20 içerik</option><option value="50">50 içerik</option><option value="0" ${s.starterSource?'':'selected'}>Tümü</option></select></label><p id="studySelectionNote" class="notice">Kartlar ve oyunlar kelimelerle çalışır. Deneme 30 dakika; PDF soru seçimi 180 dakikadır.</p></div>
 <div class="grid">${tile('▱','Kartlar','Çevir ve sağa / sola kaydır','cards')+tile('✎','Öğren','Yazılı ve seçenekli sorular','learn')+tile('◎','Test','Karma sorular','test')+tile('◷','Deneme','Süreli sınav','exam')}</div>
 <div class="card section"><div class="top"><h2>Bilmediklerim / boş bıraktıklarım (${review.length})</h2><button id="reviewSet" ${review.length?'':'disabled'}>Bu kümeyi çalış</button></div><p class="muted">Yalnızca senin tekrar listen. Doğru bildiklerin bu kümeden çıkar.</p><details><summary>Listedeki içerikleri göster</summary><ul>${review.map(x=>`<li>${escape(x.front)}</li>`).join('')||'<li>Tekrar listen boş.</li>'}</ul></details></div>
 <section class="section"><div class="top"><h2>Çevrimiçi oyna</h2>${onlineGamePicker()}<button id="setOnline" class="primary">Bu setle çevrimiçi oyna</button></div><p class="muted">${poolNote(s)}</p></section>
 <section class="section"><div class="top"><h2>Tek başına veya botla oyna</h2><label>Zorluk <select id="setDifficulty">${botOptions()}</select></label></div><p class="muted">${words.length} kelime / kalıp · Zorluk yalnızca bu bölümdeki tek oyunculu ve botlu oyunlarda koşu hızını ve botu etkiler; çevrimiçi maçlarda geçerli değildir.</p><div class="grid">${gameTiles()}</div>${words.length?'':'<p class="notice">Cümle Düellosu hazır cümleleri, Kafanı Kırarım setteki yazılı soruları da kullanır. Diğer oyunlar için sete kelime veya kalıp ekle.</p>'}</section>
 ${readOnly?'':`<section class="card section"><h2>Toplulukla paylaş</h2><p>Setler varsayılan olarak özeldir. Paylaşınca set adı, kullanıcı adın ve içerikler herkes tarafından görülebilir ve kopyalanabilir.</p><p id="publishStatus" role="status">${user.guest?'Paylaşmak için hesapla giriş yap.':'Paylaşım durumu kontrol ediliyor…'}</p><div class="actions"><button id="publishSet" ${user.guest?'disabled':''}>Herkesle paylaş / Yayını güncelle</button><button id="unpublishSet" ${user.guest?'disabled':''}>Paylaşımı kaldır</button></div><p class="muted">Düzenlemeler kendiliğinden yayımlanmaz; Yayını güncelle düğmesini kullan.</p></section>`}
 <div class="section top"><h2>İçerikler</h2></div><input id="search" aria-label="Set içinde ara" placeholder="Kelime veya soru ara..."><div class="card" id="contentList"></div>`;
 $('setOnline').onclick=()=>openOnline(s,$('onlineGamePick').value,false,poolForSet(s));
 $('reviewSet').onclick=()=>begin('learn',s,'normal',true);
 $('search').oninput=contentList;contentList();
 bindActions(m=>begin(m,s,$('setDifficulty').value,false,{origin:gameModes.includes(m)?{page:s.starterSource?'starter':readOnly?'shared':'detail',arg:readOnly&&!s.starterSource?{owner:s.ownerId,id:s.id}:s.id}:null,content:$('studyContent').value,limit:Number($('studyLimit').value)}));
 $('studyContent').onchange=()=>{if($('studyContent').value==='source-exam')$('studyLimit').value='0'};
 if(!words.length)$('view').querySelectorAll('[data-action]').forEach(b=>{if((gameModes.includes(b.dataset.action)&&!['sentences','buzzer'].includes(b.dataset.action))||b.dataset.action==='cards')b.disabled=true});
 if(readOnly){
  if($('authorSets'))$('authorSets').onclick=()=>go('explore',{owner:s.ownerId,name:s.authorName});
  if(user.guest)return;
  $('copySet').onclick=()=>{if(!confirm('Bu setin bağımsız bir kopyası kütüphanene eklensin mi?'))return;const copy={id:uid(),name:s.name,items:s.items.map(x=>({...x,id:uid(),attempts:0,correct:0})),sourceAuthor:s.authorName};user.sets.push(copy);save();go('detail',copy.id);toast('Kopya kütüphanene eklendi.')};return;
 }
 $('itemAdd').onclick=()=>editor();
 $('bulk').onclick=()=>modal('<h2>Toplu kelime ekle</h2><p>Her satır: İngilizce | Türkçe | seviye (isteğe bağlı)</p><textarea name="bulk" required placeholder="although | -mesine rağmen | B1"></textarea>',d=>{for(const line of d.get('bulk').split('\n')){const [a,b,l]=line.split('|').map(x=>x.trim());if(a&&b)s.items.push({id:uid(),type:'word',front:a,back:b,level:levels.includes(l)?l:'B1',extra:'',options:[],attempts:0,correct:0})}save();detail()});
 $('renameSet').onclick=()=>modal('<h2>Seti düzenle</h2><input name="name" required maxlength="120" value="'+escape(s.name)+'">'+visibilityField(s.visibility==='public'?'public':'private',user.guest),d=>{s.name=d.get('name').trim()||s.name;const next=user.guest?'private':(d.get('visibility')==='public'?'public':'private'),was=s.visibility;s.visibility=next;save();if(was==='public'&&next==='private'){markPrivate(s);unpublishSet(s).catch(e=>toast(e.message))}detail()});
 $('deleteSet').onclick=async()=>{
  if(!confirm('“'+s.name+'” seti ve içindeki '+s.items.length+' içerik kalıcı olarak silinsin mi? Bu işlem geri alınamaz.'+(s.visibility==='public'&&!user.guest?' Set Keşfet’ten de kaldırılır.':'')))return;
  const button=$('deleteSet');button.disabled=true;
  try{
   if(!user.guest&&s.visibility==='public')await unpublishSet(s);
   markPrivate(s);user.sets=user.sets.filter(x=>x.id!==s.id);save();toast('Set silindi.');go('sets');
  }catch(e){button.disabled=false;toast('Set silinemedi: '+e.message)}
 };
 const status=$('publishStatus'),pub=$('publishSet'),unpub=$('unpublishSet');
 if(!user.guest){
  const owner=user.id;
  void publication(s,owner).then(p=>{if($('publishStatus')===status)status.textContent=p?'Paylaşılıyor. Değişiklik yaptıysan yayını güncelle.':'Özel · Yalnızca sen görebilirsin.'}).catch(e=>{if($('publishStatus')===status)status.textContent=e.message});
  async function change(remove){
   if(!confirm(remove?'Bu set Keşfet’ten kaldırılsın mı? Daha önce alınmış kopyalar silinmez.':'Set adı, kullanıcı adın ve tüm içerikleri herkese açık yayımlansın mı?'))return;
   pub.disabled=unpub.disabled=true;
   try{s.visibility=remove?'private':'public';save();if(remove){markPrivate(s);await unpublishSet(s)}else{await publishSet(s);markPublished(s)}if($('publishStatus')===status)status.textContent=remove?'Özel · Paylaşım kaldırıldı.':'✓ Paylaşıldı. Artık Keşfet’te aranabilir.'}
   catch(e){if(remove)s.visibility='public';if($('publishStatus')===status)status.textContent=e.message}
   finally{pub.disabled=unpub.disabled=false}
  }
  pub.onclick=()=>change(false);unpub.onclick=()=>change(true);
 }
}
export const typeNames={word:'Kelime / kalıp',mc:'Çoktan seçmeli',blank:'Boşluk doldurma',translate:'Çeviri',paragraph:'Paragraf'};export function editor(old){if(user.guest||current()?.publicSource)return;modal('<h2>'+(old?'Düzenle':'Yeni içerik')+'</h2><label>Tür</label><select name="type" id="kind">'+Object.entries(typeNames).map(([k,v])=>'<option value="'+k+'">'+v+'</option>').join('')+'</select><div id="dynamic"></div>',d=>{let x={id:old?.id||uid(),type:d.get('type'),front:d.get('front').trim(),back:d.get('back').trim(),level:d.get('level'),extra:d.get('extra').trim(),options:d.getAll('opt').map(x=>x.trim()).filter(Boolean),attempts:old?.attempts||0,correct:old?.correct||0};if(!x.front||!x.back)return;let s=current();if(old)s.items=s.items.map(y=>y.id===old.id?x:y);else s.items.push(x);save();detail()});$('kind').value=old?.type||'word';function fields(){let t=$('kind').value;$('dynamic').innerHTML='<label>'+(t==='word'?'İngilizce kelime / kalıp':t==='paragraph'?'Paragraf ve soru':'Soru veya çeviri metni')+'</label><textarea name="front" required>'+escape(old?.front)+'</textarea><label>Doğru cevap / Türkçe anlam</label><input name="back" required value="'+escape(old?.back)+'">'+(['mc','paragraph','translate'].includes(t)?'<label>Çeldirici seçenekler (isteğe bağlı)</label>'+[0,1,2,3].map(i=>'<input name="opt" value="'+escape(old?.options?.[i])+'" placeholder="Yanlış seçenek '+(i+1)+'">').join(''):'')+'<label>Zorluk seviyesi</label><select name="level">'+levels.map(l=>'<option '+(l===(old?.level||'B1')?'selected':'')+'>'+l+'</option>').join('')+'</select><label>Örnek / açıklama</label><textarea name="extra">'+escape(old?.extra)+'</textarea>'}fields();$('kind').onchange=fields}
export function contentList(){
 const set=current(),q=$('search').value.toLocaleLowerCase('tr');
 const found=set.items.filter(x=>(x.front+' '+x.back).toLocaleLowerCase('tr').includes(q));
 const container=$('contentList');let visible=50;
 function renderList(){
  container.innerHTML=found.slice(0,visible).map(x=>`<div class="row"><div><strong>${escape(x.front)}</strong><p class="muted">${x.sourceQuestion?'':escape(x.back)+' · '}${escape(typeNames[x.type])} · ${escape(x.level)}</p>${x.questionImage?`<details><summary>Kaynak soruyu göster</summary>${questionMedia(x)}<details><summary>Cevap ve açıklama</summary>${escape(x.back)}<p>${escape(answerExplanation(x))}</p></details></details>`:''}</div>${user.guest||set.publicSource?'':`<div class="row-actions">${x.sourceQuestion?'':`<button data-edit="${escape(x.id)}" aria-label="Düzenle">✎</button>`}<button data-del="${escape(x.id)}" aria-label="Sil">×</button></div>`}</div>`).join('')||'<p class="muted">İçerik bulunamadı.</p>';
  if(found.length>visible){const more=document.createElement('button');more.textContent=`Daha fazla göster (${Math.min(visible,found.length)} / ${found.length})`;more.onclick=()=>{visible+=50;renderList()};container.append(more)}
  if(user.guest||set.publicSource)return;
  container.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>editor(set.items.find(x=>x.id===b.dataset.edit)));
  container.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{if(confirm('İçerik silinsin mi?')){set.items=set.items.filter(x=>x.id!==b.dataset.del);save();detail()}});
 }
 renderList();
}
