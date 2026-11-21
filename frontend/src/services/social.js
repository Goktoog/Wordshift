import { client } from './cloud.js';
export function socialError(error) {
  if (['42P01','42883','PGRST202','PGRST205'].includes(error.code)) return 'Sosyal özellikler henüz kurulmamış. Site yöneticisi supabase/social.sql dosyasını çalıştırmalı.';
  return error.message || 'Bağlantı kurulamadı. Tekrar dene.';
}
async function rpc(name, args) {
  const c = await client();
  const {data, error} = await c.rpc(name, args);
  if (error) throw Error(socialError(error));
  return data;
}
export const leaderboard = async (scope, city, offset = 0) => (await rpc('wordshift_leaderboard', {scope, city_filter: city || '', page_offset: offset})) || [];
export const myRank = (scope, city) => rpc('wordshift_my_rank', {scope, city_filter: city || ''});
export const userProfile = async id => (await rpc('wordshift_user_profile', {target: id}))?.[0] || null;
export const followList = async (id, kind, offset = 0) => (await rpc('wordshift_follow_list', {target: id, kind, page_offset: offset})) || [];
export const searchUsers = async (query, offset = 0) => (await rpc('wordshift_search_users', {query_text: query.trim().slice(0, 35), page_offset: offset})) || [];
export const follow = id => rpc('wordshift_follow', {target: id});
export const unfollow = id => rpc('wordshift_unfollow', {target: id});
