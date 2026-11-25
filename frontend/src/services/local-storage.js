// Development-only storage adapter. Replace with a remote API adapter when
// authentication and persistent database services are connected.
const KEY = 'wordshift-v1';

export function loadData() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY));
    if (!Array.isArray(data?.users)) return {users: [], active: null};
    if (data.users.some(u => u.guest)) {
      data.users = data.users.filter(u => !u.guest);
      if (!data.users.some(u => u.id === data.active)) data.active = null;
      saveData(data);
    }
    return data;
  } catch {
    return { users: [], active: null };
  }
}

export function saveData(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export const GUEST_KEY = 'wordshift-guest-v1';
export function loadGuest() {
  try {
    const guest = JSON.parse(localStorage.getItem(GUEST_KEY));
    if (!guest?.guest || !guest.id || !guest.matchKey) return null;
    return {...guest, name:'Misafir', sets:[], avatar:'', banner:'', city:''};
  } catch { return null; }
}
export function startGuest(account) {
  const previous = loadGuest();
  if (previous) return previous;
  account.matchKey = crypto.randomUUID() + crypto.randomUUID();
  localStorage.setItem(GUEST_KEY, JSON.stringify(account));
  return account;
}
export function saveGuest(account) {
  if (loadGuest()?.id === account.id) localStorage.setItem(GUEST_KEY, JSON.stringify(account));
}
export function clearGuest() { localStorage.removeItem(GUEST_KEY); }
