// Both clients and PostgreSQL use the room seed. Each road has two independent lanes.
export const roadCount=3, hopTime=.95;
const vehicles=[
 ['van',82,'#da7659'],['coupe',60,'#ffb833'],['sedan',70,'#69a5bb'],
 ['truck',96,'#788adb'],['coupe',58,'#dc5862'],['van',78,'#70b69a']
];
export function trafficFor(seed){
 return Array.from({length:roadCount},(_,road)=>[0,1].map(k=>{
  const i=road*2+k,[kind,length,color]=vehicles[i];
  return {kind,length,color,direction:k?-1:1,band:k,depth:road+.28+k*.45,
   speed:(k?205:102)+(Math.floor(seed/(road+1))+47*i)%67,
   stagger:45+(Math.floor(seed/13)+29*i)%100,spacing:525+(Math.floor(seed/7)+77*i)%235,phase:(Math.floor(seed/11)+193*i)%481};
 }).flatMap(lane=>[0,1,2].map(n=>({...lane,spacing:3*lane.spacing,
  phase:lane.phase+n*lane.spacing+(n===1?lane.stagger:n===2?-lane.stagger:0)}))));
}
export function nearestCar(lane,time){
 const offset=(lane.phase+lane.speed*time)%lane.spacing;
 return lane.direction*(offset>lane.spacing/2?offset-lane.spacing:offset);
}
export function crossingHit(streams,road,start,from,to,x=0){
 return streams[road].some(lane=>{
  const k=lane.band;
  const entry=Math.max(from,start+(.14+k*.45)*hopTime),exit=Math.min(to,start+(.42+k*.45)*hopTime);
  if(entry>exit)return false;
  const offset=lane.phase-lane.direction*x,clearance=lane.length/2+9;
  return Math.ceil((offset+lane.speed*entry-clearance)/lane.spacing)<=Math.floor((offset+lane.speed*exit+clearance)/lane.spacing);
 });
}
