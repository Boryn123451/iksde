import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { STORAGE_KEYS } from '../../config/constants.js';
import { fetchMapWeather } from '../../api/mapWeatherApi.js';
import { fetchRainRadarTimeline, formatRadarTime, rainRadarTileTemplate } from '../../api/radarApi.js';
import { reverseGeocode } from '../../api/reverseGeocodingApi.js';
import { appState } from '../../state/appState.js';
import { logEvent } from '../../services/loggerService.js';
import { readJson, writeJson } from '../../services/storageService.js';
import { $$, byId, clear, createEl } from '../../utils/domUtils.js';
import { normalizeCountryCode } from '../../utils/countryUtils.js';
import { renderChart } from '../../components/chart.js';
import { getWmoIcon } from '../../utils/weatherCodeUtils.js';
import { temperature, temperatureUnit, windSpeed, windUnit } from '../../utils/unitUtils.js';
import { createDeclutter } from './mapDeclutter.js';
import { cityCatalogStatus, ensureCityCatalogForViewport, selectMapCities } from './mapCitySelector.js';
import { buildWeatherDeckLayers, labelText, weatherLayerValue } from './mapDeckLayers.js';
import { ADMIN_BOUNDARIES, COUNTRY_BOUNDARIES, MAP_LIMITS, mapStyleUrl, styleTheme, tuneBaseMapStyle } from './mapStyle.js';

const RADAR_SOURCE_ID = 'deep-weather-rainviewer-radar';
const RADAR_LAYER_ID = 'deep-weather-rainviewer-radar-layer';

let loadWeatherRef = null;
let map = null;
let deckOverlay = null;
let mapPoints = [];
let lastMapScope = '';
let loadedMapScope = '';
let pendingMapScope = '';
let mapRequestSeq = 0;
let refreshTimer = null;
let resizeTimer = null;
let lastTheme = '';
let lastDeckClickAt = 0;
let radarTimeline = null;
let radarFrame = null;
let radarTileUrl = '';
let mapAreaLabel = '';
let mapAreaTimer = null;
let mapAreaSeq = 0;
const mapAreaCache = new Map();

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || min));
}

function normalizeLon(lon) {
  let value = Number(lon);
  while (value > 180) value -= 360;
  while (value < -180) value += 360;
  return value;
}

function isPlaceholderLocationName(input) {
  const text = String(input || '').trim().toLowerCase()
    .normalize('NFD')
    .replace(/\p{Mark}/gu, '');
  return !text
    || text === 'udostepniona lokalizacja'
    || text === 'moja lokalizacja'
    || text === 'shared location';
}

function lonDelta(a, b) {
  return normalizeLon(Number(a) - Number(b));
}

function mapPointId(point) {
  return `${Number(point.lat).toFixed(4)},${Number(point.lon).toFixed(4)}`;
}

function pendingMapPoint(city, previous = {}) {
  return {
    ...city,
    temp: previous.temp ?? null,
    apparent: previous.apparent ?? null,
    humidity: previous.humidity ?? null,
    code: previous.code ?? null,
    isDay: previous.isDay ?? 1,
    wind: previous.wind ?? null,
    windDir: previous.windDir ?? null,
    precip: previous.precip ?? 0,
    precipProb: previous.precipProb ?? null,
    cloud: previous.cloud ?? null,
    hasWeather: Boolean(previous.hasWeather),
  };
}

function renderPendingMapPoints(cities, scope, { force = false } = {}) {
  if (!force && scope === lastMapScope && mapPoints.length) return;
  const previousById = new Map(mapPoints.map((point) => [mapPointId(point), point]));
  mapPoints = cities.map((city) => pendingMapPoint(city, previousById.get(mapPointId(city))));
  lastMapScope = scope;
  updateDeckLayers();
}

function saveMapView() {
  writeJson(STORAGE_KEYS.mapView, {
    layer: appState.map.layer,
    zoom: appState.map.zoom,
    tileZ: Math.round(appState.map.zoom),
    centerLat: appState.map.centerLat,
    centerLon: appState.map.centerLon,
  });
}

