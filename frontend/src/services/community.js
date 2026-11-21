import { client, flushCloud } from './cloud.js';
export function communityError(error) {
  if (['42P01','42883','PGRST202','PGRST205'].includes(error.code)) return 'Keşfet henüz kurulmamış. Site yöneticisi topluluk güncellemesini etkinleştirmeli.';
  return error.message || 'Bağlantı kurulamadı. Tekrar dene.';
}
export async function searchPublic(query='', author=null, offset=0) {
  const c=await client();
  const {data,error}=await c.rpc('wordshift_search_sets',{query_text:query.trim().slice(0,100), author_filter:author, page_offset:offset});
  if(error) throw Error(communityError(error));
  return data || [];
}
export async function getPublic(owner,id) {
  const c=await client();
  const {data,error}=await c.from('wordshift_public_sets').select('*').eq('owner_id',owner).eq('set_id',id).maybeSingle();
  if(error) throw Error(communityError(error));
  if(!data) throw Error('Bu set artık paylaşılmıyor veya bulunamadı.');
  return {id:data.set_id,ownerId:data.owner_id,authorName:data.author_name,name:data.title,items:data.items,publicSource:true};
}
export async function publishSet(set) {
  if(set.items.some(x=>x.questionImage))throw Error("Kaynak PDF görselleri içeren kopyalar yeniden yayımlanamaz. Bu sorular herkesin erişebildiği YDS başlangıç setindedir.");
  await flushCloud();
  const c=await client();
  const {error}=await c.rpc('wordshift_publish_set',{target_set_id:set.id});
  if(error) throw Error(communityError(error));
}
export async function unpublishSet(set) {
  const c=await client();
  const {error}=await c.rpc('wordshift_unpublish_set',{target_set_id:set.id});
  if(error) throw Error(communityError(error));
}
export async function publication(set, userId) {
  const c=await client();
  const {data,error}=await c.from('wordshift_public_sets').select('updated_at').eq('owner_id',userId).eq('set_id',set.id).maybeSingle();
  if(error) throw Error(communityError(error));
  return data;
}
