export function readJson(key, fallback = null, validator = null) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (validator && !validator(parsed)) return fallback;
    return parsed;
  } catch {
    return fallback;
  }
}

export function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function readString(key, fallback = '') {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

export function writeString(key, value) {
  try {
    localStorage.setItem(key, String(value));
    return true;
  } catch {
    return false;
  }
}

export function isLocation(value) {
  return Boolean(value)
    && Number.isFinite(Number(value.lat))
    && Number.isFinite(Number(value.lon));
}

export function normalizeLocation(value) {
  if (!isLocation(value)) return null;
  return {
    lat: Number(value.lat),
    lon: Number(value.lon),
    name: String(value.name || value.city || '').slice(0, 100),
    city: String(value.city || value.name || '').slice(0, 100),
    country: String(value.country || '').slice(0, 100),
    countryCode: String(value.countryCode || '').slice(0, 2).toUpperCase(),
  };
}

export function normalizeLocations(values, limit = 12) {
  if (!Array.isArray(values)) return [];
  const seen = new Set();
  const result = [];
  for (const item of values) {
    const loc = normalizeLocation(item);
    if (!loc) continue;
    const key = `${loc.lat.toFixed(3)},${loc.lon.toFixed(3)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(loc);
    if (result.length >= limit) break;
  }
  return result;
}
