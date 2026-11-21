// Geometry is shared by the preview and the final export, so saved framing matches the preview.
export function cropGeometry(width,height,ratio,zoom=1,cx=.5,cy=.5){
 if(![width,height,ratio,zoom,cx,cy].every(Number.isFinite)||width<=0||height<=0||ratio<=0)throw Error('Görsel boyutları geçersiz.');
 zoom=Math.max(1,Math.min(3,zoom));
 const sw=Math.min(width,height*ratio)/zoom,sh=sw/ratio;
 const sx=Math.max(0,Math.min(width-sw,cx*width-sw/2)),sy=Math.max(0,Math.min(height-sh,cy*height-sh/2));
 return {sx,sy,sw,sh,cx:(sx+sw/2)/width,cy:(sy+sh/2)/height};
}
export function validateImageFile(file){
 if(!file||!file.size)throw Error('Bir görsel seç.');
 if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw Error('PNG, JPG veya WebP görsel seç.');
 if(file.size>10000000)throw Error('Görsel en fazla 10 MB olabilir.');
}
function loadImage(url){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Görsel açılamadı. Başka bir dosya seç.'));img.src=url})}
export function blobDataURL(blob){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(Error('Görsel okunamadı.'));r.readAsDataURL(blob)})}
function encode(canvas){return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob&&blob.type==='image/webp'?resolve(blob):reject(Error('Bu tarayıcı WebP kaydını desteklemiyor. Güncel bir tarayıcıyla dene.')),'image/webp',.88))}
export async function cropImage(file,kind,onSave){
 validateImageFile(file);
 const url=URL.createObjectURL(file);let image;
 try{image=await loadImage(url);if(!image.naturalWidth||!image.naturalHeight||image.naturalWidth*image.naturalHeight>40000000)throw Error('Görsel çok büyük veya açılamıyor. Daha küçük bir görsel seç.')}
 catch(error){URL.revokeObjectURL(url);throw error}
 const avatar=kind==='avatar',ratio=avatar?1:4,title=avatar?'Profil fotoğrafını kırp':'Kapak görselini kırp';
 const dialog=document.createElement('dialog');dialog.className='crop-dialog';dialog.setAttribute('aria-labelledby','cropTitle');
 dialog.innerHTML=`<h2 id="cropTitle">${title}</h2><p class="muted" id="cropHelp">Görseli sürükleyerek konumlandır, kaydırıcıyla yakınlaştır. Görünen alan kaydedilecek.</p><div class="crop-stage ${avatar?'crop-circle':'crop-wide'}"><canvas id="cropCanvas" tabindex="0" role="img" aria-label="Kırpma önizlemesi; konumu ok tuşlarıyla değiştirebilirsin" aria-describedby="cropHelp"></canvas><div class="crop-guide" aria-hidden="true"></div></div><label for="cropZoom">Yakınlaştır <output id="cropZoomValue">1.00×</output></label><input id="cropZoom" type="range" min="1" max="3" step="0.01" value="1"><p class="notice">Klavyede önizlemeye odaklanıp ok tuşlarını kullanabilirsin.</p><p id="cropError" class="error" role="status"></p><div class="dialog-actions"><button type="button" id="cropReset">Ortala</button><button type="button" id="cropCancel">Vazgeç</button><button type="button" id="cropSave" class="primary">Kırp ve kaydet</button></div>`;
 document.body.append(dialog);
 const $=id=>dialog.querySelector('#'+id),canvas=$('cropCanvas');canvas.width=avatar?512:1280;canvas.height=avatar?512:320;
 let zoom=1,cx=.5,cy=.5,busy=false,drag=null,done=false;
 const context=canvas.getContext('2d');
 if(!context){dialog.remove();URL.revokeObjectURL(url);throw Error('Kırpma önizlemesi açılamadı.')}
 function geometry(){const g=cropGeometry(image.naturalWidth,image.naturalHeight,ratio,zoom,cx,cy);cx=g.cx;cy=g.cy;return g}
 function draw(){const g=geometry();context.clearRect(0,0,canvas.width,canvas.height);context.drawImage(image,g.sx,g.sy,g.sw,g.sh,0,0,canvas.width,canvas.height);$('cropZoomValue').textContent=zoom.toFixed(2)+'×'}
 function move(dx,dy){const g=geometry();cx-=dx*g.sw/image.naturalWidth;cy-=dy*g.sh/image.naturalHeight;draw()}
 canvas.onpointerdown=e=>{if(busy||e.button!==0||drag)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture?.(e.pointerId);canvas.focus();e.preventDefault()};
 canvas.onpointermove=e=>{if(!drag||busy||e.pointerId!==drag.id)return;const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;move((e.clientX-drag.x)/rect.width,(e.clientY-drag.y)/rect.height);drag.x=e.clientX;drag.y=e.clientY};
 canvas.onpointerup=canvas.onpointercancel=canvas.onlostpointercapture=()=>{drag=null};
 canvas.onkeydown=e=>{if(busy)return;const dirs={ArrowLeft:[-.025,0],ArrowRight:[.025,0],ArrowUp:[0,-.025],ArrowDown:[0,.025]};if(dirs[e.key]){e.preventDefault();move(...dirs[e.key])}};
 $('cropZoom').oninput=()=>{if(!busy){zoom=Number($('cropZoom').value);draw()}};
 $('cropReset').onclick=()=>{if(!busy){zoom=1;cx=cy=.5;$('cropZoom').value='1';draw()}};
 draw();
 return new Promise((resolve,reject)=>{
  const opener=document.activeElement;
  function finish(saved){if(done)return;done=true;dialog.close();dialog.remove();URL.revokeObjectURL(url);if(opener?.isConnected)opener.focus();else document.getElementById(avatar?'editAvatar':'editBanner')?.focus();resolve(saved)}
  $('cropCancel').onclick=()=>{if(!busy)finish(false)};
  dialog.addEventListener('cancel',e=>{e.preventDefault();if(!busy)finish(false)});
  dialog.addEventListener('close',()=>{if(!done&&!busy)finish(false)});
  $('cropSave').onclick=async()=>{
   if(busy)return;busy=true;drag=null;$('cropError').textContent='';dialog.querySelectorAll('button,input').forEach(el=>el.disabled=true);$('cropSave').textContent='Kaydediliyor…';
   try{
    const g=geometry(),output=document.createElement('canvas');output.width=avatar?512:1600;output.height=avatar?512:400;
    const ctx=output.getContext('2d');if(!ctx)throw Error('Görsel hazırlanamadı.');
    ctx.drawImage(image,g.sx,g.sy,g.sw,g.sh,0,0,output.width,output.height);
    const blob=await encode(output);if(blob.size>2000000)throw Error('Kırpılan görsel 2 MB sınırını aşıyor. Daha sade bir görsel seç.');
    await onSave(blob);finish(true);
   }catch(error){$('cropError').textContent=error.message||'Görsel kaydedilemedi. Tekrar dene.'}
   finally{busy=false;if(!done){dialog.querySelectorAll('button,input').forEach(el=>el.disabled=false);$('cropSave').textContent='Kırp ve kaydet'}}
  };
  try{dialog.showModal();canvas.focus()}catch(error){dialog.remove();URL.revokeObjectURL(url);reject(error)}
 });
}
