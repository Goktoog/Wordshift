import { loadData, saveData } from '../services/local-storage.js';
import { queueCloud } from '../services/cloud.js';
import { scheduleAutoPublish } from '../services/auto-publish.js';

export const db=loadData();
export let user=null,page='home',setId=null,session=null,timer=null;
export const setUser=v=>{user=v};
export const setPage=v=>{page=v};
export const setSetId=v=>{setId=v};
export const setSession=v=>{session=v};
export const setTimer=v=>{timer=v};
export const save=()=>{saveData(db);queueCloud(user);scheduleAutoPublish(user)};
export let sharedSet=null;
export const setSharedSet=v=>{sharedSet=v};
export const current=()=>sharedSet?.id===setId?sharedSet:user?.sets.find(x=>x.id===setId);
export const allWords=()=>user.sets.flatMap(s=>s.items.filter(x=>x.type==='word'));
export const allItems=()=>user.sets.flatMap(s=>s.items);
