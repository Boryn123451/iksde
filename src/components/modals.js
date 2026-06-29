import { appState } from '../state/appState.js';
import { byId, clear, createEl, focusFirst, setModalOpen, setText } from '../utils/domUtils.js';
import { dayLengthLabel, fmtDay, fmtHour } from '../utils/dateUtils.js';
import { calcComfort, calcSportScores } from '../utils/insightUtils.js';
import { formatTemperatureDelta, getTempColor, precipitation, precipitationUnit, temperature, temperatureUnit, windSpeed, windUnit } from '../utils/unitUtils.js';
import { getWmoIcon, uvLabel } from '../utils/weatherCodeUtils.js';
import { safePercent } from '../utils/sanitizeUtils.js';

let lastFocused = null;

function openModal(overlayId) {
  lastFocused = document.activeElement;
  setModalOpen(overlayId, true);
  focusFirst(byId(overlayId));
}

function closeModal(overlayId) {
  setModalOpen(overlayId, false);
  lastFocused?.focus?.();
}

function statTile(label, value, sub = '', options = {}) {
  const tile = createEl('div', { className: options.className || 'dm-stat' }, [
    createEl('div', { className: options.labelClass || 'dm-stat-label', text: label }),
    createEl('div', { className: options.valueClass || 'dm-stat-value', text: value, style: options.valueStyle || {} }),
  ]);
  if (options.barWidth !== undefined) {
    tile.append(createEl('div', { style: { marginTop: '.4rem', height: '4px', borderRadius: '2px', background: 'var(--surface)', overflow: 'hidden' } }, [
      createEl('div', { style: { height: '100%', width: `${safePercent(options.barWidth)}%`, background: options.barColor || 'var(--accent)', borderRadius: '2px' } }),
    ]));
  }
  if (sub) tile.append(createEl('div', { className: options.subClass || 'dm-stat-sub', text: sub }));
  return tile;
}

