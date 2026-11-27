import { forbiddenWords } from '../games/taboo-cards.js';
import { user, save } from '../core/state.js';
import { mixedQuestions, buzzerOptions } from '../games/buzzer-deck.js';
import { client, flushCloud } from './cloud.js';
async function playRpc(name,params){
 const guest=user?.guest?user:null;
 const c=await client();
 const {data,error}=await c.rpc((guest?'wordshift_guest_':'wordshift_pvp_')+name,
   guest?{...params,guest_key:guest.matchKey,guest_level:guest.level}:params);
 if(error)throw friendly(error);
 return data;
}
export function gameWords(mode,set){
 const candidates=mode==='buzzer'?mixedQuestions(set?.items||[]):[];
 const words=mode==='buzzer'?candidates.map(x=>({type:x.type,front:x.front,back:x.back,options:buzzerOptions(x,candidates)})):(set?.items||[]).filter(x=>x.type==='word').slice().sort(()=>Math.random()-.5).slice(0,100).map(x=>({front:x.front,back:x.back,...(mode==='taboo'?{banned:forbiddenWords(x)}:{})}));
 return words;
}
export async function lobby(action,{mode='meteor',set=null,code='',pool=''}={}) {
 if(!user?.guest&&(action==='create'||action==='quick'))await flushCloud();
 const words=['quick','create'].includes(action)?gameWords(mode,set):[];
 const owner=user;
 const id=await playRpc('lobby',{action,game_mode:mode,words,set_title:set?.name||'',room_code:code,...(pool?{pool_level:pool}:{})});
 if(owner?.guest&&user===owner&&owner.roomId!==id){owner.roomId=id;save()}
 return id;
}
export async function room(id,action='poll',token=0,value=-1,extra=null){
 return playRpc('room',{room_id:id,action,token,value,extra});
}
function friendly(error){
 if(error.code==='PGRST202'||/function.*does not exist|schema cache/i.test(error.message))return Error('Çevrimiçi oyun kurulumu eksik. Site sahibi Supabase SQL Editor’da supabase/pvp.sql dosyasını çalıştırmalı.');
 return Error(error.message||'Sunucuya ulaşılamadı. Bağlantını kontrol et.');
}
export async function pools(pool=''){return playRpc('pools',pool?{pool_level:pool}:{})}
export async function matchHistory(offset=0){const c=await client();const {data,error}=await c.rpc('wordshift_pvp_history',{page_offset:offset});if(error)throw friendly(error);return data||[]}
