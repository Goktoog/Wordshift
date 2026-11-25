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
