import { appState } from '../../state/appState.js';
import { WORLD_CITIES } from '../../data/worldCities.js';
import { xyToLatLon } from './mapProjection.js';

let generatedCityCatalog = null;
let catalogLoadPromise = null;
let mergedCityCatalog = mergeCityCatalog([]);
let catalogVersion = 'curated';
let detailIndex = null;
let detailIndexPromise = null;
let detailCatalog = [];
let detailLoadPromises = new Map();
let detailLoadedKeys = new Set();
let detailMissingKeys = new Set();
let detailVersion = 'none';

const DETAIL_ZOOM_THRESHOLD = 5.6;
const DETAIL_SHARD_DEGREES = 5;

function normalizeLon(lon) {
  let value = Number(lon);
  while (value > 180) value -= 360;
  while (value < -180) value += 360;
  return value;
}

function lonDelta(a, b) {
  return normalizeLon(Number(a) - Number(b));
}

function cityId(city) {
  return `${city.name}:${Number(city.lat).toFixed(3)},${Number(city.lon).toFixed(3)}`;
}

function cityDedupeId(city) {
  return `${String(city.country || '').toUpperCase()}:${Number(city.lat).toFixed(2)}:${Number(city.lon).toFixed(2)}`;
}

function normalizeGeneratedCity(row) {
  if (!Array.isArray(row) || row.length < 5) return null;
  const [name, country, lat, lon, population, capital, admin] = row;
  const safeLat = Number(lat);
  const safeLon = Number(lon);
  if (!name || !country || !Number.isFinite(safeLat) || !Number.isFinite(safeLon)) return null;
  return {
    name: String(name).slice(0, 80),
    country: String(country).slice(0, 2).toUpperCase(),
    lat: safeLat,
    lon: safeLon,
    population: Number(population) || 0,
    capital: Boolean(capital),
    regional: Boolean(admin),
  };
}

function mergeCityCatalog(generatedCities) {
  const result = [];
  const seen = new Set();
  const add = (city) => {
    if (!city || !Number.isFinite(Number(city.lat)) || !Number.isFinite(Number(city.lon))) return;
    const key = cityDedupeId(city);
    if (seen.has(key)) return;
    seen.add(key);
    result.push(city);
  };
  const isNearCuratedCity = (city) => WORLD_CITIES.some((base) => String(base.country || '').toUpperCase() === String(city.country || '').toUpperCase()
    && Math.abs(Number(base.lat) - Number(city.lat)) < 0.16
    && Math.abs(lonDelta(base.lon, city.lon)) < 0.16
    && distanceKm(base, city) < 18);
  WORLD_CITIES.forEach(add);
  generatedCities.forEach((city) => {
    if (isNearCuratedCity(city)) return;
    add(city);
  });
  return result;
}

function rebuildMergedCityCatalog() {
  mergedCityCatalog = mergeCityCatalog([
    ...(generatedCityCatalog || []),
    ...detailCatalog,
  ]);
}

function worldCities() {
  return mergedCityCatalog;
}

function catalogUrl() {
  const base = import.meta.env?.BASE_URL || './';
  return `${base.replace(/\/?$/u, '/')}data/world-cities.min.json`;
}

function detailBaseUrl() {
  const base = import.meta.env?.BASE_URL || './';
  return `${base.replace(/\/?$/u, '/')}data/world-cities-detail/`;
}

export async function ensureWorldCityCatalogLoaded() {
  if (generatedCityCatalog) return mergedCityCatalog;
  if (catalogLoadPromise) return catalogLoadPromise;
  catalogLoadPromise = fetch(catalogUrl(), { cache: 'force-cache' })
    .then(async (response) => {
      if (!response.ok) throw new Error(`World city catalog ${response.status}`);
      const payload = await response.json();
      generatedCityCatalog = (payload.cities || []).map(normalizeGeneratedCity).filter(Boolean);
      catalogVersion = payload.version || 'cities15000';
      rebuildMergedCityCatalog();
      return mergedCityCatalog;
    })
    .catch(() => {
      generatedCityCatalog = [];
      catalogVersion = 'curated-fallback';
      rebuildMergedCityCatalog();
      return mergedCityCatalog;
    });
  return catalogLoadPromise;
}

function lonToDetailCol(lon) {
  return Math.max(0, Math.min(71, Math.floor((normalizeLon(lon) + 180) / DETAIL_SHARD_DEGREES)));
}

function latToDetailRow(lat) {
  return Math.max(0, Math.min(35, Math.floor((Number(lat) + 90) / DETAIL_SHARD_DEGREES)));
}

