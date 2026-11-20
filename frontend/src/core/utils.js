

export const $=id=>document.getElementById(id), escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])), uid=()=>crypto.randomUUID(), shuffle=a=>[...a].sort(()=>Math.random()-.5), levels=['A1','A2','B1','B2','C1','C2'];
