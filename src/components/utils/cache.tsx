export function setCache(key, data) {
  const payload = {
    data,
    timestamp: Date.now(),
  };
  localStorage.setItem(key, JSON.stringify(payload));
}

export function getCache(key, maxAgeMs = 10 * 60 * 1000) {
  // default 10 min
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > maxAgeMs) {
      localStorage.removeItem(key);
      return null;
    }
    return data;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}
