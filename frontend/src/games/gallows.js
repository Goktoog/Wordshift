import {escape} from '../core/utils.js';
const parts=[
 '<circle cx="70" cy="31" r="9"/>','<path d="M70 40v7"/>',
 '<path d="M70 47L54 58"/>','<path d="M70 47L86 58"/>',
 '<path d="M70 47v22"/>','<path d="M70 69L57 89"/>','<path d="M70 69L83 89"/>'
];
export function gallows(name,remaining){
 const count=Math.max(0,Math.min(7,7-remaining));
 return `<figure class="gallows"><figcaption>${escape(name)}</figcaption><svg viewBox="0 0 112 100" role="img" aria-label="${escape(name)}, çizilen parça ${count}/7"><g fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="#aa895f" stroke-width="4" d="M8 94h42M22 94V9h48M22 28L41 9"/><path stroke="#d5aa6a" stroke-width="2" d="M70 9v13"/><g stroke="currentColor" stroke-width="3">${parts.slice(0,count).join('')}</g></g></svg></figure>`;
}
export function duelGallows(s){
 const mine=s.me-1,rival=1-mine;
 return gallows('Sen',s.lives[mine])+gallows(s.names[rival]||'Rakip',s.lives[rival]);
}
