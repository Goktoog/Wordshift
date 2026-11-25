import { loadData, saveData, saveGuest } from '../services/local-storage.js';
import { queueCloud } from '../services/cloud.js';
import { scheduleAutoPublish } from '../services/auto-publish.js';

export const db=loadData();
export let user=null,page='home',setId=null,session=null,timer=null;
// Klasörler kaldırıldı: eski hesaplardaki klasörler temizlenir, setler korunur.
// `folders` anahtarı Supabase kaydı için boş dizi olarak kalır.
const dropFolders=v=>{if(!v)return v;v.folders=[];if(Array.isArray(v.sets))v.sets.forEach(s=>{delete s.folder});return v};
export const setUser=v=>{user=dropFolders(v)};
export const setPage=v=>{page=v};
export const setSetId=v=>{setId=v};
export const setSession=v=>{session=v};
export const setTimer=v=>{timer=v};
export const save=()=>{if(user?.guest){saveGuest(user);return}saveData(db);queueCloud(user);scheduleAutoPublish(user)};
export let sharedSet=null;
export const setSharedSet=v=>{sharedSet=v};
export const current=()=>sharedSet?.id===setId?sharedSet:user?.sets.find(x=>x.id===setId);
export const allWords=()=>user.sets.flatMap(s=>s.items.filter(x=>x.type==='word'));
export const allItems=()=>user.sets.flatMap(s=>s.items);
