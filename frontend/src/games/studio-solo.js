import { $, escape, shuffle } from '../core/utils.js';
import { session } from '../core/state.js';
import { topStudy, exitBind, record } from '../features/session.js';
import { forbiddenWords, normalizeGuess, violation } from './taboo-cards.js';
import { mountPad } from './sketchpad.js';

// Hand-drawn templates for the single-player guessing deck, in the same coordinate system as freehand play.
const sketches={
 house:'line 65 72 127 24;line 127 24 191 72;rect 76 72 179 139;rect 119 98 142 139;rect 83 86 104 106',
 tree:'rect 118 83 137 141;ellipse 77 20 177 100;fill 128 55',
 sun:'ellipse 94 46 162 114;line 128 12 128 36;line 128 123 128 149;line 62 80 85 80;line 172 80 197 80;line 76 28 94 46;line 166 116 184 134',
 clock:'ellipse 76 26 182 132;line 129 79 129 44;line 129 79 158 94',
 book:'rect 49 36 128 127;rect 128 36 207 127;line 63 61 111 61;line 145 65 191 65;line 64 78 110 78',
 fish:'ellipse 70 51 161 106;line 158 80 190 49;line 190 49 190 108;line 190 108 158 80;ellipse 87 66 94 73',
 mountain:'triangle 37 26 162 134;triangle 116 53 218 134;line 83 55 112 55',
 umbrella:'line 55 80 202 80;line 55 80 76 53;line 76 53 110 39;line 110 39 144 38;line 144 38 180 52;line 180 52 202 80;line 128 80 128 130;line 128 130 117 142;line 117 142 104 132',
 car:'rect 44 78 212 110;line 64 78 91 49;line 91 49 155 49;line 155 49 181 78;ellipse 65 99 89 123;ellipse 165 99 189 123',
 table:'rect 46 63 206 76;rect 55 76 66 128;rect 184 76 195 128',
 door:'rect 89 18 167 143;ellipse 146 79 153 86',
 flower:'line 126 77 126 143;ellipse 105 26 134 55;ellipse 130 39 161 67;ellipse 118 61 148 90;ellipse 90 50 120 79;ellipse 116 48 138 68',
 eye:'ellipse 52 49 203 109;ellipse 101 49 154 109;ellipse 117 65 139 92;fill 128 78',
 triangle:'triangle 62 25 192 133',circle:'ellipse 78 26 181 129',square:'rect 76 28 181 133',
 bed:'rect 45 85 203 100;line 45 55 45 124;line 202 70 202 124;rect 52 67 91 85;rect 94 70 200 85'
};
const clues={umbrella:'You open it above your head when the weather turns bad.',tree:'Birds build their nests in it.',house:'It is a building where a family might live.',cat:'It often purrs when you stroke its fur.',dog:'It often goes for walks on a lead.',apple:'You can pick one in an orchard.',school:'Children go there on weekday mornings.',water:'You need it to stay hydrated.',flower:'You might give someone a bunch of these.',sun:'It rises in the east.',book:'You can borrow one from a library.',clock:'Look at it to see whether you are late.'};
function sketchOps(word){return sketches[word].split(';').map(command=>{const [tool,...ns]=command.split(' '),v=ns.map(Number);return {tool,color:1,size:3,points:v.length===2?[v]:[[v[0],v[1]],[v[2],v[3]]]}})}
export function studioSolo(){
 const s=session,draw=s.m==='draw',title=draw?'Çiz ve Bil':'Yasak Kelime',v=$('view');
 const render=html=>{v.innerHTML=topStudy(title)+'<section class="card">'+html+'</section>';exitBind()};
 const pool=s.pool, sketchPool=pool.filter(x=>Object.hasOwn(sketches,normalizeGuess(x.front)));
 render('<h2>Nasıl oynayalım?</h2><div class="actions"><button id="passPlay" class="primary">Aynı cihazda iki kişi</button><button id="soloGuess">Tek başına tahmin et</button></div>');
 $('passPlay').onclick=()=>start(false);$('soloGuess').onclick=()=>start(true);
 function start(solo){
  const deck=shuffle(solo&&draw?sketchPool:pool).slice(0,6);
  if(!deck.length){
   render('<p>Bu sette hazır çizim yok. Tüm kelimelerle aynı cihazda iki kişi çizebilir veya hazır çizim destesini kullanabilirsin.</p><button id="pair">İki kişi oyna</button><button id="preset">Hazır çizimler</button>');
   $('pair').onclick=()=>start(false);$('preset').onclick=()=>run(shuffle(Object.keys(sketches)).slice(0,6).map(front=>({front})),true);return;
  }
  if(!solo&&deck.length%2){if(deck.length===1)deck.push(deck[0]);else deck.pop()}
  run(deck,solo);
 }
 function run(deck,solo){
  let index=0,score=[0,0];
  function next(){
   if(index>=deck.length){
    render('<h2>Oyun tamamlandı</h2><p>'+scores()+'</p><button id="repeatStudio">Tekrar oyna</button>');$('repeatStudio').onclick=studioSolo;return;
   }
   const item=deck[index],seat=index%2,banned=forbiddenWords(item),ops=[];
   const head='<p class="eyebrow">Tur '+(index+1)+' / '+deck.length+'</p>';
   function result(text){
    render(head+'<h2>'+escape(text)+'</h2><p>Kelime · '+escape(item.front)+'</p><p>'+scores()+'</p><button id="nextCard">Devam et</button>');
    $('nextCard').onclick=()=>{index++;next()};
   }
   function guess(clue=''){
    render(head+(solo?'':'<h3>Oyuncu '+(2-seat)+' tahmin ediyor</h3>')+(draw?'<div id="soloPad"></div>':'<p>'+escape(clue)+'</p>')+'<form id="wordGuess"><label>İngilizce tahminin<input autocomplete="off" maxlength="160" required></label><button>Tahmin et</button></form><p id="guessNote" role="status"></p><button id="passWord">Pas geç</button>');
    if(draw)mountPad($('soloPad'),false).update(solo?sketchOps(normalizeGuess(item.front)):ops);
    $('wordGuess').onsubmit=e=>{e.preventDefault();if(normalizeGuess(e.target.querySelector('input').value)!==normalizeGuess(item.front)){$('guessNote').textContent='Henüz bulamadın. Tekrar dene.';return}
     if(solo&&item.id)record(item,true);score[solo?0:1-seat]+=100;if(!solo)score[seat]+=50;result('Doğru tahmin!')};
    $('passWord').onclick=()=>result('Pas geçildi.');
   }
   if(solo){const hint=clues[normalizeGuess(item.front)];guess(hint&&!violation(hint,item.front,banned)?hint:'İngilizce karşılığını bul · '+item.back);return}
   render(head+'<h2>Cihazı Oyuncu '+(seat+1)+' alsın</h2><button id="revealSecret">Gizli kelimeyi göster</button>');
   $('revealSecret').onclick=()=>{
    render(head+'<h3 class="studio-secret">'+escape(item.front)+'</h3>'+(draw?'<div id="soloPad"></div><button id="handoff">Çizim hazır</button>':'<div class="ban-list">'+banned.map(w=>'<span class="badge">'+escape(w)+'</span>').join('')+'</div><p>Yasak kelime veya hedef kelime −25 puan.</p><form id="writeClue"><label>İpucun<input required maxlength="180"></label><button>İpucunu gönder</button></form>'));
    function handoff(clue){render('<h2>Cihazı Oyuncu '+(2-seat)+' alsın</h2><button id="showClue">Tahmine başla</button>');$('showClue').onclick=()=>guess(clue)}
    if(draw){const pad=mountPad($('soloPad'),true,op=>{ops.push(op);pad.update(ops);$('handoff').disabled=false});$('handoff').disabled=true;$('handoff').onclick=()=>handoff('')}
    else $('writeClue').onsubmit=e=>{e.preventDefault();const clue=e.target.querySelector('input').value.trim();if(!normalizeGuess(clue))return;
     if(violation(clue,item.front,banned)){score[seat]-=25;result('💥 Yasak kelime! −25 puan')}else handoff(clue)};
   };
  }
  function scores(){return solo?score[0]+' puan':'Oyuncu 1 · '+score[0]+' puan / Oyuncu 2 · '+score[1]+' puan'}
  next();
 }
}
