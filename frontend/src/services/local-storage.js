// Development-only storage adapter. Replace with a remote API adapter when
// authentication and persistent database services are connected.
const KEY = 'wordshift-v1';

export function loadData() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || { users: [], active: null };
  } catch {
    return { users: [], active: null };
  }
}

export function saveData(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}