function restoreMapView() {
  const saved = readJson(STORAGE_KEYS.mapView, null);
  if (!saved) return;
  appState.map.layer = saved.layer || appState.map.layer;
  appState.map.zoom = clamp(saved.zoom, MAP_LIMITS.minZoom, MAP_LIMITS.maxZoom);
  appState.map.tileZ = Math.round(appState.map.zoom);
  appState.map.centerLat = Number(saved.centerLat) || appState.map.centerLat;
  appState.map.centerLon = Number(saved.centerLon) || appState.map.centerLon;
}

function currentLocation() {
  return {
    lat: appState.location.lat,
    lon: appState.location.lon,
    city: appState.location.city,
    name: appState.location.city,
    country: appState.location.countryCode || appState.location.country,
    countryName: appState.location.country,
  };
}

function syncStateFromMap() {
  if (!map) return;
  const center = map.getCenter();
  appState.map.centerLat = center.lat;
  appState.map.centerLon = center.lng;
  appState.map.zoom = map.getZoom();
  appState.map.tileZ = Math.round(appState.map.zoom);
}

function mapAreaFallbackLabel() {
  if (!map) {
    const countryCode = normalizeCountryCode(appState.location.countryCode || appState.location.country);
    const area = appState.location.country || appState.location.city || 'świat';
    return countryCode ? `Obszar: ${area} / ${countryCode}` : `Obszar: ${area}`;
  }
  const center = map.getCenter();
  return `Obszar: ${center.lat.toFixed(1)}, ${normalizeLon(center.lng).toFixed(1)}`;
}

function formatMapAreaLabel(result) {
  const city = isPlaceholderLocationName(result?.city) ? '' : result?.city;
  const country = result?.country || '';
  const countryCode = normalizeCountryCode(result?.countryCode || country);
  const area = [city, country].filter(Boolean).join(', ') || 'świat';
  return countryCode ? `Obszar: ${area} / ${countryCode}` : `Obszar: ${area}`;
}

function mapAreaCacheKey(center) {
  const lat = Math.round(Number(center.lat) * 2) / 2;
  const lon = Math.round(normalizeLon(center.lng) * 2) / 2;
  return `${lat.toFixed(1)}:${lon.toFixed(1)}`;
}

function queueMapAreaRefresh(delay = 420) {
  if (!map) return;
  window.clearTimeout(mapAreaTimer);
  mapAreaTimer = window.setTimeout(async () => {
    const center = map.getCenter();
    const key = mapAreaCacheKey(center);
    const cached = mapAreaCache.get(key);
    if (cached) {
      mapAreaLabel = cached;
      updateChrome();
      return;
    }
    const requestId = ++mapAreaSeq;
    try {
      const result = await reverseGeocode(center.lat, normalizeLon(center.lng));
      if (requestId !== mapAreaSeq) return;
      mapAreaLabel = formatMapAreaLabel(result);
      mapAreaCache.set(key, mapAreaLabel);
    } catch {
      if (requestId !== mapAreaSeq) return;
      mapAreaLabel = mapAreaFallbackLabel();
    }
    updateChrome();
  }, delay);
}

function viewportFromMap() {
  const bounds = map.getBounds();
  const center = map.getCenter();
  const west = bounds.getWest();
  const east = bounds.getEast();
  const south = Math.max(-85, bounds.getSouth());
  const north = Math.min(85, bounds.getNorth());
  return {
    centerLat: center.lat,
    centerLon: normalizeLon(center.lng),
    minLat: Math.min(south, north),
    maxLat: Math.max(south, north),
    halfLat: Math.max(1, Math.abs(north - south) / 2),
    halfLon: Math.min(180, Math.max(1, Math.abs(lonDelta(east, west)) / 2)),
  };
}

function mapWidth() {
  return map?.getContainer()?.clientWidth || byId('mapCanvas')?.clientWidth || 360;
}

function mapHeight() {
  return map?.getContainer()?.clientHeight || byId('mapCanvas')?.clientHeight || 300;
}

function labelBudget(width, zoom) {
  const mobile = width < 620;
  if (mobile) {
    if (zoom < 3.2) return 3;
    if (zoom < 5.6) return 5;
    if (zoom < 8) return 6;
    if (zoom < 11) return 8;
    return 10;
  }
  if (zoom < 3) return 8;
  if (zoom < 5) return 12;
  if (zoom < 7.5) return 15;
  if (zoom < 11) return 19;
  return 24;
}

