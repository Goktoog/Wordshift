import {gallows} from './gallows.js';
import {detectiveInput,bindDetectiveInput} from './detective-input.js';
import {runOver} from './short-run.js';
import { $ } from '../core/utils.js';
import { page, session } from '../core/state.js';
import { exitBind, finish, record, topStudy } from '../features/session.js';

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const normalize = letter => letter.toLocaleLowerCase('en');
const isLetter = letter => /[\p{L}\p{N}]/u.test(letter);

export function detective() {
  const s=session;
  if(runOver(s)){finish();return}
  const round=s.i;
  const item=s.pool[round%s.pool.length],characters=Array.from(item.front.trim().normalize('NFC'));
  const playable=characters.some(isLetter)?isLetter:ch=>ch.trim()!=='';
  const solution=new Set(characters.filter(playable).map(normalize));
  const keys=[...new Set([...Array.from(alphabet, normalize),...solution])];
  const guessed=new Set(),buttons=new Map();
  let ended=false;
  if(!$('detectiveGame'))$('view').innerHTML=topStudy('Kelime Dedektifi')+`<section class="card detective-game" id="detectiveGame" tabindex="-1">
    <div id="detectiveDrawing"></div><p id="detectiveRound"></p>
    <div class="detective-clue"><p>Türkçe ipucu</p><h2 id="detectiveClue"></h2>
    <div class="detective-word" id="detectiveWord" aria-label="Gizli kelime"></div></div>
    ${detectiveInput}
    <p class="muted">İngilizcesini harf harf aç. Bir harfi seçmek için tuşla veya dokun. Her yanlış harfte çöp adama bir parça eklenir.</p>
    <div class="detective-keys" id="detectiveKeys"></div><p id="detectiveFeedback" role="status"></p>
    <button id="detectiveNext" class="primary" hidden></button></section>`;
  exitBind();
  const root=$('detectiveGame'),keyboard=$('detectiveKeys'),next=$('detectiveNext');
  $('detectiveRound').textContent='Kelime '+(round+1);
  $('detectiveClue').textContent=item.back;
  $('detectiveFeedback').textContent='';
  keyboard.replaceChildren();next.hidden=true;
  // Keep ordinary keyboard letters stable. Include digits and accented characters for custom sets.
  for(const key of keys){
    const b=document.createElement('button');b.type='button';b.textContent=key.toLocaleUpperCase('en');
    b.onclick=()=>guess(key,b);b.dataset.letter=key;buttons.set(key,b);keyboard.append(b);
  }
  function draw(reveal=false){
    $('detectiveDrawing').innerHTML=gallows('Sen',s.lives);
    const display=characters.map(ch=>!playable(ch)||reveal||guessed.has(normalize(ch))?ch:'_');
    $('detectiveWord').textContent=display.join('');
    $('detectiveWord').setAttribute('aria-label',display.map(ch=>ch==='_'?'boş':ch).join(' '));
  }
  function guess(key,button){
    if(ended||!root.isConnected||page!=='play'||session!==s||guessed.has(key))return;
    guessed.add(key);button.disabled=true;
    const found=solution.has(key);
    button.dataset.found=String(found);
    if(!found)s.lives--;
    const solved=[...solution].every(letter=>guessed.has(letter));
    ended=solved||s.lives===0;
    draw(ended);
    const note=$('detectiveFeedback');
    if(!ended){note.textContent=found?'Harf açıldı.':'Bu harf kelimede yok.';return}
    record(item,solved);
    if(solved)s.score++;draw(true);
    note.textContent=(solved?'Kelimeyi çözdün! ':'Doğru kelime: ')+item.front;
    keyboard.querySelectorAll('button').forEach(b=>b.disabled=true);
    unbind();next.hidden=false;next.textContent=runOver(s)?'Sonucu gör':'Sıradaki kelime';
    setTimeout(()=>{if(root.isConnected&&session===s&&s.i===round)next.click()},1400);
  }
  const input=root.querySelector('.detective-input');
  const unbind=bindDetectiveInput(input,root,text=>{
    for(const key of text){const button=buttons.get(key);if(button&&!button.disabled)guess(key,button)}
  });
  next.onclick=()=>{if(root.isConnected&&ended){s.i++;detective()}};
  draw();
}
