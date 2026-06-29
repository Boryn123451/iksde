import './styles/index.css';

import { fetchAirQuality } from './api/airQualityApi.js';
import { fetchHistory } from './api/archiveApi.js';
import { fetchMarine } from './api/marineApi.js';
import { reverseGeocode } from './api/reverseGeocodingApi.js';
import { fetchForecast } from './api/weatherApi.js';
import { renderAQI } from './components/aqiCard.js';
import { renderAlertCards } from './components/alertCard.js';
import { renderAstronomy } from './components/astronomySection.js';
import { setupChartControls, renderChart } from './components/chart.js';
import { renderClothingCard } from './components/clothingCard.js';
import { bindComparisonPanel, renderComparisonPanel } from './components/comparisonPanel.js';

import { renderDaily } from './components/dailyForecast.js';
import { renderDetails } from './components/detailsGrid.js';
import { openExtremesModal, closeExtremesModal } from './components/extremesView.js';
import { updateBackground, updateFavBtn, updateHeader, updateHomeBtn } from './components/header.js';
import { renderHero } from './components/heroWeather.js';
import { renderHourly } from './components/hourlyStrip.js';
import { renderHistory as renderHistoryCard } from './components/historyCard.js';
import { renderInsights } from './components/insightsSection.js';
import { renderNextHoursCard } from './components/nextHoursCard.js';
import { hideLoadingState, showLoadingState } from './components/loading.js';
import { drawMap, fetchMapPoints, setupMap } from './components/mapCanvas.js';
import { renderMarine } from './components/marineSection.js';
import { closeDayModal, closeHourModal, openDayModal, openHourModal } from './components/modals.js';
import { bindSearchOverlay, closeOverlay, openOverlay, renderRecent } from './components/searchOverlay.js';
import { renderSport } from './components/sportSection.js';
import { renderStatusBar } from './components/statusBar.js';
import { closeSettingsPanel, openSettingsPanel } from './components/settingsPanel.js';
import { showToast } from './components/toast.js';

import { exportForecastCsv, exportForecastJson } from './services/exportService.js';
import { requestBrowserLocation } from './services/geolocationService.js';
import { initRuntimeLogger, logEvent } from './services/loggerService.js';
import { getHomeLocation, getLastLocation, saveLastLocation, saveToRecent, setHomeLocation, toggleFavoriteLocation } from './services/locationService.js';
import { applyTheme, toggleTheme } from './services/themeService.js';
import { applyUnitButtons, setUnitSystem } from './services/unitService.js';
import { readWeatherCache, saveWeatherCache } from './services/cacheService.js';
import { registerServiceWorker } from './services/pwaService.js';
import { applySectionVisibility, loadSectionVisibility } from './services/settingsService.js';
import { readUrlLocation, shareCurrentForecast } from './services/shareService.js';
import { writeString } from './services/storageService.js';
import { preferredCurrency, setPreferredCurrency } from './services/currencyService.js';
import { appState, setAqi, setCacheMeta, setHistory, setLocation, setMarine, setNetworkStatus, setWeather } from './state/appState.js';
import { byId, hide, show } from './utils/domUtils.js';
import { STORAGE_KEYS } from './config/constants.js';



function currentLocationPayload() {
  return {
    lat: appState.location.lat,
    lon: appState.location.lon,
    city: appState.location.city,
    name: appState.location.city,
    country: appState.location.country,
    countryCode: appState.location.countryCode,
  };
}

function validateForecast(data) {
  return Boolean(data?.current && data?.hourly?.time?.length && data?.daily?.time?.length);
}

function isPlaceholderLocationName(value) {
  const text = String(value || '').trim().toLowerCase()
    .normalize('NFD')
    .replace(/\p{Mark}/gu, '');
  return !text
    || text === 'udostepniona lokalizacja'
    || text === 'moja lokalizacja'
    || text === 'shared location';
}

async function ensureLocationLabel(lat, lon) {
  const current = appState.location;
  const hasCountryName = current.country && current.country.length > 2;
  const hasRealCity = !isPlaceholderLocationName(current.city);
  if (current.countryCode && hasCountryName && hasRealCity) return;
  try {
    const label = await reverseGeocode(lat, lon);
    setLocation({
      lat,
      lon,
      city: hasRealCity ? current.city : label.city,
      country: hasCountryName ? current.country : label.country,
      countryCode: current.countryCode || label.countryCode,
      timezone: current.timezone,
    });
    updateHeader();
  } catch {
    // Reverse geocoding is optional; weather and map must keep working without it.
  }
}

