import {registerHooks} from 'node:module';
import {Window} from 'happy-dom';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
registerHooks({load(url,context,next){if(url.endsWith('/services/cloud.js'))return {format:'module',shortCircuit:true,source:`export const client=async()=>globalThis.authClient;export const queueCloud=()=>{};export const flushCloud=async()=>{};export const resetCloud=()=>{};export const uploadImage=async()=>'';export const loadCloud=async(account,create,isCurrent=()=>true)=>isCurrent()?({...create(),id:account.id,email:account.email,guest:false}):null;export const SITE_URL='https://goktoog.github.io/Wordshift/';`};return next(url,context)}});
const w=new Window({url:'http://localhost:3000/',settings:{disableJavaScriptEvaluation:true,disableCSSFileLoading:true}});
Object.assign(globalThis,{window:w,document:w.document,history:w.history,localStorage:w.localStorage,confirm:()=>true,alert:()=>{}});
document.write(readFileSync(new URL('../frontend/index.html',import.meta.url),'utf8').replace(/<script[^>]*>[\s\S]*?<\/script>/g,''));
let signup,signupCalls=0,signOutCalls=0,oauth,resetRequest,updatedPassword,listener,resetError;
const rpcCalls=[];
const publicPlayer={user_id:'public-player',name:'Deniz',city:'İzmir',level:'B1',xp:10,is_admin:true,badge_color:'rose',followers:2,following:0,public_sets:0,answered:1};
globalThis.authClient={rpc:async(name,args)=>{
 rpcCalls.push(name);
 if(name==='wordshift_leaderboard')return {data:[{...publicPlayer,place:1}]};
 if(name==='wordshift_user_profile')return {data:[publicPlayer]};
 if(name==='wordshift_follow_list')return {data:args.kind==='following'?[]:[publicPlayer]};
 if(name==='wordshift_search_sets')return {data:[]};
 throw Error('Unexpected guest RPC: '+name);
},auth:{
 onAuthStateChange:cb=>{listener=cb;return {data:{subscription:{unsubscribe(){}}}}},
 getSession:async()=>({data:{session:null}}),
 signUp:async data=>{signupCalls++;signup=data;return {data:{session:null,user:{id:'real'}}}},
 signInWithPassword:async()=>({data:{session:{},user:{id:'real',email:'test@example.com',user_metadata:{display_name:'Ahmet'}}}}),
 signOut:async()=>{signOutCalls++;return {}},
 signInWithOAuth:async data=>{oauth=data;return {}},
 resetPasswordForEmail:async(email,options)=>{resetRequest={email,options};return {error:resetError}},
 updateUser:async data=>{updatedPassword=data;return {data:{user:{id:'real'}}}}
}};
localStorage.setItem('wordshift-v1',JSON.stringify({active:'old-guest',users:[{id:'old-guest',guest:true},{id:'keep',guest:false}]}));
const {initAuth}=await import('../frontend/src/features/auth.js');
const {initNavigation}=await import('../frontend/src/core/router.js');
const state=await import('../frontend/src/core/state.js');
const $=id=>document.getElementById(id), submit=()=>$('authForm').onsubmit({preventDefault(){}});
initNavigation();initAuth();await new Promise(r=>setTimeout(r,10));
const settle=()=>new Promise(r=>setTimeout(r,0));
$('guestBoard').click();await settle();
assert.ok(!$('myProgress'));assert.ok(!rpcCalls.includes('wordshift_my_rank'));
document.querySelector('[data-scope="city"]').click();$('guestCity').value='İzmir';$('guestCity').onchange();await settle();
document.querySelector('.board-row').click();await settle();assert.ok(!$('followBtn'));assert.equal(document.querySelector('.profile-info #followStats [data-kind="followers"] strong').textContent,'2');
document.querySelector('#followStats [data-kind="followers"]').click();await settle();assert.ok($('dialog').open);assert.match($('modalBody').textContent,/Deniz/);
document.querySelector('.follow-dialog [data-kind="following"]').click();await settle();assert.match($('modalBody').textContent,/Kimse bulunamadı/);$('followClose').click();assert.equal(document.querySelector('.badge-admin').dataset.tone,'rose');
await $('logout').onclick();
$('guest').click();assert.ok(state.user.guest);assert.equal(state.user.sets.length,0);const guestId=state.user.id;state.user.xp=123;state.save();assert.equal(JSON.parse(localStorage.getItem('wordshift-guest-v1')).xp,123);
// Startup restores the local guest before remote session lookup.
state.setUser(null);initAuth();await settle();assert.equal(state.user.id,guestId);assert.equal(state.user.xp,123);assert.equal(state.user.name,'Misafir');
assert.deepEqual(JSON.parse(localStorage.getItem('wordshift-v1')),{active:null,users:[{id:'keep',guest:false}]});
$('guestJoin').click();await new Promise(r=>setTimeout(r,0));assert.equal(state.user,null);assert.equal(signOutCalls,0);assert.equal(localStorage.getItem('wordshift-guest-v1'),null);assert.equal($('auth').hidden,false);
// Both passwords can be shown independently, without submitting.
document.querySelector('[data-auth="signup"]').click();$('signupName').value='Ahmet';$('email').value='test@example.com';$('password').value='test-password';$('confirmPassword').value='different-password';
for(const id of ['password','confirmPassword']){const button=document.querySelector(`[data-password="${id}"]`);button.click();assert.equal($(id).type,'text');assert.equal(button.getAttribute('aria-pressed'),'true');button.click();assert.equal($(id).type,'password')}
await submit();assert.equal(signupCalls,0);assert.match($('authMessage').textContent,/Şifreler eşleşmiyor/);
$('confirmPassword').value='test-password';await submit();assert.equal(signupCalls,1);
assert.equal(signup.options.emailRedirectTo,'https://goktoog.github.io/Wordshift/');assert.match($('authMessage').textContent,/doğrulama/);assert.equal($('confirmPassword').value,'');
await $('googleAuth').onclick();assert.equal(oauth.provider,'google');assert.equal(oauth.options.redirectTo,'https://goktoog.github.io/Wordshift/');
document.querySelector('[data-auth="login"]').click();assert.equal($('confirmPassword').disabled,true);assert.equal($('password').autocomplete,'current-password');
$('password').value='test-password';await submit();assert.equal(state.user.id,'real');assert.equal(state.user.sets.length,0);assert.ok(!state.db.users.some(u=>u.id===guestId));assert.equal($('app').hidden,false);
await $('logout').onclick();assert.equal(state.user,null);assert.equal(signOutCalls,1);assert.equal(state.session,null);
$('forgotPassword').click();assert.equal($('password').disabled,true);assert.equal($('passwordField').hidden,true);
$('email').value='test@example.com';await submit();assert.equal(resetRequest.email,'test@example.com');assert.equal(resetRequest.options.redirectTo,'https://goktoog.github.io/Wordshift/?auth=recovery');assert.match($('authMessage').textContent,/uygun bir hesap varsa/);
resetError={code:'email_address_not_authorized',message:'Email address not authorized'};await submit();assert.match($('authMessage').textContent,/SMTP/);assert.equal($('authSubmit').disabled,false);resetError=null;
listener('PASSWORD_RECOVERY',{user:{id:'real'}});assert.equal($('authTitle').textContent,'Yeni şifreni belirle.');assert.equal($('app').hidden,true);assert.equal($('email').disabled,true);
$('password').value='new-password';$('confirmPassword').value='mismatch';await submit();assert.equal(updatedPassword,undefined);
$('confirmPassword').value='new-password';await submit();assert.deepEqual(updatedPassword,{password:'new-password'});assert.match($('authMessage').textContent,/Şifren güncellendi/);assert.equal($('authTitle').textContent,'Hoş geldin.');assert.equal(state.user,null);assert.equal(signOutCalls,2);
assert.ok(!localStorage.getItem('wordshift')?.includes('new-password'));
await w.happyDOM.abort();console.log('PASS auth UI: isolated guest, independent password toggles, mismatch prevents signup/reset, signup confirmation, OAuth redirect, reset email and SMTP errors, recovery password update, logout.');
