import { appState } from '../state/appState.js';

export function buildShareUrl() {
  const url = new URL(window.location.href);
  url.search = '';
  const { lat, lon, city, countryCode } = appState.location;
  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    url.searchParams.set('lat', lat.toFixed(4));
    url.searchParams.set('lon', lon.toFixed(4));
  }
  if (city) url.searchParams.set('city', city);
  if (countryCode) url.searchParams.set('countryCode', countryCode);
  url.searchParams.set('units', appState.unitSystem);
  url.searchParams.set('theme', appState.isDark ? 'dark' : 'light');
  url.searchParams.set('mode', appState.appMode);
  return url.toString();
}

export function readUrlLocation() {
  const params = new URLSearchParams(window.location.search);
  const lat = Number(params.get('lat'));
  const lon = Number(params.get('lon'));
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const units = params.get('units');
  const theme = params.get('theme');
  const mode = params.get('mode');
  return {
    lat,
    lon,
    city: params.get('city') || 'Udostępniona lokalizacja',
    country: params.get('country') || '',
    countryCode: params.get('countryCode') || '',
    units: units === 'imperial' ? 'imperial' : units === 'si' ? 'si' : null,
    theme: theme === 'light' || theme === 'dark' ? theme : null,
    mode: mode === 'tourism' || mode === 'weather' ? mode : null,
  };
}

export async function shareCurrentForecast() {
  const url = buildShareUrl();
  const title = `Pogoda: ${appState.location.city || 'lokalizacja'}`;
  if (navigator.share) {
    await navigator.share({ title, text: 'Prognoza w Deep Weather', url });
    return 'shared';
  }
  await navigator.clipboard.writeText(url);
  return 'copied';
}
