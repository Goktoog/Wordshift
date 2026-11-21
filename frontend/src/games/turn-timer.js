import { $ } from '../core/utils.js';
import { session, timer, setTimer } from '../core/state.js';
import { countdownBeep } from '../ui/feedback.js';

export const timerMarkup = () => '<div class="turn-timer"><span id="turnTime">10 sn</span><div class="progress"><i id="turnBar" style="width:100%"></i></div></div>';

// Oturum başına tek bir geri sayım. Süre dolunca onTimeout bir kez çağrılır.
export function turnTimer(s, seconds, onTimeout) {
  clearInterval(timer);
  const end = Date.now() + seconds * 1000;
  const id = setInterval(() => {
    const label = $('turnTime'), bar = $('turnBar');
    if (session !== s || !label) { clearInterval(id); return; }
    const left = Math.max(0, end - Date.now());
    label.textContent = Math.ceil(left / 1000) + ' sn';
    if (left > 0) countdownBeep('turn' + end, Math.ceil(left / 1000));
    bar.style.width = (left / (seconds * 1000) * 100) + '%';
    if (left <= 0) { clearInterval(id); onTimeout(); }
  }, 150);
  setTimer(id);
}
