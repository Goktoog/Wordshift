import assert from 'node:assert/strict';
import {noteMistake,mistakeEntries,mistakeSet,removeMistake,MASTER_AFTER,MAX_ITEMS} from '../frontend/src/features/mistakes.js';
const user={};
const word={id:'a1-1',type:'word',level:'A1',front:'garden',back:'bahçe',attempts:5,correct:2};
assert.equal(noteMistake(user,word,false),'added');
assert.deepEqual(Object.keys(mistakeEntries(user)[0].item).sort(),['back','front','id','level','type']);
assert.equal(noteMistake(user,word,null),'updated');assert.equal(mistakeEntries(user)[0].wrong,2);
// Doğru cevaplar listede olmayan içeriği eklemez; kartlar doğru sayılmaz.
assert.equal(noteMistake(user,{id:'x',front:'a',back:'b'},true),null);
assert.equal(noteMistake(user,word,true,false),null);assert.equal(mistakeEntries(user)[0].good,0);
// 10 doğru cevapta listeden çıkar.
for(let i=1;i<MASTER_AFTER;i++)assert.equal(noteMistake(user,word,true),'good');
assert.equal(mistakeEntries(user)[0].good,MASTER_AFTER-1);
assert.equal(noteMistake(user,word,true),'mastered');assert.equal(mistakeEntries(user).length,0);
// Kimliksiz (çevrimiçi) içerik ön yüz+arka yüzle eşleşir; sorular seçenekleriyle saklanır.
noteMistake(user,{front:'Jump',back:'zıplamak'},false);noteMistake(user,{front:'jump',back:'ZIPLAMAK'},false);assert.equal(mistakeEntries(user).length,1);
noteMistake(user,{id:'q1',type:'blank',front:'He ___ home.',back:'went',options:['go','went','gone']},false);
assert.deepEqual(mistakeSet(user).items.find(x=>x.id==='q1').options,['go','went','gone']);
assert.equal(mistakeSet(user).mistakes,true);
removeMistake(user,mistakeEntries(user)[0].key);assert.equal(mistakeEntries(user).length,1);
// Geçersiz içerik yok sayılır; liste sınırı korunur.
assert.equal(noteMistake(user,{front:'',back:'x'},false),null);assert.equal(noteMistake(null,word,false),null);
const big={};for(let i=0;i<MAX_ITEMS+20;i++)noteMistake(big,{id:'w'+i,front:'f'+i,back:'b'+i},false);
assert.equal(Object.keys(big.mistakes).length,MAX_ITEMS);
console.log('PASS: mistake list add/update, 10-correct removal, cards guard, keys, questions, cap.');
