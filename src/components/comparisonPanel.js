import { addCompareLocation, fetchComparisonRows, getCompareLocations, removeCompareLocation } from '../features/compare/cityComparison.js';
import { appState } from '../state/appState.js';
import { byId, button, clear, createEl } from '../utils/domUtils.js';
import { getWmoIcon } from '../utils/weatherCodeUtils.js';
import { temperature, temperatureUnit, windSpeed, windUnit } from '../utils/unitUtils.js';

let loadWeatherRef = null;

export function addCurrentToComparison() {
  if (!Number.isFinite(appState.location.lat) || !Number.isFinite(appState.location.lon)) return;
  addCompareLocation({
    lat: appState.location.lat,
    lon: appState.location.lon,
    city: appState.location.city,
    name: appState.location.city,
    country: appState.location.country,
  });
  renderComparisonPanel();
}

export function addLocationToComparison(location) {
  addCompareLocation(location);
  renderComparisonPanel();
}

export async function renderComparisonPanel() {
  const root = byId('comparisonGrid');
  if (!root) return;
  clear(root);
  const locations = getCompareLocations();
  if (!locations.length) {
    root.append(createEl('div', { className: 'comparison-empty', text: 'Dodaj aktualne miasto albo lokalizację z wyszukiwarki.' }));
    return;
  }
  root.append(createEl('div', { className: 'comparison-loading', text: 'Pobieranie porównania…' }));
  try {
    const rows = await fetchComparisonRows(locations);
    clear(root);
    rows.forEach((row, index) => {
      const city = row.city || row.name;
      root.append(createEl('div', { className: 'comparison-card' }, [
        createEl('button', {
          className: 'comparison-remove',
          type: 'button',
          text: '×',
          ariaLabel: `Usuń ${city}`,
          on: { click: () => { removeCompareLocation(index); renderComparisonPanel(); } },
        }),
        createEl('div', { className: 'comparison-city', text: city }),
        createEl('div', { className: 'comparison-icon', text: getWmoIcon(row.code, 1).icon }),
        createEl('div', { className: 'comparison-temp', text: `${temperature(row.temp, appState.unitSystem)}${temperatureUnit(appState.unitSystem)}` }),
        createEl('div', { className: 'comparison-meta', text: `Odcz. ${temperature(row.apparent, appState.unitSystem)}${temperatureUnit(appState.unitSystem)} · 💧 ${row.precipProb ?? row.precip ?? '—'}${row.precipProb != null ? '%' : ' mm'}` }),
        createEl('div', { className: 'comparison-meta', text: `💨 ${windSpeed(row.wind, appState.unitSystem)} ${windUnit(appState.unitSystem)}` }),
        createEl('div', { className: 'comparison-comfort', text: `Komfort ${row.comfort.score}/100`, style: { color: row.comfort.color } }),
        button({
          className: 'comparison-open',
          on: { click: () => loadWeatherRef?.(row.lat, row.lon, city, row.country || '') },
        }, 'Pokaż'),
      ]));
    });
  } catch {
    clear(root);
    root.append(createEl('div', { className: 'comparison-empty', text: 'Nie udało się pobrać porównania.' }));
  }
}

export function bindComparisonPanel({ loadWeather }) {
  loadWeatherRef = loadWeather;
  byId('compareCurrentBtn')?.addEventListener('click', addCurrentToComparison);
  renderComparisonPanel();
}
