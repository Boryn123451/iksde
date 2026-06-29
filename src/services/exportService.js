import { appState } from '../state/appState.js';
import { downloadBlob } from '../utils/domUtils.js';
import { sanitizeFileName } from '../utils/sanitizeUtils.js';

function csvCell(value) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function exportForecastJson() {
  if (!appState.weather) return false;
  const payload = {
    exportedAt: new Date().toISOString(),
    location: appState.location,
    weather: appState.weather,
    aqi: appState.aqi,
    history: appState.history,
    marine: appState.marine,
  };
  const name = sanitizeFileName(appState.location.city || 'prognoza');
  downloadBlob(`${name}-pogoda.json`, new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' }));
  return true;
}

export function exportForecastCsv() {
  const hourly = appState.weather?.hourly;
  if (!hourly?.time?.length) return false;
  const rows = [['czas', 'temperatura_C', 'opady_%', 'wiatr_kmh', 'wilgotnosc_%', 'kod_pogody']];
  hourly.time.forEach((time, i) => {
    rows.push([
      time,
      hourly.temperature_2m?.[i],
      hourly.precipitation_probability?.[i],
      hourly.wind_speed_10m?.[i],
      hourly.relative_humidity_2m?.[i],
      hourly.weather_code?.[i],
    ]);
  });
  const csv = rows.map((row) => row.map(csvCell).join(';')).join('\n');
  const name = sanitizeFileName(appState.location.city || 'prognoza');
  downloadBlob(`${name}-prognoza-godzinowa.csv`, new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  return true;
}
