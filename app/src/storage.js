// localStorage shim to replace artifact's window.storage API.
export async function storageGet(key, def) {
  try {
    const v = localStorage.getItem(key);
    return v == null ? def : JSON.parse(v);
  } catch {
    return def;
  }
}

export async function storageSet(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {}
}
