import { client, flushCloud } from './cloud.js';
export async function lobby(action,{mode='meteor',set=null,code='',pool=''}={}) {
 if(action==='create'||action==='quick')await flushCloud();
 const words=(set?.items||[]).filter(x=>x.type==='word').slice().sort(()=>Math.random()-.5).slice(0,100).map(x=>({front:x.front,back:x.back}));
 const c=await client();const {data,error}=await c.rpc('wordshift_pvp_lobby',{action,game_mode:mode,words,set_title:set?.name||'',room_code:code,...(pool?{pool_level:pool}:{})});if(error)throw friendly(error);return data;
}
export async function room(id,action='poll',token=0,value=-1,extra=null){
 const c=await client();const {data,error}=await c.rpc('wordshift_pvp_room',{room_id:id,action,token,value,extra});if(error)throw friendly(error);return data;
}
function friendly(error){
 if(error.code==='PGRST202'||/function.*does not exist|schema cache/i.test(error.message))return Error('Çevrimiçi oyun kurulumu eksik. Site sahibi Supabase SQL Editor’da supabase/pvp.sql dosyasını çalıştırmalı.');
 return Error(error.message||'Sunucuya ulaşılamadı. Bağlantını kontrol et.');
}
export async function pools(pool=''){const c=await client();const {data,error}=await c.rpc('wordshift_pvp_pools',pool?{pool_level:pool}:{});if(error)throw friendly(error);return data}
export async function matchHistory(offset=0){const c=await client();const {data,error}=await c.rpc('wordshift_pvp_history',{page_offset:offset});if(error)throw friendly(error);return data||[]}
