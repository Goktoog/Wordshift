import { $, uid } from '../core/utils.js';
import { db, save, setUser, timer } from '../core/state.js';
import { sample } from '../core/sample-data.js';
import { go } from '../core/router.js';

function makeUser(name,email,guest=false){return{id:uid(),name,email,guest,avatar:'',banner:'',city:'',xp:0,level:'A1',folders:[{id:'yds',name:'YDS çalışma'}],sets:[{id:uid(),name:'YDS bağlaçlar · örnek',folder:'yds',items:sample.map(x=>({...x,id:uid()}))}],stats:{correct:0,total:0}}}
async function hash(p,s){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s+p));return [...new Uint8Array(b)].map(n=>n.toString(16).padStart(2,'0')).join('')}
function login(u){setUser(u);db.active=u.id;save();$('auth').hidden=true;$('app').hidden=false;$('password').value='';go('home')}
let authMode='login';
export function initAuth(){
document.querySelectorAll('[data-auth]').forEach(b=>b.onclick=()=>{authMode=b.dataset.auth;document.querySelectorAll('[data-auth]').forEach(x=>x.classList.toggle('active',x===b));$('nameField').hidden=authMode==='login';$('authTitle').textContent=authMode==='login'?'Hoş geldin.':'Hesabını oluştur.';$('authSubmit').textContent=authMode==='login'?'Giriş yap':'Üye ol';$('authMessage').textContent=''});
$('authForm').onsubmit=async e=>{e.preventDefault();let email=$('email').value.trim().toLowerCase(),p=$('password').value;try{if(authMode==='signup'){if(db.users.some(x=>x.email===email))throw Error('Bu tarayıcıda bu e-posta zaten kayıtlı.');let u=makeUser($('signupName').value.trim()||email.split('@')[0],email);u.salt=uid();u.hash=await hash(p,u.salt);db.users.push(u);login(u)}else{let u=db.users.find(x=>x.email===email);if(!u||!u.hash||await hash(p,u.salt)!==u.hash)throw Error('E-posta veya şifre hatalı.');login(u)}}catch(err){$('authMessage').textContent=err.message}};
$('guest').onclick=()=>{if(!confirm('Misafir olarak çalışmaların yalnızca bu tarayıcıda saklanır. Online yedekleme, liderlik ve diğer kullanıcılarla yarışma için üyelik gerekir. Misafir olarak devam etmek istiyor musun?'))return;let u=db.users.find(x=>x.guest);if(!u){u=makeUser('Misafir','',true);db.users.push(u)}login(u)};$('logout').onclick=()=>{clearInterval(timer);db.active=null;save();setUser(null);$('app').hidden=true;$('auth').hidden=false};
let active=db.users.find(u=>u.id===db.active);if(active)login(active);
}
