import { traffic, nearestCar } from './crossing-traffic.js';

const groundY = z => 325 - 94*z + 9*z*z;
const scaleAt = z => 1 - .15*z;

function oval(c,x,y,rx,ry,color) {
  c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();
}
function shape(c,points,color) {
  c.fillStyle=color;c.beginPath();c.moveTo(...points[0]);
  for(const p of points.slice(1))c.lineTo(...p);
  c.closePath();c.fill();
}
function box(c,x,y,w,h,r,color) {
  c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();
}
function backdrop(c,w) {
  const sky=c.createLinearGradient(0,0,0,130);
  sky.addColorStop(0,'#86bbd4');sky.addColorStop(1,'#f8dec2');
  c.fillStyle=sky;c.fillRect(0,0,w,350);
  oval(c,w*.72,42,21,21,'#fff0be');
  for(let i=-1;i<w/130+1;i++){
    const x=i*130+25, y=39+11*Math.cos(i*3);
    oval(c,x,y,25,4,'#fbf1de');oval(c,x+3,y-3,12,5,'#fbf1de');
  }
  for(let i=-1;i<w/150+1;i++)
    shape(c,[[i*150-55,118],[i*150+35,56+i%3*9],[i*150+120,118]],'#9ab0ad');
  for(let i=0;i<w/32;i++){
    const x=i*32, y=76+8*Math.sin(i*4);
    box(c,x,y,26,44,2,i%3===0?'#91a9a4':'#adc0b1');
    for(let j=0;j<3;j++)box(c,x+3+7*j,y+6,3,5,1,'#f8dfb5');
  }
  c.fillStyle='#80ab92';c.fillRect(0,108,w,242);
  for(let i=0;i<w/49;i++){
    const x=i*49+15, y=116+3*Math.sin(i);
    box(c,x-1.5,y-19,3,19,1,'#605d53');
    oval(c,x,y-18,8,13,i%2?'#568b7b':'#699884');
  }
  for(let i=traffic.length-1;i>=0;i--){
    const far=groundY(i+.91), near=groundY(i+.09), mid=groundY(i+.5);
    c.fillStyle='#dfd8be';c.fillRect(0,far-3,w,near-far+7);
    const asphalt=c.createLinearGradient(0,far,0,near);
    asphalt.addColorStop(0,'#414f61');asphalt.addColorStop(1,'#566477');
    c.fillStyle=asphalt;c.fillRect(0,far,w,near-far);
    const s=scaleAt(i+.5);
    c.fillStyle='#a9b0b5';
    for(let x=-12;x<w;x+=65*s)if(Math.abs(x-w/2)>59*s)c.fillRect(x,mid,23*s,1.3*s);
    for(let j=0;j<6;j++){
      const a=i+.14+j*.12,b=a+.062;
      shape(c,[[w/2-48*scaleAt(a),groundY(a)],[w/2+48*scaleAt(a),groundY(a)],
        [w/2+48*scaleAt(b),groundY(b)],[w/2-48*scaleAt(b),groundY(b)]],'#cdd6d1');
    }
  }
  for(let i=0;i<=3;i++){
    const y=groundY(i),s=scaleAt(i);
    box(c,w/2-53*s,y-3*s,106*s,7*s,3*s,'#e8dcc2');
    for(const dir of [-1,1]){
      const x=w/2+dir*70*s;
      box(c,x-2*s,y-13*s,4*s,14*s,1,'#31514e');
      box(c,x-2*s,y-12*s,4*s,4*s,1,'#f9d59a');
    }
  }
}

function car(c,x,y,s,lane) {
  c.save();c.translate(x,y);c.scale(s*lane.direction,s);
  const l=lane.length/2;
  oval(c,0,1,l+1,5,'#21354377');
  shape(c,[[-l+9,-11],[-l+16,-25],[l-11,-25],[l-2,-12]],lane.color);
  shape(c,[[-l+15,-13],[-l+20,-22],[-1,-22],[-1,-13]],'#334f64');
  shape(c,[[3,-22],[l-13,-22],[l-6,-13],[3,-13]],'#52748a');
  box(c,-l,-14,l*2,13,4,lane.color);
  box(c,-l+3,-6,l*2-6,4,2,'#34445155');
  box(c,l-5,-12,5,4,1,'#fff2be');box(c,-l,-11,4,4,1,'#bb474a');
  for(const wheel of [-l*.62,l*.62]){
    oval(c,wheel,0,6,6,'#253748');oval(c,wheel,0,2.5,2.5,'#abbac1');
  }
  c.restore();
}
function chicken(c,x,y,s,hop,hit) {
  c.save();c.translate(x,y);c.scale(s,s);
  oval(c,0,0,13-hop*3,4,'#23414b55');c.translate(0,-hop*15);
  if(hit)c.rotate(-.3);
  box(c,-8,-7,4,8,2,'#d79642');box(c,4,-7,4,8,2,'#d79642');
  oval(c,0,-18,14,16,'#ffefcd');oval(c,-11,-18,5,9,'#eacba1');oval(c,11,-18,5,9,'#eacba1');
  oval(c,0,-33,10,10,'#fff6dc');oval(c,-3,-43,3,5,'#dd665e');oval(c,2,-44,3,6,'#ec7663');
  shape(c,[[-6,-20],[-4,-30],[1,-25],[6,-31],[7,-21],[1,-15]],'#e0bc93');
  c.restore();
}

export function roadRenderer(canvas) {
  let ctx, scenery, width=0, height=0;
  try{ctx=canvas.getContext('2d')}catch{return ()=>{}}
  if(!ctx)return ()=>{};
  return (time,depth,hop,hit)=>{
    const cw=canvas.clientWidth, ch=canvas.clientHeight;
    if(!cw||!ch)return;
    const w=350*cw/ch;
    if(width!==cw||height!==ch){
      width=cw;height=ch;
      const dpr=Math.min(window.devicePixelRatio||1,2);
      canvas.width=Math.round(cw*dpr);canvas.height=Math.round(ch*dpr);
      scenery=document.createElement('canvas');scenery.width=canvas.width;scenery.height=canvas.height;
      const bg=scenery.getContext('2d');bg.scale(scenery.width/w,scenery.height/350);backdrop(bg,w);
    }
    ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(scenery,0,0);
    ctx.scale(canvas.width/w,canvas.height/350);
    const player=()=>chicken(ctx,w/2,groundY(depth),scaleAt(depth),hop,hit);
    let drawn=false;
    for(let i=traffic.length-1;i>=0;i--){
      const z=i+.5,s=scaleAt(z),lane=traffic[i];
      if(!drawn&&depth>z){player();drawn=true}
      const gap=lane.spacing*s,center=w/2+nearestCar(lane,time)*s;
      const first=center-Math.ceil((center+lane.length)/gap)*gap;
      for(let x=first;x<w+lane.length;x+=gap)car(ctx,x,groundY(z),s,lane);
    }
    if(!drawn)player();
  };
}
