import { $, escape, shuffle } from '../core/utils.js';
import { session, timer, setTimer, user, page, current } from '../core/state.js';
import { record, begin, opts, finish, topStudy, exitBind, answerMarkup, bindAnswer, equal } from '../features/session.js';
import { toast, sound } from '../ui/feedback.js';
import { runner } from './runner.js';
import { battle } from './battleship.js';
import { match } from './matching.js';

export function play(){let s=session,m=s.m;if(m==='runner'){runner();return}if(m==='battle'){battle();return}if(m==='match'||m==='blocks'){match();return}if(s.i>=s.pool.length){finish();return}let x=s.pool[s.i],o=opts(x);$('view').innerHTML=topStudy('Meteor avı')+'<div class="card"><h2>'+escape(x.front)+'</h2><div class="space"><div class="ship-icon">🚀</div>'+o.map((v,i)=>'<button class="meteor" data-meteor="'+i+'" style="left:'+(i%2?53:4)+'%;top:'+(25+Math.floor(i/2)*105)+'px">☄ '+escape(v)+'</button>').join('')+'</div></div>';exitBind();let arena=$('view').querySelector('.space'),ship=$('view').querySelector('.ship-icon');arena.onpointermove=e=>{ship.style.left=Math.max(0,Math.min(arena.clientWidth-45,e.clientX-arena.getBoundingClientRect().left))+'px'};$('view').querySelectorAll('[data-meteor]').forEach(b=>b.onclick=()=>{if(s.firing)return;s.firing=true;ship.style.transition='left .4s, bottom .4s';ship.style.left=b.offsetLeft+'px';ship.style.bottom=(arena.clientHeight-b.offsetTop-35)+'px';ship.textContent='🚀💨';let ok=equal(o[+b.dataset.meteor],x.back);record(x,ok);toast(ok?'Doğru meteor!':'Doğru: '+x.back);s.score+=ok?1:0;b.classList.add('explode');b.textContent=ok?'✓ 💥':'✕ 💥';setTimeout(()=>{if(session!==s)return;s.firing=false;s.i++;play()},650)})}