function detailShardKey(row, col) {
  return `r${String(row).padStart(2, '0')}_c${String(col).padStart(2, '0')}`;
}

function detailShardCenter(key) {
  const match = String(key).match(/^r(\d+)_c(\d+)$/u);
  if (!match) return { lat: 0, lon: 0 };
  const row = Number(match[1]);
  const col = Number(match[2]);
  return {
    lat: -90 + row * DETAIL_SHARD_DEGREES + DETAIL_SHARD_DEGREES / 2,
    lon: -180 + col * DETAIL_SHARD_DEGREES + DETAIL_SHARD_DEGREES / 2,
  };
}

async function ensureDetailIndexLoaded() {
  if (detailIndex) return detailIndex;
  if (detailIndexPromise) return detailIndexPromise;
  detailIndexPromise = fetch(`${detailBaseUrl()}index.json`, { cache: 'force-cache' })
    .then(async (response) => {
      if (!response.ok) throw new Error(`World city detail index ${response.status}`);
      const payload = await response.json();
      detailIndex = new Set(Object.keys(payload.shards || {}));
      detailVersion = payload.version || 'cities500-shards';
      return detailIndex;
    })
    .catch(() => {
      detailIndex = new Set();
      detailVersion = 'detail-unavailable';
      return detailIndex;
    });
  return detailIndexPromise;
}

function viewportDetailShardKeys(viewport, zoom, width) {
  if (zoom < DETAIL_ZOOM_THRESHOLD) return [];
  const mobile = width < 620;
  const maxShards = mobile ? 12 : 24;
  const rows = [];
  const minRow = latToDetailRow(viewport.minLat);
  const maxRow = latToDetailRow(viewport.maxLat);
  for (let row = minRow; row <= maxRow; row += 1) rows.push(row);

  const cols = new Set();
  if (viewport.halfLon >= 179) {
    for (let col = 0; col < 72; col += 1) cols.add(col);
  } else {
    const start = viewport.centerLon - viewport.halfLon;
    const end = viewport.centerLon + viewport.halfLon;
    cols.add(lonToDetailCol(start));
    cols.add(lonToDetailCol(end));
    for (let lon = start; lon <= end; lon += DETAIL_SHARD_DEGREES) {
      cols.add(lonToDetailCol(lon));
    }
  }

  return rows
    .flatMap((row) => [...cols].map((col) => detailShardKey(row, col)))
    .sort((a, b) => {
      const centerA = detailShardCenter(a);
      const centerB = detailShardCenter(b);
      return distanceKm(centerA, viewport) - distanceKm(centerB, viewport);
    })
    .slice(0, maxShards);
}

async function loadDetailShard(key) {
  if (detailLoadedKeys.has(key) || detailMissingKeys.has(key)) return;
  if (detailLoadPromises.has(key)) return detailLoadPromises.get(key);
  const promise = fetch(`${detailBaseUrl()}${key}.json`, { cache: 'force-cache' })
    .then(async (response) => {
      if (response.status === 404) {
        detailMissingKeys.add(key);
        return;
      }
      if (!response.ok) throw new Error(`World city detail shard ${key} ${response.status}`);
      const payload = await response.json();
      const cities = (Array.isArray(payload) ? payload : payload.cities || []).map(normalizeGeneratedCity).filter(Boolean);
      detailCatalog = detailCatalog.concat(cities);
      detailLoadedKeys.add(key);
      rebuildMergedCityCatalog();
    })
    .catch(() => {
      detailMissingKeys.add(key);
    })
    .finally(() => {
      detailLoadPromises.delete(key);
    });
  detailLoadPromises.set(key, promise);
  return promise;
}

export async function ensureCityCatalogForViewport({ viewport, zoom, width }) {
  await ensureWorldCityCatalogLoaded();
  const keys = viewportDetailShardKeys(viewport, zoom, width);
  if (!keys.length) return mergedCityCatalog;
  const available = await ensureDetailIndexLoaded();
  const missing = keys.filter((key) => !available.has(key));
  missing.forEach((key) => detailMissingKeys.add(key));
  await Promise.all(keys.filter((key) => available.has(key)).map(loadDetailShard));
  return mergedCityCatalog;
}

export function setWorldCityCatalogForTests(cities, version = 'test') {
  generatedCityCatalog = cities.map((city) => normalizeGeneratedCity([
    city.name,
    city.country,
    city.lat,
    city.lon,
    city.population,
    city.capital ? 1 : 0,
    city.regional ? 1 : 0,
  ])).filter(Boolean);
  catalogVersion = version;
  rebuildMergedCityCatalog();
  catalogLoadPromise = Promise.resolve(mergedCityCatalog);
}

