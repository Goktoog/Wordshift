import { $ } from '../core/utils.js';

export function modal(h,cb){$('modalBody').innerHTML=h;$('dialog').showModal();$('modalForm').onsubmit=async e=>{e.preventDefault();await cb(new FormData(e.target));$('dialog').close()}}
export function initModal(){$('closeModal').onclick=()=>$('dialog').close();}
