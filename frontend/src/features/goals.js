import { $, escape, levels } from '../core/utils.js';
import { user, save } from '../core/state.js';
import { starterSets } from '../data/starter-sets.js';

const goals = {
 "daily": [
  "Günlük İngilizce",
  [
   [
    "Could I have a glass of water?",
    "Could I have ...? ile kibarca bir şey isteyebilirsin."
   ],
   [
    "I usually cook at home.",
    "Usually, fiilden önce gelerek bir alışkanlığın ne kadar sık tekrarlandığını anlatır."
   ],
   [
    "There is some milk left.",
    "Sayılamayan milk ile some kullanılır. Left burada “kalan” anlamına gelir."
   ],
   [
    "I’ve just missed the bus.",
    "Just, kaçırma olayının çok kısa süre önce gerçekleştiğini belirtir."
   ],
   [
    "I used to walk to school.",
    "Used to geçmişte düzenli yapılan ve artık sürmeyen bir alışkanlığı anlatır."
   ],
   [
    "Shall we get something to eat?",
    "Shall we ...? birlikte yapılacak bir şey önerir."
   ],
   [
    "I’m getting used to working late.",
    "Get used to alışma sürecini anlatır. Buradaki to sonrasında -ing kullanılır."
   ],
   [
    "I wish I had brought a jacket.",
    "Wish + past perfect geçmişle ilgili bir pişmanlığı ifade eder."
   ],
   [
    "I’d rather you called first.",
    "I'd rather + özne + geçmiş zaman, başka birinin yapmasını tercih ettiğin şeyi anlatır."
   ]
  ]
 ],
 "social": [
  "Arkadaşlarla sohbet",
  [
   ["How was your weekend?", "How was ...? ile geçmişteki bir deneyimin nasıl geçtiğini sorabilirsin."],
   ["Do you want to hang out?", "Hang out, arkadaşlarla vakit geçirmek anlamına gelir."],
   ["That sounds fun!", "Bir öneriyi beğendiğinde sounds fun diyebilirsin."],
   ["What have you been up to?", "Bir süredir görmediğin arkadaşına son zamanlarda neler yaptığını sorarsın."],
   ["Count me in.", "Bir plana katılacağını bu kısa ifadeyle söyleyebilirsin."],
   ["We get along really well.", "Get along, iki kişinin birbiriyle iyi anlaşmasını anlatır."],
   ["We picked up right where we left off.", "Pick up where you left off, ara verdiğin bir sohbete kaldığın yerden devam etmektir."],
   ["I didn't mean to put you on the spot.", "Put someone on the spot, birini hemen yanıt vermesi gereken zor bir durumda bırakmaktır."],
   ["It's been ages since we caught up.", "Catch up, bir süredir görüşmediğin biriyle hayatınızdaki gelişmeleri paylaşmaktır."]
  ]
 ],
 "travel": [
  "Seyahat",
  [
   [
    "A return ticket, please.",
    "Return ticket gidiş dönüş, single ticket tek yön bilettir."
   ],
   [
    "Where is platform six?",
    "Platform tren istasyonunda peron anlamına gelir."
   ],
   [
    "Is breakfast included?",
    "Included, kahvaltının oda ücretine dahil olup olmadığını sormana yarar."
   ],
   [
    "Could you tell me where the gate is?",
    "Dolaylı soruda where the gate is sıralaması kullanılır."
   ],
   [
    "My flight has been delayed.",
    "Has been delayed, gecikme haberini yolcunun bakış açısından verir."
   ],
   [
    "I’d like to check in.",
    "Check in, otelde giriş işlemlerini yaptırmak anlamına gelir."
   ],
   [
    "Had I known about the delay, I would have stayed.",
    "Had I known, If I had known ile aynı geçmiş koşulu ifade eder."
   ],
   [
    "The fare is refundable provided that you cancel today.",
    "Provided that, ücret iadesinin hangi koşula bağlı olduğunu gösterir."
   ],
   [
    "We narrowly missed our connection.",
    "Narrowly missed, aktarmayı çok küçük bir farkla kaçırdığımızı anlatır."
   ]
  ]
 ],
 "work": [
  "İş ve kariyer",
  [
   [
    "I work as a developer.",
    "Görevini work as, şirketi work for ile belirtebilirsin."
   ],
   [
    "I can join the meeting at ten.",
    "Join the meeting ifadesinde join sonrasında to kullanılmaz."
   ],
   [
    "Could you send me the file?",
    "Could you ...? iş yazışmalarında kibar bir ricadır."
   ],
   [
    "Could we push the meeting back?",
    "Push back toplantıyı daha geç bir zamana taşır."
   ],
   [
    "I’m following up on my last email.",
    "Follow up on, önceki bir konunun durumunu tekrar sormaktır."
   ],
   [
    "We need to meet the deadline.",
    "Meet the deadline işi belirlenen süre içinde bitirmek anlamına gelir."
   ],
   [
    "We aim to reduce downtime by 15%.",
    "By 15% azalma miktarını, to 15% ulaşılan düzeyi belirtir."
   ],
   [
    "The rollout is subject to approval.",
    "Subject to approval, uygulamanın başlayabilmesi için onay gerektiğini bildirir."
   ],
   [
    "The gains outweighed the costs.",
    "Outweigh, bir unsurun etkisinin diğerinden daha büyük olduğunu anlatır."
   ]
  ]
 ],
 "yds": [
  "YDS",
  [
   [
    "Although it was raining, we went out.",
    "Although sonrasında özne ve yüklem gelir. İki fikir arasında zıtlık kurar."
   ],
   [
    "Both methods work.",
    "Both iki unsuru kapsar ve çoğul isimle kullanılır."
   ],
   [
    "The room was too small to use.",
    "Too ... to yapısı, özelliğin bir eyleme engel olduğunu belirtir."
   ],
   [
    "Despite the delay, the team finished on time.",
    "Despite sonrasında isim veya -ing yapısı gelir. The delay bir isim grubudur."
   ],
   [
    "Sales fell, whereas costs rose.",
    "Whereas burada iki paralel eğilim arasındaki karşıtlığı kurar."
   ],
   [
    "Unless demand rises, prices will fall.",
    "Unless demand rises, if demand does not rise ile aynı koşulu verir."
   ],
   [
    "The claim is plausible, albeit untested.",
    "Albeit bir sınırlama ekler. İddia akla yatkın olsa da henüz sınanmamıştır."
   ],
   [
    "Only after the vote did the negotiations begin.",
    "Only after başa geldiğinde ana cümlede yardımcı fiil özneden önce gelir."
   ],
   [
    "The author stops short of endorsing the proposal.",
    "Stop short of, bir adımı atmaya yaklaşmayı ama o noktaya kadar gitmemeyi anlatır."
   ]
  ]
 ],
 "yokdil": [
  "YÖKDİL",
  [
   [
    "The sample contains water.",
    "Sample akademik metinde incelenen örnek veya numunedir."
   ],
   [
    "The researchers collected samples.",
    "Collect samples, bir çalışma için numune toplamak anlamına gelir."
   ],
   [
    "The temperature remained stable.",
    "Remain sonrasında gelen sıfat, durumun aynı şekilde sürdüğünü gösterir."
   ],
   [
    "The treatment may reduce symptoms.",
    "May reduce, araştırmacının kesinlik yerine olasılık bildirdiğini gösterir."
   ],
   [
    "The samples were stored at room temperature.",
    "Edilgen yapı yöntem anlatımında işlemi öne çıkarır. İşlemi yapan kişi belirtilmeyebilir."
   ],
   [
    "Compared with the control group, recovery was faster.",
    "Control group, sonuçların karşılaştırıldığı referans grubudur."
   ],
   [
    "After adjusting for age, the association weakened.",
    "Adjusting for age, analizde yaşın etkisinin hesaba katıldığını anlatır."
   ],
   [
    "The finding is consistent with the hypothesis.",
    "Consistent with uyum bildirir. Bu ifade hipotezin tek başına kanıtlandığını söylemez."
   ],
   [
    "The difference may be attributable to sampling bias.",
    "Attributable to olası açıklamayı tanıtır. May bu açıklamanın kesinliğini sınırlar."
   ]
  ]
 ]
};
export const dayNumber = date => Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
const levelIndex = level => Math.max(0, levels.indexOf(level));
export function dailyInfo(goal, level, date = new Date()) {
 const day = dayNumber(date), rank = levelIndex(level);
 const exam = ['yds','yokdil'].includes(goal);
 const set = starterSets.find(s => s.id === 'starter-' + (exam ? goal : level==='C2'?'C1':level || 'A1').toLowerCase()) || starterSets[0];
 const words = set.items.filter(x => x.type === 'word');
 const focus=goal==='travel'?/airport|travel|trip|tour|vacation|tent|cabin|accommodation|ticket|flight|journey|bus|railway|station|sail|hotel|border|customs|abroad|transport|arriv|depart|passport|destination|vehicle|ship|route|map|guide|port|baggage|luggage/:goal==='work'?/work|business|company|industry|office|career|money|salary|meeting|trade|contract|negotia|account|production|market|budget|interview|employ|report|manager|finance|investment|team|customer|profession|task|deadline/:goal==='social'?/friend|talk|chat|speak|listen|laugh|meet|visit|party|feel|story|share|communicat|convers|relationship|invite|company|discuss/:null;
 const relevant=focus?words.filter(x=>focus.test(x.front)):words;
 const pool=relevant.length?relevant:words;
 const word = pool[(day+rank)%pool.length];
 const examples = goals[goal][1];
 const tier = Math.min(2, Math.floor(rank / 2));
 const tip = examples[tier*3 + (day+rank)%3];
 return {word, tip, label:goals[goal][0]};
}
const categories = [
 ['daily','🌍','Genel İngilizce'], ['travel','🧳','Yurt dışı seyahat'],
 ['social','💬','Arkadaşlarımla sohbet'], ['work','💼','İş ve kariyer'],
 ['exam','🎓','Sınava hazırlanıyorum']
];
const exams = [['yds','✏️','YDS'], ['yokdil','📚','YÖKDİL']];
const isExam = id => exams.some(([key])=>key===id);
function selectedGoals(account) {
 const values = Array.isArray(account.learningGoals) ? account.learningGoals : [account.learningGoal];
 return [...new Set(values.filter(id=>Object.hasOwn(goals,id)))];
}
export const hasGoalPreferences = account => Array.isArray(account.learningGoals) || selectedGoals(account).length>0;

