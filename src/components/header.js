import { appState } from '../state/appState.js';
import { byId, setText } from '../utils/domUtils.js';
import { getHomeLocation, isFavorite, isHomeLocation } from '../services/locationService.js';
import { flagAlt, flagEmoji, flagUrl, normalizeCountryCode } from '../utils/countryUtils.js';

let clockInterval = null;

export function updateBackground(code, isDay) {
  const body = document.body;
  body.classList.remove('bg-sunny', 'bg-cloud', 'bg-rain', 'bg-storm', 'bg-snow', 'bg-night');
  if (!isDay) body.classList.add('bg-night');
  else if (Number(code) === 0 || Number(code) === 1) body.classList.add('bg-sunny');
  else if (Number(code) <= 48) body.classList.add('bg-cloud');
  else if (Number(code) >= 51 && Number(code) <= 67) body.classList.add('bg-rain');
  else if (Number(code) >= 71 && Number(code) <= 77) body.classList.add('bg-snow');
  else if (Number(code) >= 80 && Number(code) <= 82) body.classList.add('bg-rain');
  else if (Number(code) >= 85 && Number(code) <= 86) body.classList.add('bg-snow');
  else if (Number(code) >= 95) body.classList.add('bg-storm');
  else body.classList.add('bg-cloud');
}

export function updateFavBtn() {
  const btn = byId('favToggleBtn');
  const { lat, lon } = appState.location;
  if (!btn) return;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    btn.style.display = 'none';
    return;
  }
  const active = isFavorite(lat, lon);
  btn.style.display = '';
  btn.textContent = active ? '★' : '☆';
  btn.style.color = active ? '#f0a500' : 'var(--muted)';
  btn.setAttribute('aria-label', active ? 'Usuń z ulubionych' : 'Dodaj do ulubionych');
}

export function updateHomeBadge() {
  const badge = byId('homeBadge');
  const { lat, lon } = appState.location;
  if (!badge) return;
  badge.style.display = Number.isFinite(lat) && Number.isFinite(lon) && isHomeLocation(lat, lon) ? '' : 'none';
}

export function updateHomeBtn() {
  const btn = byId('homeBtn');
  if (!btn) return;
  btn.style.display = getHomeLocation() ? '' : 'none';
}

export function updateHeader() {
  const flag = byId('cityFlag');
  const flagFallback = byId('cityFlagEmoji');
  const countryCode = normalizeCountryCode(appState.location.countryCode);
  if (flagFallback) {
    flagFallback.textContent = flagEmoji(countryCode);
    flagFallback.style.display = 'none';
  }
  if (flag) {
    if (countryCode) {
      flag.src = flagUrl(countryCode, 40);
      flag.alt = flagAlt(countryCode);
      flag.style.display = '';
      flag.onload = () => {
        flag.style.display = '';
        if (flagFallback) flagFallback.style.display = 'none';
      };
      flag.onerror = () => {
        flag.style.display = 'none';
        if (flagFallback) flagFallback.style.display = countryCode ? '' : 'none';
      };
    } else {
      flag.removeAttribute('src');
      flag.alt = '';
      flag.style.display = 'none';
    }
  }
  setText('cityName', appState.location.city || '—');
  setText('cityCountry', appState.location.country || '');
  updateFavBtn();
  updateHomeBadge();
  updateHomeBtn();

  if (clockInterval) window.clearInterval(clockInterval);
  const tick = () => {
    try {
      setText('localTime', new Date().toLocaleTimeString('pl-PL', {
        timeZone: appState.location.timezone || undefined,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }));
    } catch {
      setText('localTime', new Date().toLocaleTimeString('pl-PL'));
    }
  };
  tick();
  clockInterval = window.setInterval(tick, 1000);
}
