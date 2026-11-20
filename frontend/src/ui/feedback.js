import { $ } from '../core/utils.js';

let toastTimer;
export function toast(msg){$('toast').textContent=msg;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2000)}
export function sound(ok){try{let ctx=new (window.AudioContext||window.webkitAudioContext)();let o=ctx.createOscillator(),g=ctx.createGain();o.type=ok?'sine':'triangle';o.frequency.setValueAtTime(ok?660:210,ctx.currentTime);o.frequency.exponentialRampToValueAtTime(ok?990:120,ctx.currentTime+.22);g.gain.setValueAtTime(.08,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.3);o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+.32);o.onended=()=>ctx.close()}catch{}}
