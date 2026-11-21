import { uploadImage } from '../services/cloud.js';
import { $, escape } from '../core/utils.js';
import { user, save, page } from '../core/state.js';
import { avatar } from '../ui/components.js';
import { modal } from '../ui/modal.js';
import { header } from '../ui/header.js';
import { toast } from '../ui/feedback.js';
import { go } from '../core/router.js';
import { cropImage, blobDataURL } from '../ui/image-cropper.js';
import { cityPickerMarkup, bindCityPicker } from '../ui/city-picker.js';
import { canonicalCity } from '../data/cities.js';
import { mountSocial } from './people.js';
const pencil='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15l-1 6Z"/></svg>';
let picking=false;
export async function saveProfileMedia(account,kind,blob){
 if(user!==account||!['avatar','banner'].includes(kind))throw Error('Oturum değişti. Profilini yeniden aç.');
 const value=account.guest?await blobDataURL(blob):await uploadImage(blob,kind);
 if(user!==account)throw Error('Oturum değişti. Profilini yeniden aç.');
 const previous=account[kind];account[kind]=value;
 try{save()}catch(error){account[kind]=previous;throw Error('Görsel kaydedilemedi. Tarayıcı depolama alanını kontrol et.')}
 header();if(page==='profile')profile(account);toast(kind==='avatar'?'Profil fotoğrafın güncellendi.':'Kapak görselin güncellendi.');
}
function chooseMedia(account,kind){
 if(picking)return;
 const input=document.createElement('input');input.type='file';input.accept='image/png,image/jpeg,image/webp';input.hidden=true;document.body.append(input);
 input.oncancel=()=>input.remove();
 input.onchange=async()=>{
  const file=input.files?.[0];input.remove();if(!file)return;picking=true;
  try{await cropImage(file,kind,blob=>saveProfileMedia(account,kind,blob))}catch(error){toast(error.message)}finally{picking=false}
 };
 input.click();
}
function editProfile(account){
 modal(`<h2>Profili düzenle</h2><label for="profileName">İsim</label><input id="profileName" name="name" value="${escape(account.name)}" required maxlength="35">${cityPickerMarkup(account.city)}<div class="profile-media-actions"><button type="button" id="editAvatarFromForm">Profil fotoğrafını değiştir</button><button type="button" id="editBannerFromForm">Kapak görselini değiştir</button></div><p class="notice">Görseller kırpma ekranındaki “Kırp ve kaydet” düğmesiyle ayrı kaydedilir.</p><p id="profileError" class="error" role="status"></p>`,d=>{
  const name=d.get('name').trim();if(!name){$('profileError').textContent='İsim boş olamaz.';return false}
  if(user!==account){$('profileError').textContent='Oturum değişti. Profilini yeniden aç.';return false}
  const previous={name:account.name,city:account.city};account.name=name;account.city=canonicalCity(d.get('city'));
  try{save()}catch(error){Object.assign(account,previous);$('profileError').textContent='Değişiklikler kaydedilemedi.';return false}
  header();profile(account);toast('Profilin güncellendi.');
 });
 bindCityPicker($('cityPicker'));
 $('editAvatarFromForm').onclick=()=>chooseMedia(account,'avatar');$('editBannerFromForm').onclick=()=>chooseMedia(account,'banner');
}
export function profile(u){
 const own=u.id===user.id;
 const banner=`<div class="banner profile-cover">${u.banner?`<img src="${escape(u.banner)}" alt="Profil kapak görseli">`:''}${own?`<button type="button" id="editBanner" class="media-edit cover-edit" aria-label="Kapak görselini değiştir" title="Kapak görselini değiştir">${pencil}<span>Kapak görselini değiştir</span></button>`:''}</div>`;
 const picture=own?`<button type="button" id="editAvatar" class="profile-avatar-button" aria-label="Profil fotoğrafını değiştir" title="Profil fotoğrafını değiştir">${avatar(u)}<span class="avatar-edit-overlay">${pencil}</span></button>`:avatar(u);
 $('view').innerHTML=banner+`<div class="profile-info">${picture}<div><h1 style="margin:0">${escape(u.name)}</h1><span class="badge">${escape(u.level)}</span> <span class="muted">${escape(u.city||'Şehir belirtilmedi')}</span></div></div><div class="grid"><div class="card stat"><span class="muted">XP</span><strong>${u.xp}</strong></div><div class="card stat"><span class="muted">Çözülen içerik</span><strong>${u.stats.total}</strong></div><div class="card stat"><span class="muted">Set</span><strong>${u.sets.length}</strong></div></div><p class="notice section">Seviye rozeti, etiketlenen ve tekrar edilen kelimelerden hesaplanan tahmini bir ilerleme göstergesidir; resmi CEFR sonucu değildir.</p>`+(own?'<button id="editProfile" class="primary">Profili düzenle</button> <button id="export">Verileri indir</button> <button id="out">Çıkış yap</button>':'<button id="return">Sıralamaya dön</button>');
 $('view').insertAdjacentHTML('beforeend','<div class="section"><h2>Oluşturduğu çalışma setleri</h2>'+u.sets.map(s=>'<div class="card"><button data-profile-set="'+escape(s.id)+'"><strong>'+escape(s.name)+'</strong></button><p class="muted">'+s.items.length+' içerik</p></div>').join('')+'</div>');
 $('view').querySelectorAll('[data-profile-set]').forEach(b=>b.onclick=()=>go('detail',b.dataset.profileSet));
 if(!own){$('return').onclick=()=>go('leaderboard');return}
 $('out').onclick=$('logout').onclick;
 $('export').onclick=()=>{const a=document.createElement('a'),{hash,salt,...data}=u;a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.download='wordshift-yedek.json';a.click();URL.revokeObjectURL(a.href)};
 $('editProfile').onclick=()=>editProfile(u);$('editAvatar').onclick=()=>chooseMedia(u,'avatar');$('editBanner').onclick=()=>chooseMedia(u,'banner');
 if(!u.guest)void mountSocial(u.id);
}