export function goalCard(account,profile=false,date=new Date()) {
 const selected=selectedGoals(account);
 if(profile) {
  const names=selected.map(id=>'<span class="goal-tag">'+escape(goals[id][0])+'</span>').join('');
  return '<section class="card section goal-card"><h2>Öğrenme hedeflerim</h2>'+
   (names?'<div class="goal-tags">'+names+'</div>':'<p class="muted">Henüz bir hedef seçmedin.</p>')+
   '<button id="editGoal">Hedeflerimi düzenle</button></section>';
 }
 const goal=selected.length?selected[dayNumber(date)%selected.length]:'daily';
 const {word,tip,label}=dailyInfo(goal,account.level,date);
 return '<section class="card section goal-card"><div class="top"><h2>Günün bilgisi</h2><span class="badge">'+label+' · '+escape(account.level)+'</span></div><h3>'+escape(word.front)+' <small>· '+escape(word.back)+'</small></h3><p lang="en">'+escape(tip[0])+'</p><p class="muted">'+escape(tip[1])+'</p><button id="editGoal">Hedeflerimi düzenle</button></section>';
}
export function bindGoal(refresh) {
 const button=$('editGoal');
 if(button)button.onclick=()=>editGoal(refresh);
}
export function editGoal(refresh) {
 const account=user, dialog=$('goalDialog');
 if(!account || !dialog || dialog.open)return;
 const draft=new Set(selectedGoals(account));
 let includeExams=[...draft].some(isExam), examStep=false;
 const active=id=>id==='exam'?includeExams:draft.has(id);
 function renderStep() {
  const choices=examStep?exams:categories;
  dialog.innerHTML=`<header class="goal-head"><div><h2 id="goalTitle" tabindex="-1">${examStep?'Hangi sınavlara hazırlanıyorsun?':'İngilizceyi ne için öğreniyorsun?'}</h2>
   <p>${examStep?'Hazırlandığın sınavların hepsini seçebilirsin.':'Birden fazla hedef seçebilir, dilediğinde profilinden değiştirebilirsin.'}</p></div>
   <button type="button" class="goal-close" aria-label="Kapat">×</button></header>
   <div class="goal-grid">${choices.map(([id,icon,label])=>`<button type="button" class="goal-tile" data-goal="${id}" aria-pressed="${active(id)}"><span class="goal-icon" aria-hidden="true">${icon}</span><span>${label}</span><i aria-hidden="true">✓</i></button>`).join('')}</div>
   <footer class="goal-footer"><button type="button" class="goal-back">${examStep?'Geri':'Vazgeç'}</button><button type="button" class="goal-save primary"></button></footer><div class="goal-error" role="alert"></div>`;
  const advance=dialog.querySelector('.goal-save');
  function sync() {
   advance.textContent=examStep?'Hedeflerimi kaydet':includeExams?'Sınavları seç →':draft.size?'Hedeflerimi kaydet':'Hedef seçmeden devam et';
   advance.disabled=examStep && ![...draft].some(isExam);
  }
  dialog.querySelectorAll('[data-goal]').forEach(button=>{
   button.onclick=()=>{
    const id=button.dataset.goal;
    if(id==='exam'){
     includeExams=!includeExams;
     if(!includeExams)for(const [key] of exams)draft.delete(key);
    }else if(draft.has(id))draft.delete(id);
    else draft.add(id);
    button.setAttribute('aria-pressed',String(active(id)));sync();
   };
  });
  dialog.querySelector('.goal-close').onclick=()=>dialog.close();
  dialog.querySelector('.goal-back').onclick=()=>{
   if(!examStep){dialog.close();return}
   examStep=false;renderStep();
  };
  advance.onclick=()=>{
   if(!examStep && includeExams){examStep=true;renderStep();return}
   if(user!==account || advance.disabled)return;
   const old=account.learningGoals,legacy=account.learningGoal;
   account.learningGoals=[...draft];delete account.learningGoal;
   try{save()}catch{
    if(old===undefined)delete account.learningGoals;else account.learningGoals=old;
    if(legacy!==undefined)account.learningGoal=legacy;
    dialog.querySelector('.goal-error').textContent='Hedeflerin kaydedilemedi. Tekrar dene.';return;
   }
   dialog.close();refresh?.();
  };
  sync();if(dialog.open)dialog.querySelector('#goalTitle').focus();
 }
 renderStep();dialog.showModal();
}
