import { shuffle } from '../core/utils.js';

export const buzzerEligible = item => !item.sourceQuestion && item.front?.trim() && item.back?.trim();

// Interleave categories so a large word list cannot crowd out its sentence and gap-fill questions.
export function mixedQuestions(items, limit=20) {
  const groups=new Map();
  for(const item of shuffle(items.filter(buzzerEligible))){
    if(!groups.has(item.type))groups.set(item.type,[]);
    groups.get(item.type).push(item);
  }
  const result=[];
  while(groups.size && result.length<limit){
    for(const [type,group] of groups){
      result.push(group.pop());
      if(!group.length)groups.delete(type);
      if(result.length>=limit)break;
    }
  }
  return result;
}
export function buzzerOptions(item,items){
  const choices=item.options?.some(x=>x&&x!==item.back)?item.options:
    shuffle(items.filter(x=>x.type===item.type&&x.back!==item.back)).slice(0,5).map(x=>x.back);
  const others=[...new Set(choices.filter(x=>x&&x!==item.back))].slice(0,3);
  return others.length?shuffle([item.back,...others]):[];
}
