import { appState } from '../state/appState.js';
import { byId, clear, createEl } from '../utils/domUtils.js';
import { localHourKey, fmtHour } from '../utils/dateUtils.js';
import { getTempColor, temperature } from '../utils/unitUtils.js';
import { getWmoIcon } from '../utils/weatherCodeUtils.js';
import { safePercent } from '../utils/sanitizeUtils.js';

export function renderHourly(hourly, { onSelectHour } = {}) {
  const strip = byId('hourlyStrip');
  if (!strip || !hourly?.time?.length) return;
  clear(strip);
  const nowHour = localHourKey(appState.location.timezone);
  let startIdx = hourly.time.findIndex((time) => String(time).slice(0, 13) >= nowHour);
  if (startIdx < 0) startIdx = 0;
  const slots = hourly.time.slice(startIdx, startIdx + 24);

  slots.forEach((time, i) => {
    const idx = startIdx + i;
    const temp = hourly.temperature_2m?.[idx];
    const precip = safePercent(hourly.precipitation_probability?.[idx] ?? 0);
    const slot = createEl('button', {
      className: `hour-slot${i === 0 ? ' active' : ''}`,
      title: 'Kliknij po szczegóły',
      type: 'button',
      dataset: { hourIdx: idx },
      style: { cursor: 'pointer' },
      on: { click: () => onSelectHour?.(idx) },
    }, [
      createEl('span', { className: 'h-time', text: fmtHour(time) }),
      createEl('span', { className: 'h-icon', text: getWmoIcon(hourly.weather_code?.[idx], 1).icon }),
      createEl('span', {
        className: 'h-temp',
        text: `${temperature(temp, appState.unitSystem)}°`,
        style: { color: getTempColor(temp) },
      }),
    ]);
    const bar = createEl('div', { className: 'h-precip-bar' });
    bar.append(createEl('div', {
      className: 'h-precip-fill',
      style: {
        height: `${Math.round(precip * 0.3)}px`,
        background: precip > 70 ? 'var(--rain)' : precip > 30 ? 'var(--accent)' : 'var(--border)',
        opacity: String(precip / 100 + 0.2),
      },
    }));
    if (precip > 10) bar.append(createEl('span', { className: 'h-precip-label', text: `${precip}%` }));
    slot.append(bar);
    strip.append(slot);
  });
}