function renderAll(data) {
  if (!validateForecast(data)) {
    showToast('API zwróciło niepełne dane pogodowe', 'error');
    return;
  }
  setWeather(data);
  updateBackground(data.current.weather_code, data.current.is_day);
  renderHero(data.current);
  renderHourly(data.hourly, { onSelectHour: openHourModal });
  renderDaily(data.daily, { onSelectDay: openDayModal });
  renderDetails(data.current, data.daily);
  renderAlertCards(data.current, data.daily, appState.aqi);

  renderClothingCard(data.current, data.daily);
  renderNextHoursCard(data);
  renderInsights(data.current, data.daily);
  renderChart(data);
  renderSport(data.current, data.daily);
  renderAstronomy(data.daily);
  updateHeader();
  renderStatusBar();
  applySectionVisibility();
  hide('starterScreen');
  show('weatherContent', 'flex');

  if (Number.isFinite(appState.location.lat) && Number.isFinite(appState.location.lon)) {
    appState.map.centerLat = appState.location.lat;
    appState.map.centerLon = appState.location.lon;
    drawMap();
  }
  applyAppMode();
}

async function fetchFresh(lat, lon) {
  const data = await fetchForecast(lat, lon);
  if (!validateForecast(data)) throw new Error('Niepełne dane prognozy');
  setWeather(data);
  saveWeatherCache(lat, lon, data, appState.location.city, appState.location.country, appState.location.countryCode);
  setCacheMeta({ ts: Date.now(), source: 'fresh' });
  setNetworkStatus({ source: 'fresh', lastUpdatedAt: Date.now(), online: navigator.onLine });
  renderAll(data);
  logEvent('info', 'weather_fresh_loaded', {
    lat: Number(lat).toFixed(4),
    lon: Number(lon).toFixed(4),
    city: appState.location.city,
    countryCode: appState.location.countryCode,
  });
  return data;
}

async function loadSupplementaryData(lat, lon) {
  const timezone = appState.location.timezone;
  const results = await Promise.allSettled([
    fetchAirQuality(lat, lon),
    fetchHistory(lat, lon, timezone),
    fetchMarine(lat, lon),
  ]);

  if (results[0].status === 'fulfilled') {
    setAqi(results[0].value);
    renderAQI(results[0].value);
    if (appState.weather) {
      renderAlertCards(appState.weather.current, appState.weather.daily, results[0].value);

    }
  } else {
    showToast('Jakość powietrza chwilowo niedostępna', 'info', 2500);
  }
  if (results[1].status === 'fulfilled') {
    setHistory(results[1].value);
    renderHistoryCard(results[1].value);
  }
  if (results[2].status === 'fulfilled') {
    setMarine(results[2].value);
    renderMarine(results[2].value);
  }
}

export async function loadWeather(lat, lon, cityName = '', countryName = '', meta = {}) {
  const safeLat = Number(lat);
  const safeLon = Number(lon);
  logEvent('info', 'weather_load_start', {
    lat: Number.isFinite(safeLat) ? safeLat.toFixed(4) : String(lat),
    lon: Number.isFinite(safeLon) ? safeLon.toFixed(4) : String(lon),
    city: cityName,
    country: countryName,
    countryCode: meta.countryCode || '',
  });
  if (!Number.isFinite(safeLat) || !Number.isFinite(safeLon)) {
    showToast('Nieprawidłowe współrzędne lokalizacji', 'error');
    return;
  }
  setLocation({ lat: safeLat, lon: safeLon, city: cityName, country: countryName, countryCode: meta.countryCode || '' });
  const labelPromise = ensureLocationLabel(safeLat, safeLon);
  showLoadingState();
  const cached = readWeatherCache(safeLat, safeLon, { allowStale: true });

  if (cached) {
    logEvent('info', 'weather_cache_hit', {
      lat: safeLat.toFixed(4),
      lon: safeLon.toFixed(4),
      ageMs: cached.age,
      stale: cached.stale,
    });
    if (cached.city || cached.country) {
      setLocation({ lat: safeLat, lon: safeLon, city: cached.city || cityName, country: cached.country || countryName, countryCode: meta.countryCode || cached.countryCode || appState.location.countryCode, timezone: cached.data?.timezone });
    }
    setCacheMeta({ ts: cached.ts, source: 'cache', age: cached.age });
    setNetworkStatus({ source: 'cache', lastUpdatedAt: cached.ts, online: navigator.onLine });
    renderAll(cached.data);
    hideLoadingState();
    if (!navigator.onLine) {
      showToast('Offline: pokazuję ostatnią prognozę z cache', 'info', 3500);
    } else {
      if (cached.stale) showToast('Pokazuję cache i odświeżam dane w tle', 'info', 2500);
      fetchFresh(safeLat, safeLon)
        .then(() => loadSupplementaryData(safeLat, safeLon))
        .catch((error) => {
          logEvent('error', 'weather_background_refresh_failed', { error });
          showToast('Nie udało się odświeżyć danych, pozostaje cache', 'error', 3500);
        });
    }
  } else {
    if (!navigator.onLine) {
      hideLoadingState();
      setNetworkStatus({ source: 'offline-empty', online: false });
      renderStatusBar();
      logEvent('warn', 'weather_offline_no_cache', { lat: safeLat.toFixed(4), lon: safeLon.toFixed(4) });
      showToast('Offline i brak danych cache dla tej lokalizacji', 'error', 6000);
      show('starterScreen');
      return;
    }
    try {
      await fetchFresh(safeLat, safeLon);
      hideLoadingState();
      loadSupplementaryData(safeLat, safeLon);
    } catch (error) {
      hideLoadingState();
      logEvent('error', 'weather_fetch_failed', { lat: safeLat.toFixed(4), lon: safeLon.toFixed(4), error });
      showToast('Błąd pobierania danych pogodowych', 'error', 5000);
      return;
    }
  }

  await labelPromise;
  saveLastLocation(currentLocationPayload());
  saveToRecent(currentLocationPayload());
  renderRecent({ loadWeather });
  renderComparisonPanel();
  fetchMapPoints();

}

