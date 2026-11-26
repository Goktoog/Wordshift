// A real editable control accepts both touch-keyboard input and composed text.
export const detectiveInput='<input class="detective-input" type="text" inputmode="text" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" aria-label="İngilizce harf tahmini" placeholder="Harf yaz…">';

export function bindDetectiveInput(input, scene, submit) {
  let composing=false;
  function read() {
    if(composing)return;
    const letters=input.value.normalize('NFC').toLowerCase();
    input.value='';
    if(letters)submit(letters);
  }
  function finishComposition(){composing=false;read()}
  function startComposition(){composing=true}
  function keys(e){
    if(!scene.isConnected||e.target===input||e.defaultPrevented||e.isComposing||e.ctrlKey||e.altKey||e.metaKey||e.repeat)return;
    if(e.target.closest?.('input,textarea,select,[contenteditable="true"]'))return;
    if(/^[\p{L}\p{N}]$/u.test(e.key)){e.preventDefault();submit(e.key.toLowerCase())}
  }
  // Keep focus when the player mixes the on-screen letter buttons with typing.
  function retain(e){if(e.target.closest?.('#detectiveKeys button'))e.preventDefault()}
  function touch(e){if(!e.target.closest?.('button,input,a,select,textarea'))input.focus({preventScroll:true})}
  input.value='';
  input.addEventListener('input',read);
  input.addEventListener('compositionstart',startComposition);
  input.addEventListener('compositionend',finishComposition);
  scene.addEventListener('click',touch);
  scene.addEventListener('pointerdown',retain);
  scene.addEventListener('keydown',keys);
  input.focus({preventScroll:true});
  return ()=>{
    input.removeEventListener('input',read);
    input.removeEventListener('compositionstart',startComposition);
    input.removeEventListener('compositionend',finishComposition);
    scene.removeEventListener('keydown',keys);
    scene.removeEventListener('click',touch);
    scene.removeEventListener('pointerdown',retain);
    input.value='';
  };
}
