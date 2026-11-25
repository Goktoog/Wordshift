import { $, escape } from '../core/utils.js';
import { page, session } from '../core/state.js';
import { exitBind, finish, record, topStudy } from '../features/session.js';

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const normalize = letter => letter.toLocaleLowerCase('en');
const isLetter = letter => /[\p{L}\p{N}]/u.test(letter);

export function detective() {
  const s=session;
  if(s.i>=s.pool.length){finish();return}
  const item=s.pool[s.i],characters=Array.from(item.front.trim().normalize('NFC'));
  const playable=characters.some(isLetter)?isLetter:ch=>ch.trim()!=='';
  const solution=new Set(characters.filter(playable).map(normalize));
  const keys=[...new Set([...Array.from(alphabet, normalize),...solution])];
  const guessed=new Set();
  let left=5,ended=false;
  $('view').innerHTML=topStudy('Kelime Dedektifi')+`<section class="card detective-game" id="detectiveGame" tabindex="-1">
    <div class="top"><strong id="detectiveLives"></strong><span>${s.i+1} / ${s.pool.length}</span></div>
    <div class="detective-clue"><p>Türkçe ipucu</p><h2>${escape(item.back)}</h2>
    <div class="detective-word" id="detectiveWord" aria-label="Gizli kelime"></div></div>
    <p class="muted">İngilizcesini harf harf aç. Bir harfi seçmek için tuşla veya dokun. Beş yanlış tahmin hakkın var.</p>
    <div class="detective-keys" id="detectiveKeys"></div><p id="detectiveFeedback" role="status"></p>
    <button id="detectiveNext" class="primary" hidden></button></section>`;
  exitBind();
  const root=$('detectiveGame'),keyboard=$('detectiveKeys'),next=$('detectiveNext');
  // Keep ordinary keyboard letters stable. Include digits and accented characters for custom sets.
  for(const key of keys){
    const b=document.createElement('button');b.type='button';b.textContent=key.toLocaleUpperCase('en');
    b.onclick=()=>guess(key,b);b.dataset.letter=key;keyboard.append(b);
  }
  function draw(reveal=false){
    $('detectiveLives').textContent='Kalan yanlış hakkı: '+left;
    const display=characters.map(ch=>!playable(ch)||reveal||guessed.has(normalize(ch))?ch:'_');
    $('detectiveWord').textContent=display.join('');
    $('detectiveWord').setAttribute('aria-label',display.map(ch=>ch==='_'?'boş':ch).join(' '));
  }
  function guess(key,button){
    if(ended||!root.isConnected||page!=='play'||session!==s||guessed.has(key))return;
    guessed.add(key);button.disabled=true;
    const found=solution.has(key);
    button.dataset.found=String(found);
    if(!found)left--;
    const solved=[...solution].every(letter=>guessed.has(letter));
    ended=solved||left===0;
    draw(ended);
    const note=$('detectiveFeedback');
    if(!ended){note.textContent=found?'Harf açıldı.':'Bu harf kelimede yok.';root.focus({preventScroll:true});return}
    record(item,solved);
    if(solved)s.score++;
    note.textContent=(solved?'Kelimeyi çözdün! ':'Doğru kelime: ')+item.front;
    keyboard.querySelectorAll('button').forEach(b=>b.disabled=true);
    next.hidden=false;next.textContent=s.i+1===s.pool.length?'Sonucu gör':'Sıradaki kelime';next.focus();
  }
  root.onkeydown=e=>{
    if(e.repeat||e.ctrlKey||e.metaKey||e.altKey||e.key.length!==1)return;
    const key=normalize(e.key),button=[...keyboard.children].find(b=>b.dataset.letter===key);
    if(button&&!button.disabled){e.preventDefault();guess(key,button)}
  };
  next.onclick=()=>{if(root.isConnected&&ended){s.i++;detective()}};
  draw();root.focus({preventScroll:true});
}
