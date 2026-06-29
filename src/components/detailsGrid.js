import { appState } from '../state/appState.js';
import { byId, setText, setWidthPercent } from '../utils/domUtils.js';
import { dayLengthLabel, fmtHour, localMinutesOfDay, timeToMinutes } from '../utils/dateUtils.js';
import { formatTemperatureDelta, getTempColor, precipitation, precipitationUnit, pressure, pressureUnit, temperature, temperatureUnit, windSpeed, windUnit } from '../utils/unitUtils.js';
import { uvLabel, windDegToDir } from '../utils/weatherCodeUtils.js';
import { clamp } from '../utils/sanitizeUtils.js';

function renderWindCompass(deg) {
  const safeDeg = clamp(deg, 0, 360);
  return `<svg viewBox="0 0 80 80" width="56" height="56" aria-hidden="true">
    <circle cx="40" cy="40" r="36" fill="none" stroke="var(--border)" stroke-width="1.5"/>
    <text x="40" y="12" text-anchor="middle" fill="var(--muted)" font-size="8" font-family="IBM Plex Mono">N</text>
    <text x="40" y="73" text-anchor="middle" fill="var(--muted)" font-size="8" font-family="IBM Plex Mono">S</text>
    <text x="10" y="44" text-anchor="middle" fill="var(--muted)" font-size="8" font-family="IBM Plex Mono">W</text>
    <text x="70" y="44" text-anchor="middle" fill="var(--muted)" font-size="8" font-family="IBM Plex Mono">E</text>
    <g transform="rotate(${safeDeg}, 40, 40)" style="transition: transform .8s ease;">
      <polygon points="40,12 44,40 40,36 36,40" fill="var(--accent)"/>
      <polygon points="40,68 44,40 40,44 36,40" fill="var(--border)"/>
    </g>
  </svg>`;
}

function renderSunArc(sunriseStr, sunsetStr) {
  if (!sunriseStr || !sunsetStr) return '';
  const sunrise = fmtHour(sunriseStr);
  const sunset = fmtHour(sunsetStr);
  const rise = timeToMinutes(sunrise);
  const set = timeToMinutes(sunset);
  if (rise === null || set === null || set <= rise) return '';
  const now = localMinutesOfDay(appState.location.timezone);
  const progress = clamp((now - rise) / (set - rise), 0, 1);
  const angle = Math.PI - progress * Math.PI;
  const cx = 60;
  const cy = 50;
  const r = 40;
  const sx = (cx + r * Math.cos(angle)).toFixed(1);
  const sy = (cy - r * Math.sin(angle)).toFixed(1);
  const opacity = progress > 0 && progress < 1 ? 1 : 0.3;
  return `<svg viewBox="0 0 120 60" width="100%" height="55" aria-hidden="true">
    <path d="M20,50 A40,40 0 0,1 100,50" fill="none" stroke="var(--border)" stroke-width="1.5" stroke-dasharray="4,3"/>
    <circle cx="${sx}" cy="${sy}" r="6" fill="#f0a500" opacity="${opacity}"/>
    <text x="20" y="58" font-size="8" fill="var(--muted)" font-family="IBM Plex Mono">${sunrise}</text>
    <text x="85" y="58" font-size="8" fill="var(--muted)" font-family="IBM Plex Mono">${sunset}</text>
  </svg>`;
}

export function renderDetails(current, daily) {
  if (!current || !daily) return;
  const unit = appState.unitSystem;
  const today = 0;

  setText('tileWindSpeed', current.wind_speed_10m != null ? `${windSpeed(current.wind_speed_10m, unit)} ${windUnit(unit)}` : '—');
  const compass = byId('tileWindCompass');
  if (compass) compass.innerHTML = current.wind_direction_10m != null ? renderWindCompass(current.wind_direction_10m) : '';
  setText('tileWindDir', windDegToDir(current.wind_direction_10m));

  const hum = clamp(current.relative_humidity_2m ?? 0, 0, 100);
  setText('tileHumidity', `${hum}%`);
  setWidthPercent('tileHumidityBar', hum);

  setText('tilePressure', current.surface_pressure != null ? `${pressure(current.surface_pressure, unit)} ${pressureUnit(unit)}` : '—');
  setText('tilePressureArrow', current.surface_pressure > 1013 ? '↑ Wysokie' : current.surface_pressure < 1000 ? '↓ Niskie' : '→ Normalne');

  const clouds = clamp(current.cloud_cover ?? 0, 0, 100);
  setText('tileClouds', `${clouds}%`);
  setWidthPercent('tileCloudsBar', clouds);

  if (daily.sunrise?.[today] && daily.sunset?.[today]) {
    setText('tileSunrise', fmtHour(daily.sunrise[today]));
    setText('tileSunset', fmtHour(daily.sunset[today]));
    const arc = byId('tileSunArc');
    if (arc) arc.innerHTML = renderSunArc(daily.sunrise[today], daily.sunset[today]);
    const tile = byId('tileSunArc')?.closest('.detail-tile');
    tile?.setAttribute('aria-label', `Wschód ${fmtHour(daily.sunrise[today])}, zachód ${fmtHour(daily.sunset[today])}, długość dnia ${dayLengthLabel(daily.sunrise[today], daily.sunset[today])}`);
  }

  const feels = current.apparent_temperature ?? current.temperature_2m;
  const diff = Number(feels) - Number(current.temperature_2m);
  setText('tileFeelsLike', `${temperature(feels, unit)}${temperatureUnit(unit)}`);
  setText('tileFeelsDiff', Number.isFinite(diff) ? `${formatTemperatureDelta(diff, unit)} vs rzeczywista` : '—');

  const precip = daily.precipitation_sum?.[today] ?? null;
  setText('tilePrecip', precip != null ? precipitation(precip, unit) : '—');
  setText('tilePrecipSub', precipitationUnit(unit));

  const uv = daily.uv_index_max?.[today] ?? null;
  const info = uvLabel(uv);
  setText('tileUV', uv != null ? Number(uv).toFixed(1) : '—');
  setText('tileUVLabel', info.label);
  const uvLabelNode = byId('tileUVLabel');
  if (uvLabelNode) uvLabelNode.style.color = info.color;
  if (uv != null) {
    const indicator = byId('tileUVIndicator');
    if (indicator) indicator.style.left = `${Math.min(Number(uv) / 11, 1) * 100}%`;
  }

  const heroTemp = byId('heroTemp');
  if (heroTemp) heroTemp.style.color = getTempColor(current.temperature_2m);
}