export function resetWorldCityCatalogForTests() {
  generatedCityCatalog = null;
  catalogVersion = 'curated';
  detailIndex = null;
  detailIndexPromise = null;
  detailCatalog = [];
  detailLoadPromises = new Map();
  detailLoadedKeys = new Set();
  detailMissingKeys = new Set();
  detailVersion = 'none';
  rebuildMergedCityCatalog();
  catalogLoadPromise = null;
}

export function setDetailCityCatalogForTests(cities, version = 'detail-test') {
  detailCatalog = cities.map((city) => normalizeGeneratedCity([
    city.name,
    city.country,
    city.lat,
    city.lon,
    city.population,
    city.capital ? 1 : 0,
    city.regional ? 1 : 0,
  ])).filter(Boolean);
  detailVersion = version;
  detailLoadedKeys = new Set(['test']);
  rebuildMergedCityCatalog();
}

export function cityCatalogStatus() {
  return {
    version: catalogVersion,
    detailVersion,
    count: mergedCityCatalog.length,
    detailCount: detailCatalog.length,
    detailShards: detailLoadedKeys.size,
    loaded: Boolean(generatedCityCatalog),
  };
}

function distanceKm(a, b) {
  const lat1 = Number(a.lat) * Math.PI / 180;
  const lat2 = Number(b.lat) * Math.PI / 180;
  const dLat = (Number(b.lat) - Number(a.lat)) * Math.PI / 180;
  const dLon = lonDelta(b.lon, a.lon) * Math.PI / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function minPopulationForZoom(zoom) {
  if (zoom < 2.5) return { city: 3500000, capital: 900000 };
  if (zoom < 3.8) return { city: 1200000, capital: 400000 };
  if (zoom < 5.1) return { city: 240000, capital: 120000 };
  if (zoom < 5.8) return { city: 25000, capital: 0 };
  if (zoom < 6.8) return { city: 9000, capital: 0 };
  if (zoom < 8.2) return { city: 2500, capital: 0 };
  if (zoom < 10.2) return { city: 700, capital: 0 };
  return { city: 500, capital: 0 };
}

function maxPointsFor(width, zoom) {
  const mobile = width < 620;
  if (zoom < 2.5) return mobile ? 16 : 30;
  if (zoom < 4) return mobile ? 22 : 40;
  if (zoom < 5.4) return mobile ? 26 : 46;
  if (zoom < 8) return mobile ? 28 : 50;
  return mobile ? 32 : 58;
}

export function getCurrentMapViewport(width, height, padding = 120) {
  const topLeft = xyToLatLon(-padding, -padding, width, height);
  const bottomRight = xyToLatLon(width + padding, height + padding, width, height);
  const centerLat = Number(appState.map.centerLat);
  const centerLon = normalizeLon(appState.map.centerLon);
  const minLat = Math.max(-85, Math.min(topLeft.lat, bottomRight.lat));
  const maxLat = Math.min(85, Math.max(topLeft.lat, bottomRight.lat));
  const halfLon = Math.min(180, Math.max(1, Math.abs(lonDelta(bottomRight.lon, topLeft.lon)) / 2));
  const halfLat = Math.max(1, Math.abs(maxLat - minLat) / 2);
  return { centerLat, centerLon, minLat, maxLat, halfLat, halfLon };
}

function inViewport(city, viewport) {
  return city.lat >= viewport.minLat
    && city.lat <= viewport.maxLat
    && Math.abs(lonDelta(city.lon, viewport.centerLon)) <= viewport.halfLon;
}

function passesZoom(city, zoom) {
  if (city.polarStation) return zoom >= 3.2;
  const min = minPopulationForZoom(zoom);
  if (city.capital && city.population >= min.capital) return true;
  if (city.regional && zoom >= 4.4 && city.population >= Math.max(5000, min.city * 0.45)) return true;
  return city.population >= min.city;
}

function rankCity(city, viewport, zoom) {
  const latNorm = Math.abs(city.lat - viewport.centerLat) / Math.max(1, viewport.halfLat);
  const lonNorm = Math.abs(lonDelta(city.lon, viewport.centerLon)) / Math.max(1, viewport.halfLon);
  const distanceScore = Math.hypot(latNorm, lonNorm);
  const populationScore = Math.log10(Math.max(1, city.population));
  const localWeight = zoom >= 5.1 ? 5.2 : zoom >= 3.8 ? 3.2 : zoom < 2.5 ? .45 : 1.9;
  const populationWeight = zoom >= 5.1 ? .22 : zoom >= 3.8 ? .42 : zoom < 2.5 ? 1.05 : .72;
  const capitalBonus = city.capital ? -.22 : 0;
  return distanceScore * localWeight - populationScore * populationWeight + capitalBonus;
}

function labelScore(city, viewport, zoom) {
  if (city.isCurrent) return -10000;
  const latNorm = Math.abs(city.lat - viewport.centerLat) / Math.max(1, viewport.halfLat);
  const lonNorm = Math.abs(lonDelta(city.lon, viewport.centerLon)) / Math.max(1, viewport.halfLon);
  const distanceScore = Math.hypot(latNorm, lonNorm);
  const populationScore = Math.log10(Math.max(1, city.population));
  const capitalBonus = city.capital ? -0.9 : 0;
  const localityBias = zoom >= 7 ? distanceScore * 3.8 : distanceScore * 1.8;
  const populationBias = zoom >= 7 ? -populationScore * 0.35 : -populationScore * 0.82;
  return localityBias + populationBias + capitalBonus;
}

function addCurrentLocation(cities, currentLocation, viewport) {
  if (!Number.isFinite(currentLocation?.lat) || !Number.isFinite(currentLocation?.lon)) return cities;
  const current = {
    name: currentLocation.city || currentLocation.name || 'Tutaj',
    country: currentLocation.country || '',
    lat: Number(currentLocation.lat),
    lon: Number(currentLocation.lon),
    population: Number.MAX_SAFE_INTEGER,
    capital: false,
    isCurrent: true,
    labelRank: 0,
    rank: 0,
    mapScore: -1000,
  };
  const filtered = cities.filter((city) => distanceKm(city, current) > 2);
  return inViewport(current, viewport) ? [current, ...filtered] : filtered;
}

function fallbackNearest(cities, viewport, zoom, limit) {
  if (cities.length >= Math.min(6, limit)) return cities;
  const center = { lat: viewport.centerLat, lon: viewport.centerLon };
  const existing = new Set(cities.map(cityId));
  const min = minPopulationForZoom(Math.max(1, zoom - 1.4));
  const extras = worldCities()
    .filter((city) => !existing.has(cityId(city)))
    .filter((city) => city.population >= min.city || city.capital)
    .map((city) => ({ ...city, mapScore: distanceKm(city, center) / 900 }))
    .sort((a, b) => a.mapScore - b.mapScore)
    .slice(0, Math.max(0, limit - cities.length));
  return [...cities, ...extras];
}

export function selectMapCities({ viewport, zoom, width, currentLocation }) {
  const limit = maxPointsFor(width, zoom);
  const candidates = worldCities()
    .filter((city) => inViewport(city, viewport))
    .filter((city) => passesZoom(city, zoom))
    .map((city) => ({ ...city, isCurrent: false, mapScore: rankCity(city, viewport, zoom) }))
    .sort((a, b) => a.mapScore - b.mapScore || b.population - a.population)
    .slice(0, limit);

  const withFallback = fallbackNearest(candidates, viewport, zoom, limit);
  const selected = addCurrentLocation(withFallback, currentLocation, viewport).slice(0, limit);
  const labelRanks = new Map(
    [...selected]
      .sort((a, b) => labelScore(a, viewport, zoom) - labelScore(b, viewport, zoom) || b.population - a.population)
      .map((city, index) => [cityId(city), city.isCurrent ? 0 : index + 1]),
  );
  const withCurrent = selected.map((city, index) => ({
    ...city,
    rank: city.isCurrent ? 0 : index + 1,
    labelRank: labelRanks.get(cityId(city)) ?? index + 1,
  }));

  const zoomBucket = Math.round(zoom * 2) / 2;
  const latBucket = Math.round(viewport.centerLat * 2) / 2;
  const lonBucket = Math.round(viewport.centerLon * 2) / 2;
  const scope = [
    'world-v6',
    catalogVersion,
    detailVersion,
    `z${zoomBucket}`,
    `c${latBucket}:${lonBucket}`,
    width < 620 ? 'm' : 'd',
    withCurrent.map(cityId).join('|'),
  ].join('|');

  return { cities: withCurrent, scope };
}

export function selectCurrentMapCities({ width, height, currentLocation }) {
  return selectMapCities({
    viewport: getCurrentMapViewport(width, height),
    zoom: appState.map.zoom,
    width,
    currentLocation,
  });
}
