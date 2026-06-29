import { CACHE, STORAGE_KEYS } from '../config/constants.js';
import { readTimedCache, writeTimedCache } from '../services/cacheService.js';
import { fetchJson } from './http.js';

const RAINVIEWER_API = 'https://api.rainviewer.com/public/weather-maps.json';
const RAINVIEWER_DOCS = 'https://www.rainviewer.com/api/weather-maps-api.html';

function normalizeFrame(frame) {
  const time = Number(frame?.time);
  const path = String(frame?.path || '').trim();
  if (!Number.isFinite(time) || !path.startsWith('/')) return null;
  return { time, path };
}

export async function fetchRainRadarTimeline({ force = false } = {}) {
  if (!force) {
    const cached = readTimedCache(STORAGE_KEYS.radarFrames, CACHE.radarTtlMs);
    if (cached?.data?.frames?.length) return { ...cached.data, cached: true, age: cached.age };
  }

  const data = await fetchJson(RAINVIEWER_API, { timeout: 10000 });
  const host = String(data?.host || '').trim();
  const frames = (data?.radar?.past || []).map(normalizeFrame).filter(Boolean);
  if (!host || !frames.length) throw new Error('Brak klatek radaru RainViewer');

  const result = {
    host,
    frames,
    latest: frames[frames.length - 1],
    generated: Number(data?.generated) || null,
    source: 'RainViewer',
    sourceUrl: RAINVIEWER_DOCS,
  };
  writeTimedCache(STORAGE_KEYS.radarFrames, result);
  return result;
}

export function rainRadarTileTemplate(timeline, frame = timeline?.latest) {
  if (!timeline?.host || !frame?.path) return '';
  return `${timeline.host}${frame.path}/512/{z}/{x}/{y}/2/0_1.png`;
}

export function formatRadarTime(frame, timeZone = 'Europe/Warsaw') {
  const time = Number(frame?.time);
  if (!Number.isFinite(time)) return '';
  return new Intl.DateTimeFormat('pl-PL', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(new Date(time * 1000));
}
