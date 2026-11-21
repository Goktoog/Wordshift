import { $, uid } from '../core/utils.js';
import { db, save, setUser, timer } from '../core/state.js';
import { sample } from '../core/sample-data.js';
import { go } from '../core/router.js';
import {client,loadCloud,flushCloud,resetCloud,SITE_URL} from '../services/cloud.js';
function makeUser(name,email,guest=false){return{id:uid(),name,email,guest,avatar:'',banner:'',city:'',xp:0,level:'A1',folders:[{id:'yds',name:'YDS çalışma'}],sets:[{id:uid(),name:'YDS bağlaçlar · örnek',folder:'yds',items:sample.map(x=>({...x,id:uid()}))}],stats:{correct:0,total:0}}}
function show(u){db.users=db.users.filter(x=>x.id!==u.id);db.users.push(u);setUser(u);db.active=u.id;save();$('auth').hidden=true;$('app').hidden=false;$('password').value='';go('home')}
async function login(account){const u=await loadCloud(account,()=>makeUser(account.user_metadata?.display_name||'Kullanıcı',account.email));show(u)}
let mode='login';
export function initAuth(){
 document.querySelectorAll('[data-auth]').forEach(b=>b.onclick=()=>{mode=b.dataset.auth;document.querySelectorAll('[data-auth]').forEach(x=>x.classList.toggle('active',x===b));$('nameField').hidden=mode==='login';$('authTitle').textContent=mode==='login'?'Hoş geldin.':'Hesabını oluştur.';$('authSubmit').textContent=mode==='login'?'Giriş yap':'Üye ol';$('authMessage').textContent=''});
 $('authForm').onsubmit=async e=>{e.preventDefault();$('authSubmit').disabled=true;$('authMessage').textContent='Bağlanılıyor…';try{const c=await client(),email=$('email').value.trim(),password=$('password').value;let result;if(mode==='signup'){const name=$('signupName').value.trim();if(!name)throw Error('Kullanıcı adını yaz.');result=await c.auth.signUp({email,password,options:{emailRedirectTo:SITE_URL,data:{display_name:name}}});}else result=await c.auth.signInWithPassword({email,password});if(result.error)throw result.error;if(result.data.session){await login(result.data.user);$('authMessage').textContent=''}else{$('authMessage').textContent='E-postandaki doğrulama bağlantısına tıkla, ardından giriş yap.';$('password').value=''}}catch(e){$('authMessage').textContent=e.message}finally{$('authSubmit').disabled=false}};
 $('guest').onclick=()=>{if(!confirm('Misafir çalışmaları yalnızca bu tarayıcıda saklanır. Online yedekleme ve sosyal özellikler için üye olmanı öneririz. Devam edilsin mi?'))return;resetCloud();show(db.users.find(x=>x.guest)||makeUser('Misafir','',true))};
 $('logout').onclick=async()=>{try{await flushCloud();const c=await client();const {error}=await c.auth.signOut();if(error)throw error;resetCloud();clearInterval(timer);db.active=null;setUser(null);save();$('app').hidden=true;$('auth').hidden=false}catch(e){alert(e.message)}};
 void (async()=>{try{const c=await client();const {data,error}=await c.auth.getSession();if(error)throw error;if(data.session)await login(data.session.user)}catch(e){$('authMessage').textContent=e.message}})();
}
