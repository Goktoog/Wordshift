export const width=256, height=160;
export const palette=['#ffffff','#202334','#e34858','#f38337','#f4c541','#499956','#24a9af','#3873cc','#8151af','#ae7150','#f09eba','#8791a1'];
const tools=[['pen','Fırça'],['fill','Doldur'],['line','Çizgi'],['rect','Dikdörtgen'],['ellipse','Elips'],['triangle','Üçgen']];
const names=['Beyaz','Siyah','Kırmızı','Turuncu','Sarı','Yeşil','Turkuaz','Mavi','Mor','Kahverengi','Pembe','Gri'];
export function paint(pixels,{tool,color,size,points}){
 if(!Array.isArray(points)||!points.length||points.length>512||!Number.isInteger(color)||!palette[color]||![1,3,6,10].includes(size))return;
 if(!points.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isInteger)&&p[0]>=0&&p[0]<width&&p[1]>=0&&p[1]<height))return;
 const [x,y]=points[0], [endX,endY]=points.at(-1);
 const dot=(cx,cy)=>{
  const radius=(size-1)/2,range=Math.ceil(radius);
  for(let j=-range;j<=range;j++)for(let i=-range;i<=range;i++){
   const px=cx+i,py=cy+j;
   if(px>=0&&px<width&&py>=0&&py<height&&i*i+j*j<=(radius+.25)**2)pixels[py*width+px]=color;
  }
 };
 const line=(a,b,c,d)=>{
  const steps=Math.max(Math.abs(c-a),Math.abs(d-b),1);
  for(let i=0;i<=steps;i++)dot(Math.round(a+(c-a)*i/steps),Math.round(b+(d-b)*i/steps));
 };
 if(tool==='fill'){
  const seed=y*width+x,old=pixels[seed];if(old===color)return;
  const stack=[seed];pixels[seed]=color;
  const add=i=>{if(pixels[i]===old){pixels[i]=color;stack.push(i)}};
  while(stack.length){
   const i=stack.pop();if(i%width)add(i-1);if(i%width<width-1)add(i+1);
   if(i>=width)add(i-width);if(i<pixels.length-width)add(i+width);
  }
 }else if(tool==='pen'){
  dot(x,y);for(let i=1;i<points.length;i++)line(...points[i-1],...points[i]);
 }else if(tool==='line')line(x,y,endX,endY);
 else if(tool==='rect'){line(x,y,endX,y);line(endX,y,endX,endY);line(endX,endY,x,endY);line(x,endY,x,y)}
 else if(tool==='triangle'){const mid=Math.round((x+endX)/2);line(mid,y,endX,endY);line(endX,endY,x,endY);line(x,endY,mid,y)}
 else if(tool==='ellipse'){
  let last=[endX,Math.round((y+endY)/2)];
  for(let step=1;step<=180;step++){
   const a=step*Math.PI/90,p=[Math.round((x+endX+(endX-x)*Math.cos(a))/2),Math.round((y+endY+(endY-y)*Math.sin(a))/2)];
   line(...last,...p);last=p;
  }
 }
}
export function mountPad(host,editable,onStroke){
 host.innerHTML=(editable?'<div class="sketch-tools"><label>Araç<select data-tool>'+tools.map(([id,label])=>'<option value="'+id+'">'+label+'</option>').join('')+'</select></label><label>Fırça<select data-size>'+[1,3,6,10].map(n=>'<option '+(n===3?'selected':'')+'>'+n+'</option>').join('')+'</select></label><div class="ink-palette" role="group" aria-label="Renkler">'+palette.map((c,i)=>'<button type="button" data-ink="'+i+'" style="--ink:'+c+'" aria-label="'+names[i]+'" aria-pressed="'+(i===1)+'"></button>').join('')+'</div></div>':'')+'<canvas width="'+width+'" height="'+height+'" class="sketch-pad" aria-label="Çizim tahtası"></canvas>';
 const canvas=host.querySelector('canvas'), ctx=canvas.getContext('2d');
 const rgb=palette.map(hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)));
 let base=new Uint8Array(width*height),color=1,pointer=null,draft=null,known=0,locked=false;
 const draw=()=>{
  if(!ctx)return;
  const pixels=draft?base.slice():base;if(draft)paint(pixels,draft);
  const image=ctx.createImageData(width,height);
  for(let i=0;i<pixels.length;i++){const c=rgb[pixels[i]],j=i*4;image.data[j]=c[0];image.data[j+1]=c[1];image.data[j+2]=c[2];image.data[j+3]=255}
  ctx.putImageData(image,0,0);
 };
 host.querySelectorAll('[data-ink]').forEach(b=>b.onclick=()=>{color=Number(b.dataset.ink);host.querySelectorAll('[data-ink]').forEach(el=>el.setAttribute('aria-pressed',String(el===b)))});
 const position=e=>{const r=canvas.getBoundingClientRect();return [Math.max(0,Math.min(width-1,Math.floor((e.clientX-r.left)*width/r.width))),Math.max(0,Math.min(height-1,Math.floor((e.clientY-r.top)*height/r.height)))]};
 function move(e){
  if(e.pointerId!==pointer||!draft)return;
  const p=position(e),last=draft.points.at(-1);if(last[0]===p[0]&&last[1]===p[1])return;
  if(draft.tool==='pen'){
   if(draft.points.length>=512)draft.points=draft.points.filter((_,i)=>i%2===0);
   draft.points.push(p);
  }else if(draft.tool!=='fill')draft.points[1]=p;
  draw();
 }
 if(editable){
  canvas.onpointerdown=e=>{
   if(locked||pointer!==null||e.button!==0)return;
   pointer=e.pointerId;canvas.setPointerCapture?.(pointer);
   draft={tool:host.querySelector('[data-tool]').value,size:Number(host.querySelector('[data-size]').value),color,points:[position(e)]};draw();
  };
  canvas.onpointermove=move;
  canvas.onpointercancel=()=>{pointer=null;draft=null;draw()};
  canvas.onpointerup=async e=>{
   if(e.pointerId!==pointer||!draft)return;
   move(e);const stroke=draft;pointer=null;locked=true;
   try{await onStroke(stroke,known)}finally{draft=null;locked=false;draw()}
  };
 }
 draw();
 return {update(ops){
  if(ops.length===known)return;
  if(ops.length<known){base.fill(0);known=0}
  for(const op of ops.slice(known))paint(base,op);
  known=ops.length;draw();
 }};
}