export function openDayModal(dayIdx) {
  const weather = appState.weather;
  if (!weather?.daily?.time?.[dayIdx]) return;
  const daily = weather.daily;
  const hourly = weather.hourly || {};
  const unit = appState.unitSystem;
  const date = daily.time[dayIdx];
  const wmo = getWmoIcon(daily.weather_code?.[dayIdx], 1);
  const dayLabel = dayIdx === 0 ? 'Dziś' : fmtDay(date);
  setText('dmIcon', wmo.icon);
  setText('dmName', dayLabel);
  setText('dmDesc', wmo.label);

  const body = byId('dmBody');
  clear(body);
  const tmax = daily.temperature_2m_max?.[dayIdx];
  const tmin = daily.temperature_2m_min?.[dayIdx];
  const precipSum = daily.precipitation_sum?.[dayIdx] ?? null;
  const precipProb = safePercent(daily.precipitation_probability_max?.[dayIdx] ?? 0);
  const windMax = daily.wind_speed_10m_max?.[dayIdx] ?? null;
  const uv = daily.uv_index_max?.[dayIdx] ?? null;
  const uvInfo = uvLabel(uv);

  body.append(createEl('div', { className: 'dm-temp-row' }, [
    createEl('span', { className: 'dm-temp-max', text: `${temperature(tmax, unit)}${temperatureUnit(unit)}`, style: { color: getTempColor(tmax) } }),
    createEl('span', { className: 'dm-temp-min', text: `${temperature(tmin, unit)}${temperatureUnit(unit)}` }),
    createEl('div', { className: 'dm-temp-range-bar' }),
  ]));

  const stats = createEl('div', { className: 'dm-stats' });
  stats.append(
    statTile('🌂 Opady', precipSum != null ? `${precipitation(precipSum, unit)} ${precipitationUnit(unit)}` : '—', `prawdop. ${precipProb}%`, { valueStyle: { color: 'var(--rain)' }, barWidth: precipProb, barColor: 'var(--rain)' }),
    statTile('💨 Wiatr max', windMax != null ? `${windSpeed(windMax, unit)} ${windUnit(unit)}` : '—', 'prędkość maksymalna'),
    statTile('☀️ UV Index', uv != null ? Number(uv).toFixed(1) : '—', uvInfo.label, { valueStyle: { color: uvInfo.color }, barWidth: uv != null ? Math.min(Number(uv) / 11, 1) * 100 : 0, barColor: uvInfo.color }),
  );
  if (daily.sunrise?.[dayIdx] && daily.sunset?.[dayIdx]) {
    stats.append(statTile('🌅 Wschód / Zachód', `${fmtHour(daily.sunrise[dayIdx])} → ${fmtHour(daily.sunset[dayIdx])}`, `dzień: ${dayLengthLabel(daily.sunrise[dayIdx], daily.sunset[dayIdx])}`));
  }

  const dayHours = (hourly.time || []).map((time, i) => ({ time, i })).filter(({ time }) => String(time).slice(0, 10) === date);
  if (dayHours.length && hourly.relative_humidity_2m) {
    const humVals = dayHours.map(({ i }) => hourly.relative_humidity_2m[i]).filter((value) => value != null);
    const humAvg = humVals.length ? Math.round(humVals.reduce((a, b) => a + b, 0) / humVals.length) : null;
    stats.append(statTile('💧 Wilgotność', humAvg != null ? `${humAvg}%` : '—', humVals.length ? `${Math.min(...humVals)}% – ${Math.max(...humVals)}%` : '', { barWidth: humAvg ?? 0 }));
  }
  body.append(stats);

  if (dayHours.length) {
    const peakIdx = dayHours.reduce((best, item, arrI) => {
      const temp = hourly.temperature_2m?.[item.i];
      return temp != null && (best === -1 || temp > hourly.temperature_2m?.[dayHours[best].i]) ? arrI : best;
    }, -1);
    const wrap = createEl('div', {}, [
      createEl('div', { className: 'dm-hourly-title', text: 'Prognoza godzinowa' }),
      createEl('div', { className: 'dm-hourly' }),
    ]);
    const list = wrap.querySelector('.dm-hourly');
    dayHours.forEach(({ time, i }, arrI) => {
      const temp = hourly.temperature_2m?.[i];
      const rain = safePercent(hourly.precipitation_probability?.[i] ?? 0);
      const wind = hourly.wind_speed_10m?.[i] ?? 0;
      list.append(createEl('div', { className: `dm-hour${arrI === peakIdx ? ' peak' : ''}` }, [
        createEl('span', { className: 'dm-h-time', text: fmtHour(time) }),
        createEl('span', { className: 'dm-h-icon', text: getWmoIcon(hourly.weather_code?.[i], 1).icon }),
        createEl('span', { className: 'dm-h-temp', text: `${temperature(temp, unit)}${temperatureUnit(unit)}`, style: { color: getTempColor(temp) } }),
        createEl('span', { className: 'dm-h-rain', text: rain > 5 ? `💧${rain}%` : '' }),
        createEl('span', { className: 'dm-h-wind', text: wind > 0 ? `${windSpeed(wind, unit)} ${windUnit(unit)}` : '' }),
      ]));
    });
    body.append(wrap);
  }

  openModal('dayModalOverlay');
  const modal = byId('dayModal');
  if (modal) modal.scrollTop = 0;
}

export function closeDayModal() {
  closeModal('dayModalOverlay');
}

