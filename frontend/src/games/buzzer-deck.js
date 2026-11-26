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

// Keep this formula in sync with wordshift_private.buzzer_time for online rooms.
export function buzzerSeconds(item,options,answering=false){
  const count=text=>text.trim().split(/\s+/u).length;
  const bonus={paragraph:12,translate:8,blank:5,mc:3}[item.type]||0;
  const reading=Math.ceil(Math.max(0,count(item.front)-3)*.6);
  const choiceWords=options.reduce((sum,choice)=>sum+count(choice),0);
  const response=!answering?0:choiceWords?Math.ceil(Math.max(0,choiceWords-4)*.45):4+Math.ceil(count(item.back)*1.2);
  return Math.min(120,10+bonus+reading+response);
}
