import { $, escape, levels } from '../core/utils.js';
import { user, save } from '../core/state.js';
import { modal } from '../ui/modal.js';
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
 const focus=goal==='travel'?/airport|travel|trip|tour|vacation|tent|cabin|accommodation|ticket|flight|journey|bus|railway|station|sail|hotel|border|customs|abroad|transport|arriv|depart|passport|destination|vehicle|ship|route|map|guide|port|baggage|luggage/:goal==='work'?/work|business|company|industry|office|career|money|salary|meeting|trade|contract|negotia|account|production|market|budget|interview|employ|report|manager|finance|investment|team|customer|profession|task|deadline/:null;
 const relevant=focus?words.filter(x=>focus.test(x.front)):words;
 const pool=relevant.length?relevant:words;
 const word = pool[(day+rank)%pool.length];
 const examples = goals[goal][1];
 const tier = Math.min(2, Math.floor(rank / 2));
 const tip = examples[tier*3 + (day+rank)%3];
 return {word, tip, label:goals[goal][0]};
}
export function goalCard(account, profile=false) {
 const goal = account.learningGoal;
 if (!Object.hasOwn(goals,goal)) return '<section class="card section goal-card"><h2>İngilizceyi ne için öğreniyorsun?</h2><p>Günün bilgisini hedefine ve seviyene göre seçelim.</p><button class="primary" id="editGoal">Öğrenme hedefimi seç</button></section>';
 if(profile) return '<section class="card section goal-card"><h2>Öğrenme hedefim</h2><p>'+goals[goal][0]+'</p><button id="editGoal">Hedefimi değiştir</button></section>';
 const {word,tip,label}=dailyInfo(goal,account.level);
 return '<section class="card section goal-card"><div class="top"><h2>Günün bilgisi</h2><span class="badge">'+label+' · '+escape(account.level)+'</span></div><h3>'+escape(word.front)+' <small>· '+escape(word.back)+'</small></h3><p lang="en">'+escape(tip[0])+'</p><p class="muted">'+escape(tip[1])+'</p></section>';
}
export function bindGoal(refresh) {
 if (!$('editGoal')) return;
 $('editGoal').onclick=()=>editGoal(refresh);
}
export function editGoal(refresh) {
 const account=user;
 const current=account.learningGoal;
 const choices=Object.entries(goals).map(([id,[label]])=>'<label class="goal-option"><input type="radio" name="goal" required value="'+id+'" '+(current===id?'checked':'')+'>'+label+'</label>');
 modal('<h2>İngilizceyi ne için öğreniyorsun?</h2><fieldset><legend>Sınava hazırlanıyorum</legend>'+choices.slice(3).join('')+'</fieldset><fieldset><legend>İngilizcemi geliştirmek istiyorum</legend>'+choices.slice(0,3).join('')+'</fieldset>',data=>{
  const value=data.get('goal');
  if(user!==account || !Object.hasOwn(goals,value))return false;
  account.learningGoal=value;save();refresh();
 });
}
