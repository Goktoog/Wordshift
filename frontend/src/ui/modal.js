import { $ } from '../core/utils.js';

export function modal(h,cb){$('modalBody').innerHTML=h;$('dialog').showModal();$('modalForm').onsubmit=async e=>{e.preventDefault();const result=await cb(new FormData(e.target));if(result!==false)$('dialog').close()}}
export function initModal(){$('closeModal').onclick=()=>$('dialog').close();}
