import { escape } from '../core/utils.js';
import { user, page } from '../core/state.js';
import { followList } from '../services/social.js';
import { client } from '../services/cloud.js';
import { gameTitles } from '../games/catalog.js';
import { inviteSound, toast } from '../ui/feedback.js';

async function invitations(action,room=null,peer=null){
 const c=await client();
 const {data,error}=await c.rpc('wordshift_room_invites',{action,room_key:room,peer});
 if(error)throw Error(error.message);
 return data;
}

export function mountInvitePicker(host,room){
 const owner=user;
 host.innerHTML='<h3>Arkadaşını davet et</h3><div class="actions"><button data-kind="following">Takip ettiklerim</button><button data-kind="followers">Takipçilerim</button></div><div data-list></div><p role="status"></p><button data-more hidden>Daha fazla göster</button>';
 const list=host.querySelector('[data-list]'),more=host.querySelector('[data-more]'),note=host.querySelector('[role=status]');
 const sent=new Map();
 let tab,offset,request=0;
 async function load(kind,append=false){
  const ticket=++request;tab=kind;if(!append){offset=0;list.replaceChildren()}
  more.hidden=true;note.textContent='Liste yükleniyor…';
  host.querySelectorAll('[data-kind]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.kind===tab)));
  try{
   const people=await followList(owner.id,kind,offset);
   if(!host.isConnected||request!==ticket||owner!==user)return;
   offset+=people.length;more.hidden=people.length<50;note.textContent=offset?'':'Bu listede henüz kimse yok.';
   for(const person of people){
    const row=document.createElement('div');row.className='invite-person';
    row.innerHTML='<span class="person-initial">'+escape(person.name?.slice(0,1))+'</span><strong>'+escape(person.name)+'</strong><small>'+escape(person.level)+'</small><button>Davet et</button>';
    const button=row.querySelector('button');
    function label(status){button.disabled=true;button.textContent=status==='declined'?'Reddetti':'Davet gönderildi'}
    if(sent.has(person.user_id))label(sent.get(person.user_id));
    button.onclick=async()=>{
     button.disabled=true;
     try{const status=await invitations('send',room,person.user_id);sent.set(person.user_id,status);label(status)}
     catch(e){note.textContent=e.message;button.disabled=false}
    };
    list.append(row);
   }
  }catch(e){if(ticket===request){note.textContent=e.message;more.hidden=false}}
 }
 host.querySelectorAll('[data-kind]').forEach(b=>b.onclick=()=>void load(b.dataset.kind));
 more.onclick=()=>void load(tab,true);
 void load('following');
}

let stop=null;
export function watchInvites(account,onJoin){
 stop?.();stop=null;
 if(!account||account.guest)return;
 const host=document.createElement('aside');host.className='invite-inbox';host.hidden=true;host.setAttribute('aria-label','Oyun davetleri');document.getElementById('app').append(host);
 let polling=false,acting=false,closed=false,signature='',announced=new Set();
 const live=()=>!closed&&user===account;
 async function refresh(){
  if(!live()||polling||acting)return;
  polling=true;
  try{
   const rows=await invitations('inbox');
   if(!live()||acting||!Array.isArray(rows))return;
   const key=rows.map(i=>i.room).join(',');
   if(key===signature)return;signature=key;host.hidden=!rows.length;
   if(rows.some(i=>!announced.has(i.room)))inviteSound();
   announced=new Set(rows.map(i=>i.room));
   host.innerHTML=rows.map(i=>'<section><small>OYUN DAVETİ</small><p><strong>'+escape(i.name)+'</strong> seni '+escape(gameTitles[i.mode])+' oynamaya davet etti.</p><button class="primary" data-join="'+escape(i.room)+'">Katıl</button> <button data-decline="'+escape(i.room)+'">Reddet</button></section>').join('');
   host.querySelectorAll('button').forEach(button=>button.onclick=async()=>{
    if(acting||!live())return;
    const join=button.dataset.join;
    if(join&&['play','study'].includes(page)&&!confirm('Bu çalışmadan ayrılıp davete katılmak istiyor musun?'))return;
    acting=true;button.disabled=true;
    try{
     await invitations(join?'accept':'decline',join||button.dataset.decline);
     if(live()&&join){const dialog=document.getElementById('dialog');if(dialog?.open)dialog.close();onJoin()}
    }catch(e){if(live())toast(e.message)}
    finally{acting=false;button.disabled=false;if(live()){signature='refresh';void refresh()}}
   });
  }catch{/* Retry when the connection returns. */}finally{polling=false}
 }
 const timer=window.setInterval(refresh,5000);
 stop=()=>{closed=true;window.clearInterval(timer);host.remove()};
 void refresh();
}
