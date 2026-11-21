import {$,escape,shuffle} from '../core/utils.js';
import {session,timer,setTimer,page} from '../core/state.js';
import {record,finish,topStudy,exitBind} from '../features/session.js';
export function mountSentence(host,options,onSubmit){
 let order=[],locked=false;
 host.innerHTML='<p>Türkçe cümlenin İngilizcesini kur. Kelimelere sırayla dokun; seçilen kelimeye tekrar dokunarak geri al.</p><div class="sentence-line" aria-label="Kurduğun cümle"></div><div class="sentence-tokens"></div><button class="primary sentence-submit">Cümleyi gönder</button><button class="sentence-reset">Temizle</button>';
 const line=host.querySelector('.sentence-line'),tokens=host.querySelector('.sentence-tokens'),submit=host.querySelector('.sentence-submit'),reset=host.querySelector('.sentence-reset');
 function draw(){line.innerHTML=order.map(i=>`<button data-undo="${i}" ${locked?'disabled':''}>${escape(options[i])}</button>`).join('')||'<span class="muted">Cümleni burada oluştur…</span>';tokens.innerHTML=options.map((word,i)=>`<button data-token="${i}" ${locked||order.includes(i)?'disabled':''}>${escape(word)}</button>`).join('');submit.disabled=locked||order.length!==options.length;reset.disabled=locked;line.querySelectorAll('[data-undo]').forEach(b=>b.onclick=()=>{order=order.filter(i=>i!==+b.dataset.undo);draw()});tokens.querySelectorAll('[data-token]').forEach(b=>b.onclick=()=>{order.push(+b.dataset.token);draw()})}
 reset.onclick=()=>{order=[];draw()};submit.onclick=()=>{if(locked)return;locked=true;draw();void onSubmit([...order])};draw();
 return {lock(value){if(locked!==value){locked=value;draw()}},stop(){locked=true}};
}
export function sentences(){
 const s=session;clearInterval(timer);if(s.i>=s.pool.length){finish();return}const x=s.pool[s.i],options=shuffle(x.back.split(' ')),deadline=Date.now()+20000;let done=false;
 $('view').innerHTML=topStudy('Cümle Düellosu')+`<div class="card"><div class="top"><h2>${escape(x.front)}</h2><span class="timer" id="sentenceClock">20 sn</span></div><div id="sentenceSolo"></div><p id="sentenceFeedback" role="status"></p></div>`;exitBind();
 const controls=mountSentence($('sentenceSolo'),options,order=>resolve(order.map(i=>options[i]).join(' ')===x.back));
 function resolve(ok){if(done||session!==s||page!=='play')return;done=true;clearInterval(timer);controls.lock(true);ok=ok&&Date.now()<deadline;record(x,ok);if(ok)s.score++;$('sentenceFeedback').textContent=ok?'✓ Doğru cümle!':'✕ Doğrusu: '+x.back;setTimeout(()=>{if(session===s&&page==='play'){s.i++;sentences()}},1800)}
 setTimer(setInterval(()=>{if(session!==s||page!=='play'){clearInterval(tick);return}const remain=Math.max(0,Math.ceil((deadline-Date.now())/1000));$('sentenceClock').textContent=remain+' sn';$('sentenceClock').classList.toggle('urgent-text',remain<=3);if(!remain)resolve(false)},100));const tick=timer;
}
