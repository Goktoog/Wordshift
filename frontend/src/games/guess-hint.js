import {normalizeGuess} from './taboo-cards.js';
export function guessHint(guess,target){
 const a=normalizeGuess(guess), b=normalizeGuess(target);
 const words=a.split(' '), solution=b.split(' ');
 let same=0;
 while(same<words.length&&words[same]===solution[same])same++;
 if(same&&same<solution.length){
  const rest=solution.length-same;
  return (same===1?'First word is right!':'First '+same+' words are right!')+' '+rest+' more '+(rest===1?'word.':'words.');
 }
 if(a.length>=2&&b.length>=3&&Math.abs(a.length-b.length)<=1){
  let i=0;while(i<a.length&&a[i]===b[i])i++;
  if(a.length===b.length?(a.slice(i+1)===b.slice(i+1)||(a[i]===b[i+1]&&a[i+1]===b[i]&&a.slice(i+2)===b.slice(i+2))):
    a.length<b.length?a.slice(i)===b.slice(i+1):a.slice(i+1)===b.slice(i))return "You're close! Check your spelling.";
 }
 return 'Try again!';
}
