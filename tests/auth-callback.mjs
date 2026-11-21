import {registerHooks} from 'node:module';
import {Window} from 'happy-dom';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const scenario=process.argv[2];
if(!scenario){for(const x of ['google','recovery','hash-recovery','expired','cancelled','stale'])execFileSync(process.execPath,[new URL(import.meta.url).pathname,x],{stdio:'inherit'});process.exit(0)}
registerHooks({load(url,context,next){if(url.endsWith('/services/cloud.js'))return {format:'module',shortCircuit:true,source:`export const client=async()=>globalThis.authClient;export const queueCloud=()=>{};export const flushCloud=async()=>{};export const resetCloud=()=>{};export const uploadImage=async()=>'';export const loadCloud=async(account,create,isCurrent)=>{globalThis.loads++;if(globalThis.waitLoad)await globalThis.waitLoad;return isCurrent()?({...create(),id:account.id,email:account.email,guest:false}):null};export const SITE_URL='https://goktoog.github.io/Wordshift/';`};return next(url,context)}});
const suffix={recovery:'?auth=recovery#access_token=fake&type=recovery','hash-recovery':'#access_token=fake&type=recovery',expired:'?auth=recovery#error=access_denied&error_description=Expired',cancelled:'#error=access_denied&error_description=Cancelled'}[scenario]||'#access_token=fake&type=signup';
const w=new Window({url:'https://goktoog.github.io/Wordshift/'+suffix,settings:{disableJavaScriptEvaluation:true,disableCSSFileLoading:true}});
Object.assign(globalThis,{window:w,document:w.document,history:w.history,localStorage:w.localStorage,confirm:()=>true,alert:()=>{},loads:0});
document.write(readFileSync(new URL('../frontend/index.html',import.meta.url),'utf8').replace(/<script[^>]*>[\s\S]*?<\/script>/g,''));
let release;if(scenario==='stale')globalThis.waitLoad=new Promise(r=>release=r);
const account={id:'google-user',email:'person@example.com',user_metadata:{full_name:'Ayşe Yılmaz'}};
globalThis.authClient={auth:{onAuthStateChange:()=>({}),getSession:async()=>({data:{session:['expired','cancelled'].includes(scenario)?null:{user:account}}})}};
const {initAuth}=await import('../frontend/src/features/auth.js');
const {initNavigation}=await import('../frontend/src/core/router.js');
const state=await import('../frontend/src/core/state.js');
initNavigation();initAuth();await new Promise(r=>setTimeout(r,20));
const $=id=>document.getElementById(id);
if(scenario==='google'){assert.equal(state.user.name,'Ayşe Yılmaz');assert.equal(state.user.id,'google-user');assert.equal(w.location.hash,'');assert.equal($('auth').hidden,true)}
if(['recovery','hash-recovery'].includes(scenario)){assert.equal(state.user,null);assert.equal(loads,0);assert.equal($('authTitle').textContent,'Yeni şifreni belirle.');assert.equal($('authSubmit').disabled,false)}
if(scenario==='expired'){assert.equal(state.user,null);assert.equal($('authSubmit').disabled,true);assert.match($('authMessage').textContent,/süresi dolmuş/)}
if(scenario==='cancelled'){assert.equal(state.user,null);assert.match($('authMessage').textContent,/iptal edildi/);assert.equal(w.location.hash,'')}
if(scenario==='stale'){$('guest').click();assert.equal(state.user.guest,true);release();await new Promise(r=>setTimeout(r,20));assert.equal(state.user.guest,true);assert.equal(state.db.users.some(x=>x.id==='google-user'),false)}
await w.happyDOM.abort();console.log('PASS auth callback (mocked): '+scenario);
