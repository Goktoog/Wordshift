const profiles={
 easy:{label:'Kolay · A1–A2 · Beginner',knowledge:.40,read:2500,hesitate:.42,hunt:.10},
 normal:{label:'Orta · B1–B2 · Intermediate',knowledge:.62,read:1550,hesitate:.26,hunt:.62},
 hard:{label:'Zor · C1–C2 · Advanced',knowledge:.79,read:1000,hesitate:.15,hunt:.91}
};
export const botProfile=difficulty=>profiles[difficulty]||profiles.normal;
export const botOptions=()=>Object.entries(profiles).map(([key,p])=>
 '<option value="'+key+'" '+(key==='normal'?'selected':'')+'>'+p.label+'</option>').join('');
export function answerChance(profile,item){
 const tier=['A1','A2','B1','B2','C1','C2'].indexOf(item.level);
 const penalty=tier<0?0:(tier-2)*.045;
 return Math.min(.87,Math.max(.15,profile.knowledge-penalty-(item.type==='word'?0:.04)));
}
// The bot receives only the cells it has fired on and their known hit results.
export function chooseShot(shots,hits,difficulty,random=Math.random){
 const open=Array.from({length:25},(_,i)=>i).filter(i=>!shots.includes(i));
 if(!open.length)return null;
 const pick=cells=>cells[Math.floor(random()*cells.length)];
 if(random()>=botProfile(difficulty).hunt)return pick(open);
 const seen=new Set(shots),strikes=new Set(hits);
 const scores=new Map(open.map(i=>[i,0]));
 for(const cell of open){
  const row=Math.floor(cell/5),col=cell%5;
  for(const [dy,dx] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const adjacent=(distance)=>{
    const r=row+dy*distance,c=col+dx*distance;
    return r>=0&&r<5&&c>=0&&c<5?r*5+c:-1;
   };
   const near=adjacent(1),next=adjacent(2);
   let weight=strikes.has(near)?8:0;
   if(difficulty==='hard'){
    if(strikes.has(near)&&strikes.has(next))weight+=22;
    if(near>=0&&!seen.has(near))weight++;
    if(next>=0&&!seen.has(near)&&!seen.has(next))weight++;
   }
   scores.set(cell,scores.get(cell)+weight);
  }
 }
 const best=Math.max(...scores.values());
 return pick(open.filter(i=>scores.get(i)===best));
}