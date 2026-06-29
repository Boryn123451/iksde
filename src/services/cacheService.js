import { CACHE, STORAGE_KEYS } from '../config/constants.js';
import { readJson, writeJson } from './storageService.js';

export function getCacheKey(lat, lon) {
  return `${CACHE.prefix}_${Number(lat).toFixed(3)}_${Number(lon).toFixed(3)}`;
}

export function readWeatherCache(lat, lon, { allowStale = false } = {}) {
  const cached = readJson(getCacheKey(lat, lon), null);
  if (!cached?.data || !cached.ts) return null;
  if (cached.schemaVersion !== CACHE.schemaVersion) return null;
  const age = Date.now() - cached.ts;
  const ttl = allowStale ? CACHE.staleTtlMs : CACHE.ttlMs;
  if (age > ttl) return null;
  return { ...cached, stale: age > CACHE.ttlMs, age };
}

export function saveWeatherCache(lat, lon, data, city, country, countryCode = '') {
  writeJson(getCacheKey(lat, lon), {
    schemaVersion: CACHE.schemaVersion,
    ts: Date.now(),
    data,
    city: String(city || ''),
    country: String(country || ''),
    countryCode: String(countryCode || '').toUpperCase(),
    timezone: data?.timezone || '',
  });
}

export function formatCacheAge(ageMs) {
  if (!Number.isFinite(ageMs)) return '—';
  const minutes = Math.max(0, Math.round(ageMs / 60000));
  if (minutes < 1) return 'przed chwilą';
  if (minutes === 1) return '1 min temu';
  if (minutes < 60) return `${minutes} min temu`;
  const hours = Math.round(minutes / 60);
  return `${hours} godz. temu`;
}

function cacheHash(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function getMapCacheKey(scope) {
  return `${CACHE.prefix}_${STORAGE_KEYS.mapWeatherPrefix}_${cacheHash(String(scope))}`;
}

export function readTimedCache(key, ttlMs) {
  const cached = readJson(key, null);
  if (!cached?.data || !cached.ts) return null;
  const age = Date.now() - cached.ts;
  if (age > ttlMs) return null;
  return { ...cached, age };
}

export function writeTimedCache(key, data) {
  writeJson(key, { ts: Date.now(), data });
}
