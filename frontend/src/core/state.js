import { loadData, saveData } from '../services/local-storage.js';

export const db=loadData();
export let user=null,page='home',setId=null,session=null,timer=null;
export const setUser=v=>{user=v};
export const setPage=v=>{page=v};
export const setSetId=v=>{setId=v};
export const setSession=v=>{session=v};
export const setTimer=v=>{timer=v};
export const save=()=>saveData(db);
export const current=()=>user.sets.find(x=>x.id===setId);
export const allWords=()=>user.sets.flatMap(s=>s.items.filter(x=>x.type==='word'));
export const allItems=()=>user.sets.flatMap(s=>s.items);