async function requestGeolocation(setAsHome = false) {
  try {
    showToast('Pobieranie lokalizacji…', 'info', 8000);
    const coords = await requestBrowserLocation();
    let label = { city: coords.city, country: coords.country };
    try {
      label = await reverseGeocode(coords.lat, coords.lon);
    } catch {
      // Reverse geocoding is auxiliary; coordinates are enough to load weather.
    }
    if (setAsHome) {
      setHomeLocation({ lat: coords.lat, lon: coords.lon, city: label.city, name: label.city, country: label.country, countryCode: label.countryCode });
      showToast(`Ustawiono „${label.city}” jako miasto domowe`, 'success');
    }
    loadWeather(coords.lat, coords.lon, label.city, label.country, { countryCode: label.countryCode });
  } catch (error) {
    showToast(error.message || 'Błąd geolokalizacji', 'error', 6000);
  }
}

function toggleFavorite() {
  if (!Number.isFinite(appState.location.lat) || !Number.isFinite(appState.location.lon)) return;
  const added = toggleFavoriteLocation(currentLocationPayload());
  showToast(added ? `Dodano „${appState.location.city}” do ulubionych` : `Usunięto „${appState.location.city}” z ulubionych`, added ? 'success' : 'info');
  updateFavBtn();
  renderRecent({ loadWeather });
}

function rerenderCurrentWeather() {
  if (!appState.weather) return;
  renderAll(appState.weather);
  if (appState.aqi) renderAQI(appState.aqi);
  if (appState.history) renderHistoryCard(appState.history);
  if (appState.marine) renderMarine(appState.marine);
  renderComparisonPanel();
}



function refreshCurrentWeather() {
  const { lat, lon, city, country } = appState.location;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    showToast('Brak lokalizacji do odświeżenia', 'error');
    return;
  }
  if (!navigator.onLine) {
    showToast('Nie można odświeżyć danych offline', 'error');
    return;
  }
  loadWeather(lat, lon, city, country, { countryCode: appState.location.countryCode });
}