function reservedBoxes(width, height) {
  const popup = byId('mapCityPopup');
  const boxes = [
    { x: 8, y: 8, w: 140, h: 62 },
    { x: Math.max(152, width - 180), y: 8, w: 172, h: 38 },
    { x: 8, y: height - 42, w: Math.min(270, width - 76), h: 36 },
    { x: width - 52, y: height - 104, w: 44, h: 98 },
  ];
  if (popup?.classList.contains('show')) {
    boxes.push({
      x: Number.parseFloat(popup.style.left) || 0,
      y: Number.parseFloat(popup.style.top) || 0,
      w: popup.offsetWidth || 230,
      h: popup.offsetHeight || 140,
    });
  }
  return boxes;
}

function labelBoxFor(point, x, y, width, height, declutter) {
  const text = point.labelText || '';
  const lines = text.split('\n');
  const labelW = Math.max(...lines.map((line) => line.length)) * 6.4 + 22;
  const labelH = lines.length > 1 ? 38 : 24;
  const candidates = [
    { x: x + 16, y: y - labelH / 2, w: labelW, h: labelH },
    { x: x - labelW - 16, y: y - labelH / 2, w: labelW, h: labelH },
    { x: x - labelW / 2, y: y + 16, w: labelW, h: labelH },
    { x: x - labelW / 2, y: y - labelH - 16, w: labelW, h: labelH },
  ].map((box) => ({
    x: Math.max(6, Math.min(width - box.w - 6, box.x)),
    y: Math.max(42, Math.min(height - box.h - 42, box.y)),
    w: box.w,
    h: box.h,
  }));
  return candidates.find((box) => declutter.canPlace(box, 4)) || null;
}

function buildDeclutteredLabels() {
  if (!map || !mapPoints.length) return [];
  const width = mapWidth();
  const height = mapHeight();
  const budget = labelBudget(width, appState.map.zoom);
  const declutter = createDeclutter(reservedBoxes(width, height));
  const sorted = [...mapPoints]
    .map((point) => ({
      ...point,
      labelText: labelText(point, appState.map.layer, appState.unitSystem),
    }))
    .sort((a, b) => (b.isCurrent - a.isCurrent) || (a.labelRank || 99) - (b.labelRank || 99) || (b.population || 0) - (a.population || 0));
  const labels = [];
  sorted.forEach((point) => {
    if (!point.isCurrent && labels.length >= budget) return;
    const screen = map.project([Number(point.lon), Number(point.lat)]);
    if (screen.x < -40 || screen.x > width + 40 || screen.y < -40 || screen.y > height + 40) return;
    const box = labelBoxFor(point, screen.x, screen.y, width, height, declutter);
    if (!box) return;
    declutter.place(box);
    labels.push({
      ...point,
      pixelOffset: [box.x + box.w / 2 - screen.x, box.y + box.h / 2 - screen.y],
    });
  });
  return labels;
}

function firstSymbolLayerId() {
  return map?.getStyle?.()?.layers?.find((layer) => layer.type === 'symbol')?.id;
}

function firstBoundaryLayerId() {
  const boundaryIds = [...ADMIN_BOUNDARIES, ...COUNTRY_BOUNDARIES];
  return map?.getStyle?.()?.layers?.find((layer) => boundaryIds.includes(layer.id))?.id || firstSymbolLayerId();
}

function removeRadarLayer() {
  if (!map) return;
  try {
    if (map.getLayer(RADAR_LAYER_ID)) map.removeLayer(RADAR_LAYER_ID);
    if (map.getSource(RADAR_SOURCE_ID)) map.removeSource(RADAR_SOURCE_ID);
    radarTileUrl = '';
  } catch {
    // Style can be temporarily unavailable during theme changes.
  }
}

function updateRadarBadge() {
  const badge = byId('mapRadarBadge');
  if (!badge) return;
  const active = appState.map.layer === 'radar';
  badge.hidden = !active;
  if (!active) return;
  badge.textContent = radarFrame
    ? `Radar: ${formatRadarTime(radarFrame, appState.location.timezone || 'Europe/Warsaw')}`
    : 'Radar: ładowanie';
}

