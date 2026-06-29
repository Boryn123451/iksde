import { appState } from '../state/appState.js';
import { byId, clear, createEl } from '../utils/domUtils.js';
import { fmtDay, localDateKey } from '../utils/dateUtils.js';
import { getTempColor, temperature, windSpeed, windUnit } from '../utils/unitUtils.js';
import { getWmoIcon, uvLabel } from '../utils/weatherCodeUtils.js';
import { safePercent } from '../utils/sanitizeUtils.js';

export function renderDaily(daily, { onSelectDay } = {}) {
  const grid = byId('dailyGrid');
  if (!grid || !daily?.time?.length) return;
  clear(grid);
  const today = localDateKey(appState.location.timezone);
  daily.time.forEach((date, i) => {
    const tmax = daily.temperature_2m_max?.[i];
    const tmin = daily.temperature_2m_min?.[i];
    const precip = safePercent(daily.precipitation_probability_max?.[i] ?? 0);
    const uv = daily.uv_index_max?.[i] ?? null;
    const uvInfo = uvLabel(uv);
    const isToday = date === today;
    const card = createEl('button', {
      className: `day-card${isToday ? ' today' : ''}`,
      type: 'button',
      title: 'Kliknij aby zobaczyć szczegóły',
      dataset: { dayIdx: i },
      style: { cursor: 'pointer' },
      on: { click: () => onSelectDay?.(i) },
    }, [
      createEl('div', { className: 'day-name', text: isToday ? 'Dziś' : fmtDay(date) }),
      createEl('div', { className: 'day-icon', text: getWmoIcon(daily.weather_code?.[i], 1).icon }),
      createEl('div', { className: 'day-temps' }, [
        createEl('span', { className: 'day-max', text: `${temperature(tmax, appState.unitSystem)}°`, style: { color: getTempColor(tmax) } }),
        createEl('span', { className: 'day-min', text: `${temperature(tmin, appState.unitSystem)}°` }),
      ]),
      createEl('div', { className: 'day-temp-bar' }),
    ]);
    const meta = createEl('div', { className: 'day-meta' });
    if (precip > 10) meta.append(createEl('span', {}, ['💧', createEl('span', { className: 'val', text: `${precip}%` })]));
    meta.append(createEl('span', {}, ['💨', createEl('span', { className: 'val', text: `${windSpeed(daily.wind_speed_10m_max?.[i], appState.unitSystem)}${windUnit(appState.unitSystem)}` })]));
    if (uv !== null && uv !== undefined) meta.append(createEl('span', {}, ['UV', createEl('span', { className: 'val', text: uv, style: { color: uvInfo.color } })]));
    card.append(meta, createEl('div', {
      text: '▾ szczegóły',
      style: { fontSize: '.55rem', color: 'var(--accent)', textAlign: 'center', marginTop: '.3rem', opacity: '.6' },
    }));
    grid.append(card);
  });
}