function bindGlobalEvents() {
  setupChartControls();
  byId('extremesTile')?.addEventListener('click', () => openExtremesModal(loadWeather));
  byId('exModalClose')?.addEventListener('click', closeExtremesModal);
  byId('extremesModalOverlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'extremesModalOverlay') closeExtremesModal();
  });
  bindSearchOverlay({ loadWeather, requestGeolocation });
  setupMap({ loadWeather });
  bindComparisonPanel({ loadWeather });
  byId('geoBtn')?.addEventListener('click', () => requestGeolocation(false));
  byId('darkToggle')?.addEventListener('click', () => {
    toggleTheme();
    renderChart(appState.weather);
    drawMap();
  });
  byId('unitSI')?.addEventListener('click', () => {
    setUnitSystem('si');
    rerenderCurrentWeather();
  });
  byId('unitIMP')?.addEventListener('click', () => {
    setUnitSystem('imperial');
    rerenderCurrentWeather();
  });
  byId('favToggleBtn')?.addEventListener('click', toggleFavorite);
  byId('refreshBtn')?.addEventListener('click', refreshCurrentWeather);
  byId('shareBtn')?.addEventListener('click', async () => {
    try {
      const result = await shareCurrentForecast();
      showToast(result === 'shared' ? 'Udostępniono prognozę' : 'Skopiowano link do schowka', 'success');
    } catch {
      showToast('Nie udało się udostępnić linku', 'error');
    }
  });
  byId('settingsBtn')?.addEventListener('click', openSettingsPanel);
  byId('settingsClose')?.addEventListener('click', closeSettingsPanel);
  byId('homeBtn')?.addEventListener('click', () => {
    const home = getHomeLocation();
    if (home) loadWeather(home.lat, home.lon, home.city || home.name, home.country, { countryCode: home.countryCode || '' });
  });
  byId('starterSearch')?.addEventListener('click', () => openOverlay({ loadWeather }));
  byId('starterGeo')?.addEventListener('click', () => requestGeolocation(true));
  document.querySelectorAll('.popular-btn').forEach((btn) => {
    btn.addEventListener('click', () => loadWeather(btn.dataset.lat, btn.dataset.lon, btn.dataset.city, btn.dataset.country || '', { countryCode: btn.dataset.countryCode || '' }));
  });
  byId('hourModalClose')?.addEventListener('click', closeHourModal);
  byId('hourModalOverlay')?.addEventListener('click', (event) => {
    if (event.target === event.currentTarget) closeHourModal();
  });
  byId('dayModalClose')?.addEventListener('click', closeDayModal);
  byId('dayModalOverlay')?.addEventListener('click', (event) => {
    if (event.target === event.currentTarget) closeDayModal();
  });
  byId('exportJsonBtn')?.addEventListener('click', () => {
    if (!exportForecastJson()) showToast('Brak prognozy do eksportu', 'error');
  });
  byId('exportCsvBtn')?.addEventListener('click', () => {
    if (!exportForecastCsv()) showToast('Brak danych godzinowych do eksportu', 'error');
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeOverlay();
      closeDayModal();
      closeHourModal();
      closeSettingsPanel();
    }
  });
  window.addEventListener('online', () => {
    setNetworkStatus({ online: true });
    renderStatusBar();
    logEvent('info', 'network_online');
    showToast('Połączenie wróciło', 'success', 2200);
  });
  window.addEventListener('offline', () => {
    setNetworkStatus({ online: false, source: appState.weather ? 'cache' : 'offline-empty' });
    renderStatusBar();
    logEvent('warn', 'network_offline', { hasWeather: Boolean(appState.weather) });
    showToast('Tryb offline', 'info', 3000);
  });
}

function setupAccessibilityAttributes() {
  byId('searchInput')?.setAttribute('aria-label', 'Otwórz wyszukiwarkę miasta');
  byId('searchBtn')?.setAttribute('aria-label', 'Szukaj miasta');
  byId('geoBtn')?.setAttribute('aria-label', 'Użyj mojej lokalizacji');
  byId('homeBtn')?.setAttribute('aria-label', 'Przejdź do miasta domowego');
  byId('overlayClose')?.setAttribute('aria-label', 'Zamknij wyszukiwarkę');
  byId('hourModalClose')?.setAttribute('aria-label', 'Zamknij szczegóły godziny');
  byId('dayModalClose')?.setAttribute('aria-label', 'Zamknij szczegóły dnia');
  byId('searchOverlay')?.setAttribute('aria-hidden', 'true');
  byId('hourModalOverlay')?.setAttribute('aria-hidden', 'true');
  byId('dayModalOverlay')?.setAttribute('aria-hidden', 'true');
}

document.addEventListener('DOMContentLoaded', () => {
  initRuntimeLogger();
  logEvent('info', 'app_dom_ready', {
    mode: appState.appMode,
    unitSystem: appState.unitSystem,
    url: window.location.href,
  });
  registerServiceWorker();
  setPreferredCurrency(preferredCurrency());
  loadSectionVisibility();
  const urlLocation = readUrlLocation();
  if (urlLocation?.units) setUnitSystem(urlLocation.units);
  if (urlLocation?.theme) {
    applyTheme(urlLocation.theme === 'dark');
    writeString(STORAGE_KEYS.theme, urlLocation.theme);
  }
  else applyTheme(appState.isDark);
  if (urlLocation?.mode) {
    setAppMode(urlLocation.mode);
    writeString(STORAGE_KEYS.appMode, appState.appMode);
  }
  applyUnitButtons();
  setupAccessibilityAttributes();
  bindGlobalEvents();
  updateHomeBtn();
  applyAppMode();

  const home = getHomeLocation();
  const last = getLastLocation();
  if (urlLocation) {
    loadWeather(urlLocation.lat, urlLocation.lon, urlLocation.city, urlLocation.country, { countryCode: urlLocation.countryCode || '' });
  } else if (home) {
    loadWeather(home.lat, home.lon, home.city || home.name, home.country, { countryCode: home.countryCode || '' });
  } else if (last) {
    loadWeather(last.lat, last.lon, last.city || last.name, last.country, { countryCode: last.countryCode || '' });
  } else {
    show('starterScreen');
  }
});
