import { $ } from '../core/utils.js';

let toastTimer;
export function toast(msg){$('toast').textContent=msg;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2000)}
export function sound(ok){try{let ctx=new (window.AudioContext||window.webkitAudioContext)();let o=ctx.createOscillator(),g=ctx.createGain();o.type=ok?'sine':'triangle';o.frequency.setValueAtTime(ok?660:210,ctx.currentTime);o.frequency.exponentialRampToValueAtTime(ok?990:120,ctx.currentTime+.22);g.gain.setValueAtTime(.08,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.3);o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+.32);o.onended=()=>ctx.close()}catch{}}

// Shared audio context so short alerts also work when the tab is in the background.
let audio;
function context(){try{audio||=new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')void audio.resume();return audio}catch{return null}}
function tone(freq,delay,length,volume=.1,type='sine'){
 const c=context();if(!c)return;
 const o=c.createOscillator(),g=c.createGain(),t=c.currentTime+delay;
 o.type=type;o.frequency.value=freq;
 g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(volume,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+length);
 o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+length+.03);
}
// Short tick for the last three seconds of a timer.
export function bonkSound(){tone(220,0,.12,.12,'triangle');tone(530,.03,.30,.08,'sine');tone(780,.055,.18,.035,'sine')}
export function beep(){tone(1040,0,.13,.09,'triangle')}
// "Dın dın dın": a match was found.
export function matchFoundSound(){[0,.24,.48].forEach(d=>tone(880,d,.17,.13,'sine'))}
let lastBeep='';
// Call on every timer tick: plays one beep per whole second left (3, 2, 1) for the given timer id.
export function countdownBeep(id,secondsLeft){
 if(!(secondsLeft>=1&&secondsLeft<=3))return;
 const key=id+':'+secondsLeft;if(key===lastBeep)return;lastBeep=key;beep();
}

export function inviteSound(){tone(587,0,.15,.07);tone(784,.16,.23,.08)}
export function declineSound(){tone(392,0,.14,.06);tone(294,.13,.2,.06)}
