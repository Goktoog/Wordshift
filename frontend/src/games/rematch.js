import {escape} from '../core/utils.js';
import {gameModes,gameTitles,gameIcons} from './catalog.js';
import {declineSound,inviteSound} from '../ui/feedback.js';

export function mountRematch(stage,s,{send,words,title,history,newMatch,wrongWords,gallows}){
 const paired=s.names.length===2, rival=s.names[2-s.me]||'Rakip';
 const won=s.winner===s.me,tied=s.winner==null;
 stage.innerHTML='<section class="match-finale '+(won?'won':'')+'"><div class="result-medal" aria-hidden="true">'+(won?'🏆':tied?'⚖️':'🏁')+'</div><div><small>'+escape(gameTitles[s.mode])+'</small><h2>'+(won?'Kazandın!':tied?(paired?'Berabere / maç sona erdi':'Oda kapandı'):'Rakibin kazandı')+'</h2><p>'+escape(s.reason)+'</p></div>'+
 (paired?'<div class="result-score"><span>'+escape(s.names[s.me-1])+' · Sen</span><b>'+s.scores[s.me-1]+' <i>–</i> '+s.scores[2-s.me]+'</b><span>'+escape(rival)+'</span></div>':'')+
 (paired?'<div class="rematch-actions"><button class="primary" id="replay" aria-expanded="false">↻ Rövanş</button><div data-decision hidden><button class="primary" id="acceptOffer">Kabul et</button> <button id="declineOffer">Reddet</button></div><button id="withdrawOffer" hidden>Teklifi geri çek</button></div><p id="offerNote" role="status"></p><p data-replay-notice role="status"></p><section data-picker hidden><h3>Rövanşı hangi oyunda oynayalım?</h3><div class="rematch-grid">'+gameModes.map(m=>'<button data-replay-mode="'+m+'"><span aria-hidden="true">'+gameIcons[m]+'</span>'+escape(gameTitles[m])+'</button>').join('')+'</div></section>':'')+
 '<footer><button id="newOnline">Lobiye dön</button><button id="showMatchHistory">Maç geçmişim</button></footer></section>'+gallows+wrongWords;
 stage.querySelector('#showMatchHistory').onclick=history;stage.querySelector('#newOnline').onclick=newMatch;
 if(!paired)return {update(){},stop(){}};
 const get=s=>stage.querySelector(s),pick=get('[data-picker]'),replay=get('#replay'),note=get('#offerNote'),status=get('[data-replay-notice]');
 let offer=null,seenOffer='',seenNotice='',pending=false,lastView=null;
 function picker(open){pick.hidden=!open;replay.setAttribute('aria-expanded',String(open))}
 replay.onclick=()=>picker(pick.hidden);
 pick.querySelectorAll('[data-replay-mode]').forEach(button=>button.onclick=async()=>{
  if(pending||offer)return;
  const mode=button.dataset.replayMode;pending=true;
  try{const r=await send('offer',-1,{mode,words:mode===s.mode?[]:words(mode),title});if(r)picker(false)}finally{pending=false}
 });
 get('#acceptOffer').onclick=()=>offer&&send('accept_offer',-1,offer.id);
 get('#declineOffer').onclick=()=>offer&&send('decline_offer',-1,offer.id);
 get('#withdrawOffer').onclick=()=>offer&&send('cancel_offer',-1,offer.id);
 function update(next){
  const key=[next.offer?.id,next.replayNotice?.id].join('|');
  if(key===lastView)return;lastView=key;
  const prev=offer;offer=next.offer;
  const mine=offer?.by===s.me;
  replay.hidden=!!offer;get('[data-decision]').hidden=!offer||mine;get('#withdrawOffer').hidden=!mine;
  if(offer){
   picker(false);
   note.textContent=mine?gameTitles[offer.mode]+' teklifin gönderildi. '+rival+' yanıtlıyor…':rival+' seni '+gameTitles[offer.mode]+' rövanşına davet etti.';
   if(offer.id!==seenOffer){seenOffer=offer.id;if(!mine)inviteSound()}
  }else if(prev)note.textContent='Teklif artık açık değil.';
  const notice=next.replayNotice;
  if(notice&&notice.id!==seenNotice){
   seenNotice=notice.id;
   status.textContent=notice.by===s.me?'Teklifi reddettin. Başka bir oyun seçebilirsin.':rival+' '+gameTitles[notice.mode]+' teklifini reddetti.';
   if(notice.by!==s.me)declineSound();
   if(!offer)note.textContent='';
  }
 }
 update(s);return {update,stop(){}};
}
