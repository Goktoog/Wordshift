import { mountInvitePicker } from '../features/room-invites.js';
import { mountRematch } from './rematch.js';
import { mountStudio } from './studio.js';
import {detectiveInput} from './detective-input.js';
import { arcadeModes, mountArcade } from './online-arcade.js';
import { gameTitles, mountPools, poolLabel, poolForSet } from './pvp-panels.js';
import {duelGallows} from './gallows.js';
import { animals, bindMascots, avatarPicker, buzzerTable, pressBuzzer, buzzerAnswers, bindBuzzerAnswers } from './buzzer.js';
import { mountSentence } from './sentences.js';
import { $, escape } from '../core/utils.js';
import { user,page,setTimer,timer,save } from '../core/state.js';
import { go } from '../core/router.js';
import { starterSets } from '../features/starters.js';
import { lobby, room, gameWords } from '../services/pvp.js';
import { sound, bonkSound, matchFoundSound, countdownBeep } from '../ui/feedback.js';
import { mountMeteor } from './online-meteor.js';
import { shipCells, canPlace } from './fleet-layout.js';
import { creditOnline, wrongWordsMarkup } from '../features/pvp-credit.js';
const titles=gameTitles;
// Browsers slow timers in background tabs; a worker keeps polling once a second so the match-found sound and countdown beeps still arrive.
function backgroundTick(callback){
 try{
  const url=URL.createObjectURL(new Blob(['setInterval(()=>postMessage(0),1000)'],{type:'text/javascript'})),worker=new Worker(url);
  worker.onmessage=()=>{if(document.hidden)callback()};
  return()=>{worker.terminate();URL.revokeObjectURL(url)};
 }catch{return()=>{}}
}
let closeRoom=null;
export function stopOnline(){closeRoom?.();closeRoom=null}
let selectionOwner=null,preferredSet=null,preferredMode='runner',preferredPool='';
const examSets={YDS:'starter-yds',YOKDIL:'starter-yokdil'};
export function openOnline(set=null,mode='runner',autoQuick=false,pool){selectionOwner=user;preferredSet=set;preferredMode=mode;if(pool!==undefined)preferredPool=pool;go('online',{autoQuick})}
export const getPool=()=>preferredPool;
export const setPool=value=>{preferredPool=value};
export function online(autoQuick=false){
 stopOnline();
 const v=$('view');v.innerHTML=`<div class="top"><div><p class="eyebrow">İKİ KİŞİLİK ÇEVRİMİÇİ</p><h1>Birlikte oyna.</h1></div><button id="onlineBack">Oyunlara dön</button></div><div id="detectiveEntry" hidden>${detectiveInput}</div><div id="onlineRoot"></div><section class="section" id="onlinePools"></section>`;
 $('onlineBack').onclick=()=>go('games');const root=$('onlineRoot'),account=user;
 const entry=$('detectiveEntry'),letterInput=entry.querySelector('input');
 const active=()=>page==='online'&&user===account&&$('onlineRoot')===root;
 if(selectionOwner!==user){selectionOwner=user;preferredSet=null;preferredPool='';preferredMode='runner'}
 if(preferredSet)preferredPool=poolForSet(preferredSet);
 const sets=[...user.sets,...starterSets],defaultSet=preferredSet||starterSets.find(s=>s.id==='starter-'+(user.level||'A1').toLowerCase())||starterSets[0];if(preferredSet&&!sets.some(s=>s.id===preferredSet.id))sets.unshift(preferredSet);
 root.innerHTML=`<div class="card"><div class="pvp-setup"><label>Oyun<select id="onlineMode">${Object.entries(titles).map(([id,title])=>`<option value="${id}" ${id===preferredMode?'selected':''}>${title}</option>`).join('')}</select></label><label>Çalışma seti<select id="onlineSet">${sets.map((s,i)=>`<option value="${i}" ${s.id===defaultSet?.id?'selected':''}>${escape(s.name)}</option>`).join('')}</select></label><label>Eşleşme havuzu<select id="onlinePool"><option value="">Seviyem · ${escape(user.level||'A1')}</option><option value="YDS">YDS</option><option value="YOKDIL">YÖKDİL</option></select></label></div><p>Hızlı eşleşme, seçtiğin havuzdaki oyuncuları aynı oyunda buluşturur: kendi seviyen (<strong>${escape(user.level||'A1')}</strong>), <strong>YDS</strong> veya <strong>YÖKDİL</strong>. YDS ve YÖKDİL havuzlarında kelimeler ilgili hazır setten gelir ve seviyeden bağımsız eşleşirsin. Oda koduyla farklı seviyelerdeki arkadaşlarınla da oynayabilirsin.</p><p class="muted">Çiz ve Bil ve Yasak Kelime’de oyuncular sırayla anlatır ve tahmin eder. Doğru tahmin +100, başarılı anlatım +50 puandır. İki oyuncu da oda sahibinin setinden aynı kelimeleri görür. Seçilen en fazla 20 kelime rakiple paylaşılır; Kelime Blokları 8 çift kullanır. Cümle Düellosu seviyene uygun hazır cümleler kullanır.</p><div class="actions"><button class="primary" id="quickMatch">Hızlı eşleş</button><button id="createRoom">Arkadaş için oda oluştur</button></div><form id="joinRoom" class="pvp-join"><label>Oda kodu<input id="roomCode" maxlength="10" minlength="10" autocomplete="off" required placeholder="10 karakterlik kod"></label><button>Odaya katıl</button></form><p class="muted">Kule ve Geçit üç canla başlar. Kule’de ilk elenen kaybeder. Geçit’te canların bitince rakibini izlersin. İki oyuncunun da canı bittiğinde yüksek puan kazanır. Herkes kendi hızında ilerler. Kelime Kulesi: doğru platform bir kat kazandırır. Kelime Geçidi: kelimeyi bil, trafik açıldığında şeridi geç. Kelime Dedektifi: her yanlış harfte bir parça çizilir. Yedi parçada oyun biter. Kafanı Kırarım: Maskot seçimi için 15 saniyen var. İkiniz de seçince üç canla başlarsınız. Düğmeye ilk basan aynı soruyu önce cevaplar, yanlışta sıra rakibe geçer. Runner ve Meteor Avı: 3 can, her cevap için 10 saniye. Amiral Battı: cevap ve atış için ayrı ayrı 10 saniye. Kelime Blokları: 60 saniye. Cümle Düellosu: süre, kelime sayısı ve cümlenin yapısına göre belirlenir. İlk doğru tamamlayan cümleyi alır, kimse tamamlayamazsa kimse puan almaz. Bağlantı 30 saniye kesilirse rakibin kazanır; iki taraf da koparsa maç berabere kapanır. Doğru cevapların XP kazandırır ve seviye ilerlemene sayılır; yanlış bildiklerin “Yanlış bildiklerim” listene eklenir.</p><p id="lobbyStatus" role="status">Devam eden maçın kontrol ediliyor…</p></div>`;
 $('onlineMode').value=preferredMode;$('onlineSet').value=String(Math.max(0,sets.indexOf(defaultSet)));
 let pending=false,changeMode=null,matchSet=defaultSet;
 mountPools($('onlinePools'),mode=>{if(changeMode){void changeMode(mode);return}$('onlineMode').value=mode;$('onlineMode').onchange();void enter('quick')},()=>$('onlinePool')?.value||'');
 const levelSet=()=>Math.max(0,sets.findIndex(s=>s.id==='starter-'+(user.level||'A1').toLowerCase()));
 let lastSet=poolForSet(sets[+$('onlineSet').value])?String(levelSet()):$('onlineSet').value;
 $('onlinePool').value=preferredPool;
 const syncPool=()=>{const sentence=$('onlineMode').value==='sentences',exam=examSets[$('onlinePool').value];$('onlinePool').disabled=sentence;if(exam&&!sentence){const at=sets.findIndex(s=>s.id===exam);if(at>=0)$('onlineSet').value=String(at)}$('onlineSet').disabled=sentence||!!exam&&!sentence};
 $('onlinePool').onchange=()=>{preferredPool=$('onlinePool').value;if(!examSets[preferredPool])$('onlineSet').value=lastSet;syncPool()};
 $('onlineSet').onchange=()=>{const guess=poolForSet(sets[+$('onlineSet').value]);if(guess){preferredPool=guess;$('onlinePool').value=guess;syncPool()}else lastSet=$('onlineSet').value};
 $('onlineMode').onchange=syncPool;syncPool();
 const buttons=()=>[...root.querySelectorAll('button,select,input')];
 async function enter(action){if(pending||!active())return;pending=true;buttons().forEach(b=>b.disabled=true);const status=$('lobbyStatus');status.textContent=action==='resume'?'Devam eden maçın kontrol ediliyor…':'Odaya bağlanılıyor…';
  if(action!=='resume'&&$('onlineMode').value==='detective'){entry.hidden=false;letterInput.focus({preventScroll:true})}
  matchSet=sets[+$('onlineSet').value]||defaultSet;
  try{const id=await lobby(action,{mode:$('onlineMode').value,set:sets[+$('onlineSet').value],code:$('roomCode').value,pool:$('onlineMode').value==='sentences'||!['quick','create'].includes(action)?'':$('onlinePool').value});if(!active()){if(id&&action!=='resume')void room(id,'leave').catch(()=>{});return}if(id){await connect(id);return}status.textContent='Hazır. Bir oyun seç veya oda kodunu gir.'}
  catch(e){if(active())status.textContent=e.message}
  finally{pending=false;if(active()&&$('lobbyStatus')){entry.hidden=true;buttons().forEach(b=>b.disabled=false);$('onlineMode').onchange()}}
 }
 $('quickMatch').onclick=()=>void enter('quick');$('createRoom').onclick=()=>void enter('create');$('joinRoom').onsubmit=e=>{e.preventDefault();void enter('join')};void enter(autoQuick?'quick':'resume');
 async function connect(id){
  let state=null,announced=false,stopBackground=null,busy=false,mutating=false,inFlight=null,ownTick=null,offset=0,lastPoll=0,key='',scene=null,pick=null,feedbackKey='',opponentFeedbackKey='',fleet=[3,2,1].map(length=>({length,vertical:false,cells:[]})),selected=0;
  let closed=false;
  const cleanup=()=>{closed=true;clearInterval(ownTick);stopBackground?.();scene?.stop()};
  closeRoom=cleanup;
  clearInterval(timer);root.innerHTML='<p>Maç yükleniyor…</p>';
  function leaveMessage(){
   if(state?.mode==='crossing'&&state.status==='active'&&state.lives.includes(0)){
    return state.lives[state.me-1]===0?'İzlemeyi bırakıp odadan ayrılmak istiyor musun?':'Kalan haklarını bırakıp maçı mevcut puanlarla bitirmek istiyor musun?';
   }
   return 'Odadan ayrılmak istiyor musun? Başlamış maçta rakibin kazanır.';
  }
  $('onlineBack').textContent='Odadan ayrıl';$('onlineBack').onclick=async()=>{if(state?.status!=='finished'&&!confirm(leaveMessage()))return;const left=await send('leave');if(left&&active())go('games')};
  const now=()=>Date.now()+offset;
  changeMode=async mode=>{if(state&&['active','placing'].includes(state.status)&&!confirm(leaveMessage()))return;const left=await send('leave');if(!left)return;preferredMode=mode;clearInterval(timer);online(true)};
  async function send(action='poll',value=-1,extra=null,token=state?.round||0){
   if(!active())return null;
   if(busy){if(action==='poll')return null;await inFlight;return send(action,value,extra,token)}
   busy=true;mutating=action!=='poll';let release;inFlight=new Promise(resolve=>{release=resolve});const start=Date.now();
   try{
    const cursor=action==='poll'&&['draw','taboo'].includes(state?.mode)&&Array.isArray(state.log)?state.log.length:value;
    const next=await room(id,action,token,cursor,extra);
    if(next.logFrom!==undefined)next.log=(state?.log||[]).slice(0,next.logFrom).concat(next.logDelta||[]);if(!active()||closed)return null;
    if(next.nextRoom){cleanup();void connect(next.nextRoom);return next}offset=Date.parse(next.serverNow)+(Date.now()-start)/2-Date.now();state=next;if(!announced&&['placing','active'].includes(next.status)){announced=true;matchFoundSound()}creditState(next);draw();const status=root.querySelector('#connectionStatus');if(status)status.textContent='Bağlı · '+(Math.round((Date.now()-start)))+' ms';return next}
   catch(e){if(active()){let status=root.querySelector('#connectionStatus');if(!status){root.innerHTML='<p id="connectionStatus" role="status"></p><button id="retryRoom">Yeniden bağlan</button>';$('retryRoom').onclick=()=>void send()}status=root.querySelector('#connectionStatus');status.textContent='Bağlantı kurulamadı: '+e.message+' · Yeniden deneniyor.'}return null}
   finally{busy=false;mutating=false;release()}
  }
  function creditState(s){
   if(!s||!s.id||!s.question||!s.answer||s.answer.lost||s.status==='waiting')return;
   const mine=arcadeModes.includes(s.mode)||['runner','meteor','sentences','buzzer','draw','taboo'].includes(s.mode)||(s.mode==='battle'&&s.turn===s.me);
   if(s.mode==='buzzer'&&!s.answer.ok&&s.phase!=='feedback')return;
   if(mine)creditOnline({room:s.id,round:s.round,kind:'a',front:s.mode==='detective'?s.correct:s.question.front,back:s.mode==='detective'?s.question.front:s.correct||'',ok:!!s.answer.ok});
  }
  function frame(){if(closed)return;if(!active()){clearInterval(ownTick);stopBackground?.();scene?.stop();return}if(Date.now()-lastPoll>=((['buzzer','draw','taboo'].includes(state?.mode)||arcadeModes.includes(state?.mode))&&state.status==='active'?350:1000)){lastPoll=Date.now();void send()}update()}
  await send();if(!active()||closed)return;ownTick=setInterval(frame,100);setTimer(ownTick);stopBackground=backgroundTick(frame);
  function draw(){
   const s=state;entry.hidden=s.mode!=='detective'||s.status==='finished';const newKey=s.status+':'+(s.mode==='tower'?'course':s.round)+':'+(['battle','buzzer'].includes(s.mode)?s.phase+':'+s.turn:'')+(s.mode==='buzzer'?':'+s.avatars.join(',')+':'+s.ready.join(','):'');
   if(newKey!==key||!$('pvpStage')){const previousKey=key;key=newKey;scene?.stop();scene=null;pick=null;
    root.innerHTML=`<div class="pvp-scoreboard"><div><span>${escape(s.names[s.me-1])} · Sen</span><strong id="myScore">0</strong><small id="myLives"></small></div><span>VS</span><div><span>${escape(s.names[2-s.me]||'Rakip bekleniyor')}</span><strong id="theirScore">0</strong><small id="theirLives"></small></div></div><p id="connectionStatus" role="status">Bağlanılıyor…</p><div id="pvpStage"></div>`;
    const stage=$('pvpStage');
    if(s.status==='waiting'){
     stage.innerHTML=`<div class="hero"><h2>Rakip bekleniyor</h2><p>${titles[s.mode]} · ${escape(poolLabel(s.level))} · ${escape(s.title)}</p><p>Oda kodu</p><strong class="room-code">${escape(s.code)}</strong><button id="copyCode">Kodu kopyala</button><p class="muted">Kodu arkadaşına gönder; Oyunlar → Çevrimiçi PvP → Odaya katıl. Bekleme en fazla 10 dakika sürer. Hızlı eşleşmede aynı seviyede oyuncu gelmesi gerekir.</p></div>`;

     if(!user.guest){
      stage.insertAdjacentHTML('beforeend','<div class="card"><button class="primary" id="friendInvite" aria-expanded="false">Arkadaş davet et</button><div id="invitePicker" hidden></div></div>');
      $('friendInvite').onclick=()=>{const panel=$('invitePicker');panel.hidden=!panel.hidden;$('friendInvite').setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden&&!panel.childElementCount)mountInvitePicker(panel,s.id)};
     }
     $('copyCode').onclick=async()=>{const button=$('copyCode');try{await navigator.clipboard.writeText(s.code);if(button.isConnected)button.textContent='Kopyalandı'}catch{if(button.isConnected)button.textContent='Kodu seçip kopyala'}};
    }else if(s.status==='finished'){
     if(user.guest&&s.names.length===2){
      const matches=user.localMatches||=[];
      if(!matches.some(m=>m.id===s.id)){
       matches.unshift({id:s.id,mode:s.mode,winner:s.winner,me:s.me,scores:s.scores,opponent:s.names[2-s.me],date:s.serverNow});
       save();
      }
     }
     scene=mountRematch(stage,s,{send,words:mode=>gameWords(mode,matchSet),title:matchSet.name,history:()=>go('profile'),
      newMatch:async()=>{await send('leave');if(active()&&!closed)online()},wrongWords:wrongWordsMarkup(s.id),
      gallows:s.mode==='detective'&&s.names.length===2?'<div class="gallows-pair">'+duelGallows(s)+'</div>':''});
     $('onlineBack').textContent='Oyunlara dön';
    }else if(s.status==='placing'&&s.mode==='buzzer'){
     const me=s.me-1,other=1-me;
     stage.innerHTML=`<div class="card"><div class="top"><h2>Maskotunu seç</h2><span class="timer" id="pvpClock"></span></div>
      ${s.ready[me]?'<p>Maskotun: '+animals[s.avatars[me]]+'. Rakip bekleniyor…</p>':avatarPicker()}
      <p>Rakip: ${s.ready[other]?animals[s.avatars[other]]+' · hazır':'seçim yapıyor…'}</p></div>`;
     bindMascots(stage,i=>{if(!mutating)void send('avatar',i)});
    }else if(s.status==='placing')drawFleet();
    else if(s.mode==='buzzer'){
     const mine=s.turn===s.me, answering=s.phase==='claimed',feedback=s.phase==='feedback',hitBy=feedback&&s.event?.hit?s.event.by-1:-1;
     const note=feedback?(hitBy>=0?s.names[hitBy]+' doğru bildi. Bıng!':'Tur sona erdi.')+' Doğru cevap: '+(s.correct||''):
       answering?(mine?'Cevap sırası sende.':'Rakibin cevaplıyor…'):'Soruyu oku ve butona bas.';
     stage.innerHTML=buzzerTable({names:s.names,avatars:s.avatars,lives:s.lives,front:s.question.front,canBuzz:s.phase==='question',hitBy,clockId:'pvpClock'})+
       `<div class="bng-status"><p role="status">${escape(note)}</p></div>`+
       (answering&&mine?buzzerAnswers(s.question.options):'');
     if(answering&&previousKey.startsWith('active:'+s.round+':question:'))pressBuzzer(stage,s.turn-1);

     $('bngBuzz').onclick=()=>void send('buzz',-1,null,s.round);
     bindBuzzerAnswers(stage,(choice,text)=>void send('answer',choice,text,s.round));
     if(hitBy>=0&&feedbackKey!==s.round){feedbackKey=s.round;bonkSound()}
    }
    else if(s.mode==='blocks'){
     stage.innerHTML=`<div class="top"><h2>Kelime Blokları</h2><span class="timer" id="pvpClock"></span></div><p>Doğru eşleşme +100, yanlış eşleşme −15. Eşit puanda ilk tamamlayan kazanır.</p><p id="pairStatus" role="status"></p><div class="word-blocks">${['left','right'].map(side=>`<section><h3>${side==='left'?'İngilizce':'Türkçe'}</h3>${s[side].map(c=>`<button class="word-block" data-side="${side}" data-key="${c.key}">${escape(c.text)}</button>`).join('')}</section>`).join('')}</div>`;
     stage.querySelectorAll('[data-side]').forEach(b=>b.onclick=async()=>{if(mutating||now()<Date.parse(state.startsAt))return;const c={side:b.dataset.side,key:+b.dataset.key};if(!pick||pick.side===c.side){pick=c;update();return}const left=c.side==='left'?c.key:pick.key,right=c.side==='right'?c.key:pick.key;pick=null;const pairFront=state.left.find(c=>c.key===left)?.text,pairBack=state.right.find(c=>c.key===right)?.text;const result=await send('pair',left,right);if(result?.answer&&pairFront)creditOnline({room:result.id,round:Date.parse(result.answer.at)||0,kind:'p',front:pairFront,back:result.answer.ok?pairBack:'',ok:!!result.answer.ok});if(result?.answer&&$('pairStatus')){sound(result.answer.ok);$('pairStatus').textContent=result.answer.ok?'✓ Eşleşti!':'✕ Tekrar dene'}update()});
    }else if(['draw','taboo'].includes(s.mode)){
     scene=mountStudio(stage,s,send);
    }else if(arcadeModes.includes(s.mode)){
     scene=mountArcade(stage,s,send,now,letterInput);
    }else if(s.mode==='meteor'){
     stage.innerHTML='<div class="card" id="onlineMeteor"></div>';scene=mountMeteor($('onlineMeteor'),{prompt:s.question.front,options:s.question.options,startsAt:Date.parse(s.startsAt),deadline:Date.parse(s.deadline),now,onAnswer:async i=>{const result=await send('answer',i);if(!result)throw Error('Cevap gönderilemedi. Bağlantı yeniden kurulunca maç devam eder.');return {ok:!!result.answer?.ok,correct:result.correct}}});
    }else if(s.mode==='sentences'){
     stage.innerHTML=`<div class="card"><div class="top"><h2>Cümle Düellosu · ${s.round+1}/${s.total}</h2><span id="pvpClock" class="timer"></span></div><h3>${escape(s.question.front)}</h3><p class="muted">İlk doğru tamamlayan cümleyi alır ve sıradaki cümleye geçilir. Süre dolana kadar kimse tamamlayamazsa kimse puan almaz.</p><div id="onlineSentence"></div><p id="sentenceTry" role="status"></p><p id="answerStatus" role="status"></p></div>`;
     scene=mountSentence($('onlineSentence'),s.question.options,async order=>{const result=await send('sentence',-1,order);if(result){sound(!!result.answer?.ok);const el=$('sentenceTry');if(el)el.textContent=result.answer?'':'✕ Yanlış sıra. Düzeltip tekrar gönder.'}});
    }else if(s.mode==='runner'){
     stage.innerHTML=`<h2>Word Runner · Tur ${s.round+1}</h2><div class="game-screen runner-scene" id="onlineRunner"><div class="hud">Sen <span id="raceStatus"></span></div><div class="rival-label">Rakip</div><div class="runner human rival-runner"><i class="head"></i><i class="body"></i><i class="leg left"></i><i class="leg right"></i><i class="arm"></i></div><div class="ground"></div><div id="onlineHuman" class="runner human"><i class="head"></i><i class="body"></i><i class="leg left"></i><i class="leg right"></i><i class="arm"></i></div><div id="onlineObstacle" class="obstacle ${s.round%2?'high':''}"><span>${s.round%2?'↓':'↑'}</span></div><div id="runnerResult" class="run-feedback"></div></div><div class="card section" id="onlineQuestion"><div class="top"><h2>${s.round%2?'Eğilmek':'Zıplamak'} için cevapla</h2><span id="pvpClock" class="timer"></span></div>${questionMarkup(s)}</div>`;bindQuestion();
    }else if(s.mode==='battle'){
     stage.innerHTML=`<div class="top"><h2>Amiral Battı</h2><span class="timer" id="pvpClock"></span></div><p id="battleEvent" role="status"></p><div class="boards"><section><h3>Senin filon</h3><div class="board" id="ownBoard"></div></section><section><h3>Rakibin gizli filosu</h3><div class="board" id="enemyBoard"></div></section></div><div class="card section"><h2>${s.turn===s.me?s.phase==='shoot'?'Doğru bildin. Bir kareye ateş et!':'Sıra sende':'Rakibin oynuyor…'}</h2>${s.turn===s.me&&s.phase==='question'?questionMarkup(s):''}</div>`;bindQuestion();
    }
   }
   update();
  }
  function questionMarkup(s){return `<h2>${escape(s.question.front)}</h2><div class="choices">${s.question.options.map((o,i)=>`<button data-online-answer="${i}">${escape(o)}</button>`).join('')}</div><p id="answerStatus" role="status"></p>`}
  function bindQuestion(){root.querySelectorAll('[data-online-answer]').forEach(b=>b.onclick=async()=>{const before=state.round,asked=state.question;const result=await send('answer',+b.dataset.onlineAnswer);if(result){if(result.round===before)sound(!!result.answer?.ok);else if(result.mode==='battle'){sound(false);const known=/Doğrusu:\s*(.+)$/.exec(result.event?.text||'');if(asked)creditOnline({room:result.id,round:before,kind:'a',front:asked.front,back:known?known[1]:'',ok:false})}}})}
  function update(){
   if(!state||!active())return;const s=state,t=now(),start=Date.parse(s.startsAt),end=Date.parse(s.deadline),left=Math.max(0,Math.ceil((end-t)/1000));
   const board=root.querySelector('.pvp-scoreboard');if(board)board.hidden=s.status==='finished';
   if($('myLives'))$('myLives').textContent=['runner','meteor','buzzer','crossing','tower'].includes(s.mode)?'♥ '+s.lives[s.me-1]+' / 3 can':'';if($('theirLives'))$('theirLives').textContent=['runner','meteor','buzzer','crossing','tower'].includes(s.mode)?'♥ '+s.lives[2-s.me]+' / 3 can':'';
   if($('myScore'))$('myScore').textContent=String(s.scores[s.me-1]);if($('theirScore'))$('theirScore').textContent=String(s.scores[2-s.me]);
   if(s.status==='finished')scene?.update(s);
   if(s.status==='active'&&['draw','taboo'].includes(s.mode))scene?.update(s);
   const spectating=s.mode==='crossing'&&s.lives[s.me-1]===0;
   const clock=$('pvpClock');if(clock){clock.hidden=spectating;if(s.mode==='buzzer'){clock.hidden=s.phase==='feedback';clock.textContent=String(s.status!=='placing'&&t<start?Math.ceil((start-t)/1000):left)}else clock.textContent=t<start?'Hazır ol…':left+' sn';clock.classList.toggle('urgent-text',left<=3)}
   // Last three seconds of the timer: beep once per second (only while it is this player's clock).
   if(clock&&!spectating&&s.status!=='finished'&&t>=start&&left>=1&&left<=3&&(s.mode==='blocks'||!s.answer)&&s.phase!=='feedback'&&!(s.mode==='battle'&&s.status==='active'&&s.turn!==s.me)&&!(s.status==='placing'&&s.ready[s.me-1]))countdownBeep(s.id+':'+s.round+':'+s.status+':'+s.phase,left);
   root.querySelectorAll('[data-online-answer]').forEach(b=>b.disabled=mutating||t<start||t>=end||s.phase!=='question'||!!s.answer);
   if(s.mode==='buzzer'&&$('bngBuzz')){
    $('bngBuzz').disabled=s.phase!=='question'||mutating||t<start||t>=end;
    root.querySelectorAll('[data-bng-choice],#bngForm button').forEach(b=>b.disabled=mutating||s.phase!=='claimed'||s.turn!==s.me||t>=end);
   }
   if($('answerStatus'))$('answerStatus').textContent=s.answer?(s.answer.ok?(s.phase==='feedback'?'✓ Doğru!':'✓ Doğru! Rakip bekleniyor…'):'✕ '+(s.answer.lost?'Rakip önce tamamladı. ':'')+(s.correct?'Doğru: '+s.correct:'Süre doldu')):'';
   if(arcadeModes.includes(s.mode)&&s.status==='active')scene?.update(s);
   if(s.mode==='sentences'&&s.status==='active')scene?.lock(mutating||t<start||t>=end||!!s.answer);
   if(s.mode==='meteor'&&s.status==='active'&&s.answer)scene?.setAnswer?.({ok:s.answer.ok,correct:s.correct});
   if(s.mode==='blocks'&&s.status==='active'){
    root.querySelectorAll('[data-side]').forEach(b=>{const done=(b.dataset.side==='left'?s.completed:s.doneRight).includes(+b.dataset.key);b.disabled=mutating||done||t<start||t>=end;b.classList.toggle('good',done);b.classList.toggle('selected',pick?.side===b.dataset.side&&pick.key===+b.dataset.key)});
   }
   if(s.mode==='runner'&&s.status==='active'&&$('onlineRunner')){
    const scene=$('onlineRunner'),human=$('onlineHuman'),obstacle=$('onlineObstacle');
    const stop=scene.clientWidth*.15+65,progress=Math.min(1,Math.max(0,1-(start-t)/2400));
    obstacle.style.left=(scene.clientWidth-60+(stop-(scene.clientWidth-60))*progress)+'px';scene.classList.toggle('waiting',t>=start&&!s.answer);$('onlineQuestion').hidden=t<start;
    $('raceStatus').textContent=t<start?'Engel yaklaşıyor…':s.answer?'Rakibin cevabı bekleniyor…':'Engelin önündesin · 10 saniye';
    const rival=scene.querySelector('.rival-runner');if(s.opponentAnswered&&rival&&opponentFeedbackKey!==s.round){opponentFeedbackKey=s.round;rival.classList.add(s.opponentCorrect?(s.round%2?'duck':'jump'):'crash');if(!s.opponentCorrect)setTimeout(()=>{if(rival.isConnected){rival.classList.remove('crash');rival.classList.add('respawning')}},600)}
    if(s.answer){const signature=s.round+':'+s.answer.ok;if(signature!==feedbackKey){feedbackKey=signature;human.classList.add(s.answer.ok?(s.round%2?'duck':'jump'):'crash');obstacle.style.opacity='0';$('runnerResult').textContent=s.answer.ok?'✓':'✕';if(!s.answer.ok)setTimeout(()=>{if(human.isConnected){human.classList.remove('crash');human.classList.add('respawning')}},600)}}
   }
   if(s.mode==='battle'&&s.status==='placing'&&s.ready[s.me-1]&&!$('fleetWaiting'))drawFleet();
   if(s.mode==='battle'&&s.status==='placing'&&s.ready[s.me-1]&&$('fleetWaiting'))$('fleetWaiting').textContent='Filon hazır. Rakibin yerleştirmesi bekleniyor…';
   if(s.mode==='battle'&&s.status==='active'&&$('ownBoard')){
    $('battleEvent').textContent=s.event?.text||'Kelimeyi bil, atış hakkı kazan.';
    $('ownBoard').innerHTML=Array.from({length:25},(_,i)=>`<button disabled class="${s.incoming.includes(i)?s.fleet.includes(i)?'hit':'miss':s.fleet.includes(i)?'ship':''}">${s.incoming.includes(i)?s.fleet.includes(i)?'✹':'·':s.fleet.includes(i)?'⛴':''}</button>`).join('');
    const shotKey=s.round+':'+s.phase+':'+s.shots.join(',')+':'+mutating+':'+(t>=end)+':'+(t<start);
    if($('enemyBoard').dataset.key!==shotKey){$('enemyBoard').dataset.key=shotKey;$('enemyBoard').innerHTML=Array.from({length:25},(_,i)=>`<button data-online-shot="${i}" aria-label="Satır ${Math.floor(i/5)+1}, sütun ${i%5+1}" ${mutating||s.turn!==s.me||s.phase!=='shoot'||s.shots.includes(i)||t>=end||t<start?'disabled':''} class="${s.shots.includes(i)?s.hits.includes(i)?'hit':'miss':''}">${s.shots.includes(i)?s.hits.includes(i)?'✹':'·':''}</button>`).join('');root.querySelectorAll('[data-online-shot]').forEach(b=>b.onclick=async()=>{const result=await send('shot',+b.dataset.onlineShot);if(result?.event?.hit!==undefined)sound(result.event.hit)})}
   }
  }
  function drawFleet(){
   const stage=$('pvpStage'),s=state;
   if(s.ready[s.me-1]){stage.innerHTML='<div class="card"><h2>Filon hazır</h2><p id="fleetWaiting">Rakibin yerleştirmesi bekleniyor…</p><span class="timer" id="pvpClock"></span></div>';return}
   stage.innerHTML=`<div class="card"><div class="top"><h2>Filonu yerleştir</h2><span class="timer" id="pvpClock"></span></div><p>Gemiyi seç, boş kareye yerleştir. Yerleştirdikten sonra da taşıyabilir veya döndürebilirsin. Hazır dediğinde kilitlenir.</p><div class="fleet-tools">${fleet.map((ship,i)=>`<div class="fleet-tool ${i===selected?'selected':''}"><button data-fleet-select="${i}">⛴ ${ship.length} hücre</button><button data-fleet-rotate="${i}" ${ship.length===1?'disabled':''}>↻ Döndür · ${ship.vertical?'Dikey':'Yatay'}</button></div>`).join('')}</div><p id="fleetError" role="status"></p><div class="board fleet-board">${Array.from({length:25},(_,i)=>{const index=fleet.findIndex(s=>s.cells.includes(i));return `<button data-fleet-cell="${i}" aria-label="Satır ${Math.floor(i/5)+1}, sütun ${i%5+1}" class="${index>=0?'ship':''}">${index>=0?`<span class="ship-part ${fleet[index].vertical?'vertical':''}">⛴</span>`:''}</button>`}).join('')}</div><button class="primary section" id="fleetReady" ${fleet.every(s=>s.cells.length)?'':'disabled'}>Hazırım</button></div>`;
   const redraw=()=>drawFleet(),error=()=>$('fleetError').textContent='Gemi sınır dışına taşıyor veya başka gemiyle çakışıyor.';
   stage.querySelectorAll('[data-fleet-select]').forEach(b=>b.onclick=()=>{selected=+b.dataset.fleetSelect;redraw()});
   stage.querySelectorAll('[data-fleet-rotate]').forEach(b=>b.onclick=()=>{selected=+b.dataset.fleetRotate;const ship=fleet[selected];if(ship.cells.length){const cells=shipCells(ship.cells[0],ship.length,!ship.vertical);if(!canPlace(fleet,selected,cells)){error();return}ship.cells=cells}ship.vertical=!ship.vertical;redraw()});
   stage.querySelectorAll('[data-fleet-cell]').forEach(b=>b.onclick=()=>{const cell=+b.dataset.fleetCell,owner=fleet.findIndex(s=>s.cells.includes(cell));if(owner>=0){selected=owner;redraw();return}const ship=fleet[selected],cells=shipCells(cell,ship.length,ship.vertical);if(!canPlace(fleet,selected,cells)){error();return}ship.cells=cells;redraw()});
   $('fleetReady').onclick=async()=>{const result=await send('fleet',-1,fleet.map(s=>s.cells));if(result?.status==='placing')drawFleet()};
  }
 }
}
