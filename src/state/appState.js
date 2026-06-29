import { STORAGE_KEYS } from '../config/constants.js';
import { readJson, readString } from '../services/storageService.js';
import { DEFAULT_SECTION_VISIBILITY } from '../config/constants.js';

const initialUnit = readString(STORAGE_KEYS.unitSystem, 'si');
const initialTheme = readString(STORAGE_KEYS.theme, 'dark');
const initialMode = readString(STORAGE_KEYS.appMode, 'weather');
const initialCurrency = readString(STORAGE_KEYS.preferredCurrency, '');
const initialSections = { ...DEFAULT_SECTION_VISIBILITY, ...readJson(STORAGE_KEYS.sectionVisibility, {}) };

export const appState = {
  location: {
    lat: null,
    lon: null,
    city: '',
    country: '',
    countryCode: '',
    timezone: 'Europe/Warsaw',
  },
  weather: null,
  aqi: null,
  history: null,
  marine: null,
  locationContext: null,
  cacheMeta: null,
  network: {
    online: typeof navigator === 'undefined' ? true : navigator.onLine,
    source: 'idle',
    lastUpdatedAt: null,
  },
  sectionVisibility: initialSections,
  compare: {
    locations: readJson(STORAGE_KEYS.compareLocations, []),
    rows: [],
    loading: false,
  },
  unitSystem: initialUnit === 'imperial' ? 'imperial' : 'si',
  preferredCurrency: /^[A-Z]{3}$/u.test(initialCurrency) ? initialCurrency : '',
  appMode: initialMode === 'tourism' ? 'tourism' : 'weather',
  tourism: {
    loading: false,
    data: null,
    error: '',
  },
  isDark: initialTheme !== 'light',
  chart: {
    mode: 'temp',
    range: '24h',
    lastData: null,
  },
  search: {
    timeoutId: null,
    overlayTapMoved: false,
  },
  map: {
    layer: 'temp',
    zoom: 4,
    tileZ: 4,
    centerLat: 52.23,
    centerLon: 19.01,
    points: [],
    pointsByZoom: {},
    dragging: false,
    lastX: 0,
    lastY: 0,
    pinchDist: null,
    pinchZoom: 4,
    pinchCenter: null,
    resizeTimer: null,
    renderQueued: false,
    hoverTimer: null,
    lastWeatherFetchAt: 0,
  },
};

export function setLocation({ lat, lon, city = '', country = '', countryCode = appState.location.countryCode, timezone = appState.location.timezone }) {
  appState.location = {
    lat: Number(lat),
    lon: Number(lon),
    city: String(city || ''),
    country: String(country || ''),
    countryCode: String(countryCode || '').toUpperCase(),
    timezone: timezone || appState.location.timezone || 'Europe/Warsaw',
  };
}

export function setWeather(data) {
  appState.weather = data || null;
  if (data?.timezone) appState.location.timezone = data.timezone;
}

export function setNetworkStatus(partial) {
  appState.network = { ...appState.network, ...partial };
}

export function setCacheMeta(meta) {
  appState.cacheMeta = meta || null;
}

export function setAqi(data) {
  appState.aqi = data || null;
}

export function setHistory(data) {
  appState.history = data || null;
}

export function setMarine(data) {
  appState.marine = data || null;
}

export function setLocationContext(context) {
  appState.locationContext = context || null;
}

export function setAppMode(mode) {
  appState.appMode = mode === 'tourism' ? 'tourism' : 'weather';
}

export function setTourism(partial) {
  appState.tourism = { ...appState.tourism, ...partial };
}
