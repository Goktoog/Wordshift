import { editGoal } from './goals.js';
import { $, uid } from '../core/utils.js';
import { db, user, save, setUser, timer, setSession, setSharedSet, setPage } from '../core/state.js';
import { applyTheme } from './settings.js';
import { stopOnline } from '../games/online.js';
import { room } from '../services/pvp.js';
import { startGuest, loadGuest, clearGuest, GUEST_KEY } from '../services/local-storage.js';
import { go } from '../core/router.js';
import { client, loadCloud, flushCloud, resetCloud, SITE_URL } from '../services/cloud.js';

const RECOVERY_URL = SITE_URL + '?auth=recovery';
let mode = 'login', authEpoch = 0, busy = false, recoveryReady = false;
const eye = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
const eyeOff = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 3 18 18M10.6 5.1 12 5c6.5 0 10 7 10 7a19 19 0 0 1-3 3.8M6.2 6.2A21 21 0 0 0 2 12s3.5 7 10 7a12 12 0 0 0 5.8-1.8M10 10a3 3 0 0 0 4 4"/></svg>';
function makeUser(name, email, guest = false) {
 return { id:uid(), name, email, guest, avatar:'', banner:'', city:'', xp:0, level:'A1', folders:[], sets:[], stats:{correct:0,total:0} };
}
function message(text = '', error = false) { $('authMessage').textContent=text; $('authMessage').dataset.error=String(error); }
function concealPasswords(clear = false) {
 document.querySelectorAll('[data-password]').forEach(b=>{const input=$(b.dataset.password); input.type='password'; if(clear) input.value=''; b.setAttribute('aria-pressed','false'); b.setAttribute('aria-label',b.dataset.password==='password'?'Şifreyi göster':'Şifre tekrarını göster'); b.innerHTML=eye;});
}
function setBusy(value) {
 busy=value;
 document.querySelectorAll('#auth button').forEach(b=>b.disabled=value);
 $('authSubmit').disabled=value || (mode==='reset'&&!recoveryReady);
 $('authForm').setAttribute('aria-busy',String(value));
}
function setMode(next) {
 mode=next; const signup=next==='signup', reset=next==='reset', forgot=next==='forgot', normal=signup||next==='login';
 document.querySelector('.auth-tabs').hidden=!normal;
 document.querySelectorAll('[data-auth]').forEach(b=>b.classList.toggle('active',b.dataset.auth===next));
 $('nameField').hidden=!signup; $('signupName').disabled=!signup; $('signupName').required=signup;
 $('emailField').hidden=reset; $('email').disabled=reset;
 $('passwordField').hidden=forgot; $('password').disabled=forgot;
 $('confirmPasswordField').hidden=!(signup||reset); $('confirmPassword').disabled=!(signup||reset); $('confirmPassword').required=signup||reset;
 $('password').autocomplete=signup||reset?'new-password':'current-password';
 $('passwordLabel').textContent=reset?'Yeni şifre':'Şifre';
 $('googleAuth').hidden=!normal; $('authDivider').hidden=!normal;
 $('googleLabel').textContent=signup?'Google ile kayıt ol':'Google ile giriş yap';
 $('forgotPassword').hidden=next!=='login'; $('authBack').hidden=normal;
 $('guestBoard').hidden=!normal; $('guest').hidden=!normal; $('authNotice').hidden=!normal;
 $('authTitle').textContent={login:'Hoş geldin.',signup:'Hesabını oluştur.',forgot:'Şifreni sıfırla.',reset:'Yeni şifreni belirle.'}[next];
 $('authInfo').textContent={login:'Hesabınla çalışma alanına devam et.',signup:'Kendi kelimelerin, kendi çalışma alanın.',forgot:'Hesabının e-posta adresine sıfırlama bağlantısı gönderelim.',reset:'Yeni şifreni iki alana da yaz.'}[next];
 $('authSubmit').textContent={login:'Giriş yap',signup:'Üye ol',forgot:'Sıfırlama bağlantısı gönder',reset:'Yeni şifreyi kaydet'}[next];
 concealPasswords(true); message(); setBusy(busy);
}
function clearAuthUrl() {
 const url=new URL(window.location.href); url.searchParams.delete('auth');
 if(/(?:access_token|refresh_token|error|type)=/.test(url.hash)) url.hash='';
 history.replaceState(history.state,'',url.pathname+url.search+url.hash);
}
function show(u, initialPage='home') {
 setUser(u);
 if(!u.guest){db.users=db.users.filter(x=>x.id!==u.id);db.users.push(u);db.active=u.id;save()}
 $('auth').hidden=true; $('app').hidden=false; concealPasswords(true); go(initialPage);
 if(!u.learningGoal && initialPage==='home')editGoal(()=>go('home',null,false));
}
async function login(account, epoch) {
 const valid=()=>epoch===authEpoch&&mode!=='reset';
 const name=account.user_metadata?.display_name||account.user_metadata?.full_name||account.user_metadata?.name||'Kullanıcı';
 const u=await loadCloud(account,()=>makeUser(name,account.email),valid);
 if(u&&valid()) { clearGuest();clearAuthUrl(); show(u); }
}
function leaveWorkspace() { stopOnline();clearInterval(timer); setSession(null); setSharedSet(null); setPage('home'); }
function showAuth() { const wasGuest=user?.guest;leaveWorkspace(); resetCloud(); setUser(null); db.active=null; if(wasGuest){clearGuest();applyTheme()}else save(); $('app').hidden=true; $('auth').hidden=false; }
function enterRecovery(session) {
 authEpoch++; recoveryReady=!!session; showAuth(); setMode('reset');
 if(!session) message('Sıfırlama bağlantısı geçersiz veya süresi dolmuş. Giriş ekranına dönüp yeni bağlantı iste.',true);
}
export function initAuth() {
 // Read the recovery marker before the SDK consumes and removes the token fragment.
 const url=new URL(window.location.href), fragment=new URLSearchParams(url.hash.slice(1));
 const recovery=url.searchParams.get('auth')==='recovery'||fragment.get('type')==='recovery';
 const callbackError=fragment.get('error_description')||url.searchParams.get('error_description');
 if(recovery) setMode('reset'); else setMode('login');
 if(callbackError) { clearAuthUrl(); message('Giriş bağlantısı kullanılamadı veya işlem iptal edildi. Lütfen tekrar dene.',true); }
 document.querySelectorAll('[data-password]').forEach(b=>b.onclick=()=>{
  const input=$(b.dataset.password), visible=input.type==='password'; input.type=visible?'text':'password';
  b.setAttribute('aria-pressed',String(visible)); b.setAttribute('aria-label',visible?'Şifreyi gizle':(b.dataset.password==='password'?'Şifreyi göster':'Şifre tekrarını göster')); b.innerHTML=visible?eyeOff:eye;
 });
 document.querySelectorAll('[data-auth]').forEach(b=>b.onclick=()=>{if(!busy){authEpoch++;setMode(b.dataset.auth)}});
 $('forgotPassword').onclick=()=>{if(!busy){authEpoch++;setMode('forgot');$('email').focus()}};
 $('authBack').onclick=async()=>{
  if(busy)return; authEpoch++; setBusy(true);
  try { if(mode==='reset'){const c=await client();const {error}=await c.auth.signOut({scope:'local'});if(error)throw error;showAuth()} clearAuthUrl(); recoveryReady=false; setMode('login'); }
  catch(e){message(authError(e),true)} finally{setBusy(false)}
 };
 $('googleAuth').onclick=async()=>{
  if(busy)return;authEpoch++;setBusy(true);message('Google hesabına yönlendiriliyorsun…');
  try{const c=await client();const {error}=await c.auth.signInWithOAuth({provider:'google',options:{redirectTo:SITE_URL}});if(error)throw error}
  catch(e){message(authError(e),true)}finally{setBusy(false)}
 };
 $('authForm').onsubmit=async e=>{
  e.preventDefault();if(busy)return;const action=mode,epoch=++authEpoch;
  const email=$('email').value.trim(),password=$('password').value,name=$('signupName').value.trim();
  message();
  if((action==='signup'||action==='reset')&&password!==$('confirmPassword').value){message('Şifreler eşleşmiyor.',true);$('confirmPassword').focus();return}
  if(action!=='forgot'&&password.length<6){message('Şifre en az 6 karakter olmalı.',true);return}
  if(action==='signup'&&!name){message('Kullanıcı adını yaz.',true);return}
  if(action==='reset'&&!recoveryReady){message('Geçerli bir sıfırlama bağlantısı açmalısın.',true);return}
  setBusy(true);message('Bağlanılıyor…');
  try {
   const c=await client();
   if(action==='forgot'){
    const {error}=await c.auth.resetPasswordForEmail(email,{redirectTo:RECOVERY_URL});if(error)throw error;
    message('Bu adres için uygun bir hesap varsa şifre sıfırlama bağlantısı gönderildi. Gelen kutunu ve spam klasörünü kontrol et.');return;
   }
   if(action==='reset'){
    const {error}=await c.auth.updateUser({password});if(error)throw error;
    recoveryReady=false;clearAuthUrl();setMode('login');
    // Keep the recovery session out of the workspace until a fresh password login.
    const {error:signOutError}=await c.auth.signOut({scope:'local'});
    if(signOutError){message('Şifren güncellendi. Oturum kapatılamadı; sayfayı yenileyebilirsin.',true);return}
    showAuth();message('Şifren güncellendi. Yeni şifrenle giriş yapabilirsin.');return;
   }
   const result=action==='signup'
    ?await c.auth.signUp({email,password,options:{emailRedirectTo:SITE_URL,data:{display_name:name}}})
    :await c.auth.signInWithPassword({email,password});
   if(result.error)throw result.error;
   if(result.data.session){await login(result.data.user,epoch);message()}
   else{concealPasswords(true);message('E-postandaki doğrulama bağlantısına tıkla, ardından giriş yap.')}
  }catch(err){message(authError(err),true)}finally{setBusy(false)}
 };
 const enterGuest=page=>{authEpoch++;resetCloud();show(startGuest(makeUser('Misafir','',true)),page)};
 $('guestBoard').onclick=()=>{if(!busy)enterGuest('leaderboard')};
 $('guest').onclick=()=>{
  if(busy)return;
  enterGuest('home');
 };
 const sessionGone=e=>e?.name==='AuthSessionMissingError'||/auth session missing/i.test(e?.message||'');
 $('logout').onclick=async()=>{
  authEpoch++;
  try {
   const guest=user?.guest;
   if(guest&&user.roomId)void room(user.roomId,'leave').catch(()=>{});
   if(!guest){
     // Oturum zaten düşmüşse (süresi dolmuş, başka cihazdan çıkılmış) çıkış yine de tamamlanmalı.
     try{await flushCloud()}catch(e){if(!sessionGone(e))throw e}
     const c=await client();const {error}=await c.auth.signOut({scope:'local'});
     if(error&&!sessionGone(error))throw error;
    }
   showAuth();setMode('login');if(guest)message('Misafir oturumun sona erdi.');
  }catch(e){alert(e.message)}
 };
 const restored=loadGuest();
 if(restored&&!recovery&&!callbackError&&!url.hash.includes('access_token=')&&!url.searchParams.has('code'))show(restored);
 const checkGuest=()=>{
  if(user?.guest&&loadGuest()?.id!==user.id){
    leaveWorkspace();resetCloud();setUser(null);applyTheme();$('app').hidden=true;$('auth').hidden=false;setMode('login');
  }
 };
 window.addEventListener('storage',event=>{if(event.key===GUEST_KEY||event.key===null)checkGuest()});
 window.addEventListener('pageshow',checkGuest);window.addEventListener('focus',checkGuest);
 const startupEpoch=authEpoch;
 void(async()=>{
  try {
   const c=await client();
   // Do not await another SDK operation inside an auth event callback.
   c.auth.onAuthStateChange((event,session)=>{
    if(event==='PASSWORD_RECOVERY') enterRecovery(session);
   });
   const {data,error}=await c.auth.getSession();if(error)throw error;
   if(mode==='reset'){recoveryReady=!!data.session;setBusy(busy);if(!recoveryReady)message('Sıfırlama bağlantısı geçersiz veya süresi dolmuş. Giriş ekranına dönüp yeni bağlantı iste.',true);return}
   if(data.session&&startupEpoch===authEpoch&&!callbackError)await login(data.session.user,startupEpoch);
  }catch(e){message(authError(e),true)}
 })();
}
function authError(e) {
 const text=e.message||'',code=e.code||'';
 if(code==='invalid_credentials')return 'E-posta veya şifre hatalı.';
 if(code==='email_not_confirmed')return 'Giriş yapmadan önce e-posta adresini doğrula.';
 if(code==='same_password')return 'Yeni şifren eski şifrenden farklı olmalı.';
 if(code==='weak_password')return 'Bu şifre yeterince güçlü değil. Daha uzun ve farklı karakterler içeren bir şifre seç.';
 if(code==='over_email_send_rate_limit'||/rate limit/i.test(text))return 'E-posta gönderim sınırına ulaşıldı. Bir süre sonra tekrar dene.';
 if(/not authorized|email_address_not_authorized/i.test(text+' '+code))return 'Bu adrese e-posta gönderilemiyor. Site yöneticisi Supabase SMTP ayarını tamamlamalı.';
 if(/provider.*not enabled|unsupported provider/i.test(text))return 'Google ile giriş henüz etkin değil. Site yöneticisi Supabase Google ayarını tamamlamalı.';
 if(/fetch|network/i.test(text))return 'Bağlantı kurulamadı. İnternet bağlantını kontrol edip tekrar dene.';
 return text||'İşlem tamamlanamadı. Lütfen tekrar dene.';
}