function applyRadarLayer() {
  if (!map || appState.map.layer !== 'radar') return;
  if (typeof map.isStyleLoaded === 'function' && !map.isStyleLoaded()) return;
  const tile = rainRadarTileTemplate(radarTimeline, radarFrame);
  if (!tile) return;
  if (map.getLayer(RADAR_LAYER_ID) && map.getSource(RADAR_SOURCE_ID) && radarTileUrl === tile) {
    map.setPaintProperty(RADAR_LAYER_ID, 'raster-opacity', styleTheme() === 'light' ? 0.46 : 0.52);
    return;
  }
  removeRadarLayer();
  radarTileUrl = tile;
  map.addSource(RADAR_SOURCE_ID, {
    type: 'raster',
    tiles: [tile],
    tileSize: 512,
    minzoom: 0,
    maxzoom: 10,
    attribution: 'RainViewer',
  });
  map.addLayer({
    id: RADAR_LAYER_ID,
    type: 'raster',
    source: RADAR_SOURCE_ID,
    paint: {
      'raster-opacity': styleTheme() === 'light' ? 0.46 : 0.52,
      'raster-fade-duration': 240,
      'raster-resampling': 'nearest',
    },
  }, firstBoundaryLayerId());
}

async function updateRadarLayer({ force = false } = {}) {
  if (!map) return;
  if (appState.map.layer !== 'radar') {
    removeRadarLayer();
    updateRadarBadge();
    setFallback(false);
    return;
  }
  updateRadarBadge();
  try {
    radarTimeline = await fetchRainRadarTimeline({ force });
    radarFrame = radarTimeline.latest;
    applyRadarLayer();
    setFallback(false);
    updateRadarBadge();
  } catch {
    removeRadarLayer();
    radarFrame = null;
    updateRadarBadge();
    logEvent('warn', 'radar_layer_unavailable');
    setFallback(true, 'Radar opadów RainViewer jest chwilowo niedostępny. Pozostałe warstwy mapy nadal działają.');
  }
}

function updateLegend() {
  const legend = byId('mapLegend');
  if (!legend) return;
  const layer = appState.map.layer;
  const label = layer === 'radar' ? 'RADAR'
    : layer === 'precip' ? 'OPADY'
      : layer === 'wind' ? 'WIATR'
        : layer === 'cloud' ? 'CHMURY' : 'TEMP';
  clear(legend);
  legend.append(
    createEl('span', { className: 'map-legend-label', text: label }),
    createEl('span', { className: `map-legend-gradient map-legend-${layer}` }),
  );
}

function updateChrome() {
  const zoom = byId('mapZoomBadge');
  if (zoom) zoom.textContent = `Zoom ${Number(appState.map.zoom).toFixed(1)}`;
  const region = byId('mapRegionBadge');
  if (region) {
    region.textContent = mapAreaLabel || mapAreaFallbackLabel();
  }
  updateRadarBadge();
  updateLegend();
}

function hidePopup() {
  byId('mapCityPopup')?.classList.remove('show');
}

function showPopup(point, x, y) {
  const popup = byId('mapCityPopup');
  const container = byId('mapCanvas');
  if (!popup || !container || !point) return;
  clear(popup);
  const countryCode = normalizeCountryCode(point.country || point.countryCode);
  const wmo = getWmoIcon(point.code, point.isDay);
  popup.append(
    createEl('div', { className: 'mcp-title-row' }, [
      createEl('div', { className: 'mcp-name', text: point.name || 'Lokalizacja' }),
    ]),
    countryCode ? createEl('div', { className: 'mcp-country', text: countryCode }) : null,
    createEl('div', { className: 'mcp-row', text: `${wmo.icon} ${temperature(point.temp, appState.unitSystem)}${temperatureUnit(appState.unitSystem)} · ${wmo.label}` }),
    createEl('div', { className: 'mcp-row', text: `Warstwa: ${weatherLayerValue(point, appState.map.layer, appState.unitSystem)}` }),
    createEl('div', { className: 'mcp-row', text: `Wiatr ${windSpeed(point.wind, appState.unitSystem)} ${windUnit(appState.unitSystem)} · opady ${Number(point.precip ?? 0).toFixed(1)} mm` }),
    createEl('button', {
      className: 'mcp-action',
      type: 'button',
      text: 'Pokaż prognozę',
      on: { click: () => loadWeatherRef?.(point.lat, point.lon, point.name, point.countryName || '', { countryCode }) },
    }),
  );
  const left = Math.max(8, Math.min((Number(x) || 0) + 14, container.clientWidth - 252));
  const top = Math.max(8, Math.min((Number(y) || 0) - 18, container.clientHeight - 154));
  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
  popup.classList.add('show');
}

