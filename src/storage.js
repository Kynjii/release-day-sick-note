// localStorage can be missing or throw (private mode, blocked storage), so failures are ignored.
export function load(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Not saving a preference is fine.
  }
}
