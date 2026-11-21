export const SITE_URL='https://goktoog.github.io/Wordshift_v0.3/';
const PROJECT_URL='https://ageaooejmhwxpaajelbw.supabase.co';
const PUBLIC_KEY='sb_publishable_l3IkwW8JfvXBkfFQO37b9A_JQxnXyZ6';
let promise, revision=null, pending=null, running=false, owner=null;
export function client(){return promise ||= import('https://esm.sh/@supabase/supabase-js@2.49.8').then(({createClient})=>createClient(PROJECT_URL,PUBLIC_KEY));}
function status(message){let el=document.getElementById('cloudStatus');if(el)el.textContent=message;}
export async function loadCloud(account,create){
 const c=await client();const {data,error}=await c.from('wordshift_workspaces').select('document,revision').eq('user_id',account.id).maybeSingle();
 if(error)throw Error('Veriler yüklenemedi. Supabase kurulumu tamamlandı mı? '+error.message);
 owner=account.id;revision=data?.revision??0;
 const result=data?.document||create();
 return {...result,id:account.id,email:account.email,guest:false};
}
export function queueCloud(user){if(!user||user.guest||user.id!==owner)return;pending=JSON.parse(JSON.stringify(user));status('Buluta kaydediliyor…');void drain();}
async function drain(){if(running)return;running=true;try{while(pending){const value=pending;pending=null;const c=await client();const {data,error}=await c.rpc('wordshift_save',{payload:value,expected_revision:revision});if(error){pending=value;throw error}revision=data;status('✓ Buluta kaydedildi')}}catch(e){status('Kaydedilemedi: '+e.message+' · Verilerini indirerek yedekle.');}finally{running=false}}
export async function flushCloud(){if(pending&&!running)void drain();while(running)await new Promise(r=>setTimeout(r,80));if(pending)throw Error('Kaydedilmemiş değişiklikler var. Bağlantını kontrol et.');}
export function resetCloud(){owner=null;revision=null;pending=null;}
export async function uploadImage(file,kind){
 if(!owner)throw Error('Görsel yüklemek için giriş yap.');
 const c=await client(),path=owner+'/'+kind+'-'+crypto.randomUUID()+'.webp';
 const {error}=await c.storage.from('profile-media').upload(path,file,{contentType:'image/webp',upsert:false});if(error)throw error;
 return c.storage.from('profile-media').getPublicUrl(path).data.publicUrl;
}
