// Mirror wordshift_private.sentence_time so solo and online players get the same clock.
export function sentenceSeconds(sentence){
  const words=sentence.toLowerCase().match(/[a-z]+(?:'[a-z]+)*/g)||[];
  const text=words.join(' ');
  const clauseWords=new Set(['if','unless','when','while','although','though','because','since','that','which','who','whose','until','whether']);
  const clauses=words.filter(word=>clauseWords.has(word)).length;
  const inversion=/^(only later|under no circumstances|by no means|had i|had we|had they|the more)\b/.test(text);
  const verbChain=/\b(would have|could have|should have|have been|has been|had been|must be|should be|can be)\b/.test(text);
  return Math.min(150,Math.max(20,12+3*words.length+7*clauses+(inversion?9:0)+(verbChain?6:0)));
}
