let owner = 'guest';
export function accountOwner() { return owner; }
export function setAccountOwner(id: string | null) { owner = id || 'guest'; }
export const accountStorage = {
  getItem(key: string) { return localStorage.getItem(`workspace:${owner}:${key}`); },
  setItem(key: string, value: string) { localStorage.setItem(`workspace:${owner}:${key}`, value); },
  removeItem(key: string) { localStorage.removeItem(`workspace:${owner}:${key}`); },
};
export function clearAccountLocalData() {
  const prefix = `workspace:${owner}:`;
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key?.startsWith(prefix)) localStorage.removeItem(key);
  }
}