function updateDeckLayers() {
  if (!deckOverlay) return;
  const theme = styleTheme();
  const labels = buildDeclutteredLabels();
  deckOverlay.setProps({
    layers: buildWeatherDeckLayers({
      points: mapPoints,
      labels,
      layer: appState.map.layer,
      unitSystem: appState.unitSystem,
      theme,
      zoom: appState.map.zoom,
      onClick: (info) => {
        if (!info.object) return false;
        lastDeckClickAt = Date.now();
        showPopup(info.object, info.x, info.y);
        updateDeckLayers();
        return true;
      },
      onHover: (info) => {
        if (map?.getCanvas?.()) map.getCanvas().style.cursor = info.object ? 'pointer' : '';
      },
    }),
  });
}

function setFallback(visible, text = 'Warstwa mapy chwilowo niedostępna. Punkty pogodowe pozostają aktywne.') {
  const fallback = byId('mapFallback');
  if (!fallback) return;
  fallback.textContent = text;
  fallback.hidden = !visible;
}

function applyThemeStyleIfNeeded() {
  if (!map) return;
  const theme = styleTheme();
  if (theme === lastTheme) return;
  lastTheme = theme;
  map.setStyle(mapStyleUrl(theme));
  map.once('styledata', () => {
    tuneBaseMapStyle(map, theme);
    if (appState.map.layer === 'radar') updateRadarLayer().catch(() => {});
    updateDeckLayers();
  });
}

export function drawMap() {
  if (!map) return;
  applyThemeStyleIfNeeded();
  if (Number.isFinite(Number(appState.map.centerLat)) && Number.isFinite(Number(appState.map.centerLon))) {
    const center = map.getCenter();
    const moved = Math.abs(center.lat - appState.map.centerLat) > 0.01 || Math.abs(lonDelta(center.lng, appState.map.centerLon)) > 0.01;
    if (moved) {
      map.easeTo({
        center: [appState.map.centerLon, appState.map.centerLat],
        zoom: clamp(appState.map.zoom, MAP_LIMITS.minZoom, MAP_LIMITS.maxZoom),
        duration: 220,
      });
    }
  }
  updateChrome();
  updateRadarLayer().catch(() => {});
  requestAnimationFrame(updateDeckLayers);
}

export async function fetchMapPoints({ force = false } = {}) {
  if (!map) return;
  syncStateFromMap();
  const width = mapWidth();
  const viewport = viewportFromMap();
  await ensureCityCatalogForViewport({
    viewport,
    zoom: appState.map.zoom,
    width,
  });
  const { cities, scope } = selectMapCities({
    viewport,
    zoom: appState.map.zoom,
    width,
    currentLocation: currentLocation(),
  });
  if (!force && scope === loadedMapScope && mapPoints.length) {
    updateDeckLayers();
    return;
  }
  if (!force && scope === pendingMapScope && mapPoints.length) {
    updateDeckLayers();
    return;
  }
  renderPendingMapPoints(cities, scope, { force });
  pendingMapScope = scope;
  const requestId = ++mapRequestSeq;
  const requestScope = scope;
  try {
    const result = await fetchMapWeather(cities, scope);
    if (requestId !== mapRequestSeq || requestScope !== lastMapScope) return;
    const meta = new Map(cities.map((city) => [mapPointId(city), city]));
    const nextPoints = result.points.map((point) => {
      const source = meta.get(mapPointId(point)) || {};
      return { ...source, ...point, hasWeather: true };
    });
    if (nextPoints.length) {
      mapPoints = nextPoints;
      loadedMapScope = requestScope;
      setFallback(false);
    } else {
      loadedMapScope = '';
      setFallback(true, 'Nie udało się pobrać danych pogodowych dla widocznego obszaru mapy. Pokazuję miasta bez danych pogodowych.');
    }
    logEvent('info', 'map_points_loaded', {
      points: mapPoints.length,
      catalog: cityCatalogStatus(),
      zoom: Number(appState.map.zoom).toFixed(2),
      layer: appState.map.layer,
    });
    updateDeckLayers();
  } catch {
    if (requestId !== mapRequestSeq || requestScope !== lastMapScope) return;
    loadedMapScope = '';
    setFallback(true, 'Mapa pogodowa działa bez świeżej warstwy pogodowej. Pokazuję miasta bez danych pogodowych.');
    updateDeckLayers();
  } finally {
    if (pendingMapScope === requestScope) pendingMapScope = '';
  }
}

