import { $, escape } from '../core/utils.js';
import { session } from '../core/state.js';
import { record, levelMiss, finish, topStudy, exitBind } from '../features/session.js';
import { toast, sound } from '../ui/feedback.js';

// Kelime blokları: solda İngilizce, sağda Türkçe. Her satırda bir İngilizce ve bir Türkçe blok durur; çiftleri bul.
export function match(){
  const s=session;
  if(s.done.length===s.pool.length){s.score=s.done.length;finish();return}
  const rows=s.left.flatMap((c,i)=>[c,s.right[i]]);
  $('view').innerHTML=topStudy('Kelime blokları')+'<p class="muted">'+s.done.length+' / '+s.pool.length+' eşleşme · önce bir İngilizce, sonra Türkçe karşılığını seç</p><div class="match two-columns blocks"><span class="eyebrow">İngilizce</span><span class="eyebrow">Türkçe</span>'+rows.map((c,i)=>{
    const done=s.done.includes(c.x.id);
    return '<button data-card="'+i+'" class="block-'+(c.side==='a'?'en':'tr')+' '+(done?'good':s.pick===c?'selected':'')+'" '+(done?'disabled':'')+'>'+escape(c.side==='a'?c.x.front:c.x.back)+'</button>';
  }).join('')+'</div>';
  exitBind();
  $('view').querySelectorAll('[data-card]').forEach(b=>b.onclick=()=>{
    const c=rows[+b.dataset.card];
    if(!s.pick||s.pick.side===c.side){s.pick=c;match();return}
    if(s.pick.x.id===c.x.id){s.done.push(c.x.id);record(c.x,true)}else{levelMiss(s.pick.x);sound(false);toast('Yanlış eşleştirme')}
    s.pick=null;match();
  });
}