export function openHourModal(hourIdx) {
  const hourly = appState.weather?.hourly;
  if (!hourly?.time?.[hourIdx]) return;
  const unit = appState.unitSystem;
  const time = hourly.time[hourIdx];
  const temp = hourly.temperature_2m?.[hourIdx];
  const feels = hourly.apparent_temperature?.[hourIdx] ?? null;
  const hum = hourly.relative_humidity_2m?.[hourIdx] ?? null;
  const precip = safePercent(hourly.precipitation_probability?.[hourIdx] ?? 0);
  const wind = hourly.wind_speed_10m?.[hourIdx] ?? 0;
  const wmo = getWmoIcon(hourly.weather_code?.[hourIdx], 1);

  setText('hmIcon', wmo.icon);
  setText('hmTime', `${fmtHour(time)}  ${time ? time.slice(0, 10) : ''}`);
  setText('hmDesc', wmo.label);
  const body = byId('hmBody');
  clear(body);
  body.append(createEl('div', { style: { display: 'flex', alignItems: 'baseline', gap: '.8rem', paddingBottom: '.8rem', borderBottom: '1px solid var(--border)' } }, [
    createEl('span', { className: 'hm-big-temp', text: `${temperature(temp, unit)}${temperatureUnit(unit)}`, style: { color: getTempColor(temp) } }),
    feels != null ? createEl('span', { text: `Odczuwalna ${temperature(feels, unit)}${temperatureUnit(unit)}`, style: { fontSize: '1rem', color: 'var(--muted)', fontFamily: "'Space Mono',monospace" } }) : null,
  ]));

  const grid = createEl('div', { className: 'hm-grid' });
  if (hum != null) grid.append(statTile('💧 Wilgotność', `${hum}%`, '', { className: 'hm-tile', labelClass: 'hm-tile-label', valueClass: 'hm-tile-value', barWidth: hum }));
  grid.append(statTile('🌂 Opady', `${precip}%`, 'prawdopodobieństwo', { className: 'hm-tile', labelClass: 'hm-tile-label', valueClass: 'hm-tile-value', subClass: 'hm-tile-sub', valueStyle: { color: 'var(--rain)' }, barWidth: precip, barColor: 'var(--rain)' }));
  grid.append(statTile('💨 Wiatr', `${windSpeed(wind, unit)} ${windUnit(unit)}`, wind < 10 ? 'Spokojny' : wind < 30 ? 'Umiarkowany' : wind < 50 ? 'Silny' : 'Bardzo silny', { className: 'hm-tile', labelClass: 'hm-tile-label', valueClass: 'hm-tile-value', subClass: 'hm-tile-sub' }));
  if (feels != null) {
    const diff = Number(feels) - Number(temp);
    grid.append(statTile('🌡️ Różnica temp.', formatTemperatureDelta(diff, unit), diff < -3 ? 'Zimniejsza niż wskazuje termometr' : diff > 3 ? 'Cieplejsza odczuwalnie' : 'Zbliżona do rzeczywistej', { className: 'hm-tile', labelClass: 'hm-tile-label', valueClass: 'hm-tile-value', subClass: 'hm-tile-sub', valueStyle: { color: diff < -3 ? 'var(--cold)' : diff > 3 ? 'var(--warm)' : 'var(--mild)' } }));
  }
  const comfort = calcComfort(temp, hum || 50, wind, precip);
  grid.append(statTile('😊 Komfort', `${comfort.score}/10`, comfort.label, { className: 'hm-tile', labelClass: 'hm-tile-label', valueClass: 'hm-tile-value', subClass: 'hm-tile-sub', valueStyle: { color: comfort.color } }));
  body.append(grid);

  const best = calcSportScores(temp, hum || 50, wind, precip, null, hourly.weather_code?.[hourIdx]).sort((a, b) => b.score - a.score)[0];
  if (best && best.score >= 7) {
    body.append(createEl('div', { style: { padding: '.8rem 1rem', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '.78rem' } }, [
      createEl('span', { text: '✓', style: { color: 'var(--mild)' } }),
      ` Dobra godzina na: ${best.icon} ${best.name} (${best.score}/10)`,
    ]));
  }
  openModal('hourModalOverlay');
}

export function closeHourModal() {
  closeModal('hourModalOverlay');
}