function queueMapDataRefresh(delay = 420) {
  window.clearTimeout(refreshTimer);
  refreshTimer = window.setTimeout(() => {
    fetchMapPoints().catch(() => updateDeckLayers());
  }, delay);
}

function bindLayerButtons() {
  $$('#mapLayerBtns .map-layer-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.layer === appState.map.layer);
    btn.addEventListener('click', () => {
      appState.map.layer = btn.dataset.layer || 'temp';
      $$('#mapLayerBtns .map-layer-btn').forEach((item) => item.classList.toggle('active', item === btn));
      hidePopup();
      saveMapView();
      updateChrome();
      updateRadarLayer({ force: btn.dataset.layer === 'radar' }).catch(() => {});
      updateDeckLayers();
    });
  });
}

function bindMapEvents() {
  byId('mapZoomIn')?.addEventListener('click', () => map?.zoomIn({ duration: 180 }));
  byId('mapZoomOut')?.addEventListener('click', () => map?.zoomOut({ duration: 180 }));
  map.on('load', () => {
    tuneBaseMapStyle(map, styleTheme());
    updateChrome();
    queueMapAreaRefresh(0);
    updateRadarLayer({ force: appState.map.layer === 'radar' }).catch(() => {});
    updateDeckLayers();
    fetchMapPoints({ force: true });
  });
  map.on('styledata', () => {
    tuneBaseMapStyle(map, styleTheme());
    if (appState.map.layer === 'radar') applyRadarLayer();
  });
  map.on('movestart', hidePopup);
  map.on('moveend', () => {
    syncStateFromMap();
    saveMapView();
    updateChrome();
    queueMapAreaRefresh(260);
    queueMapDataRefresh(180);
  });
  map.on('zoomend', () => {
    syncStateFromMap();
    updateChrome();
    queueMapAreaRefresh(300);
    queueMapDataRefresh(120);
  });
  map.on('click', () => {
    window.setTimeout(() => {
      if (Date.now() - lastDeckClickAt > 80) hidePopup();
    }, 0);
  });
  map.on('error', (event) => {
    logEvent('error', 'maplibre_error', { error: event?.error || event });
    setFallback(true, 'Bazowa mapa nie odpowiedziała. Warstwa pogodowa pozostaje bezpiecznie odseparowana.');
  });
  window.addEventListener('resize', () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      map?.resize();
      syncStateFromMap();
      updateChrome();
      queueMapAreaRefresh(260);
      updateDeckLayers();
      queueMapDataRefresh(100);
      if (appState.weather) renderChart(appState.weather);
    }, 180);
  });
}

export function setupMap({ loadWeather } = {}) {
  loadWeatherRef = loadWeather;
  restoreMapView();
  const container = byId('mapCanvas');
  if (!container || map) return;
  bindLayerButtons();
  lastTheme = styleTheme();
  try {
    map = new maplibregl.Map({
      container,
      style: mapStyleUrl(lastTheme),
      center: [appState.map.centerLon, appState.map.centerLat],
      zoom: clamp(appState.map.zoom, MAP_LIMITS.minZoom, MAP_LIMITS.maxZoom),
      minZoom: MAP_LIMITS.minZoom,
      maxZoom: MAP_LIMITS.maxZoom,
      attributionControl: false,
      pitchWithRotate: false,
      dragRotate: false,
      touchPitch: false,
      cooperativeGestures: false,
    });
    map.keyboard.enable();
    deckOverlay = new MapboxOverlay({ interleaved: true, layers: [] });
    map.addControl(deckOverlay);
    bindMapEvents();
    updateChrome();
  } catch {
    logEvent('error', 'map_webgl_unavailable');
    setFallback(true, 'WebGL2 jest niedostępny w tej przeglądarce. Mapa nie może zostać uruchomiona.');
  }
}
