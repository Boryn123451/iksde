import { byId, clear, createEl } from '../utils/domUtils.js';
import { addMinutesToTime, dayLengthLabel, fmtHour } from '../utils/dateUtils.js';

function getMoonPhase(date) {
  const known = new Date('2000-01-06T00:00:00Z');
  const diff = (date - known) / (1000 * 60 * 60 * 24);
  const cycle = 29.53058867;
  const phase = ((diff % cycle) + cycle) % cycle;
  const illum = Math.round((1 - Math.cos(2 * Math.PI * phase / cycle)) / 2 * 100);
  if (phase < 1.85) return { phase, illum, name: 'Nów', emoji: '🌑' };
  if (phase < 7.38) return { phase, illum, name: 'Sierp rosnący', emoji: '🌒' };
  if (phase < 9.22) return { phase, illum, name: 'Pierwsza kwadra', emoji: '🌓' };
  if (phase < 14.77) return { phase, illum, name: 'Garbaty rosnący', emoji: '🌔' };
  if (phase < 16.61) return { phase, illum, name: 'Pełnia', emoji: '🌕' };
  if (phase < 22.15) return { phase, illum, name: 'Garbaty malejący', emoji: '🌖' };
  if (phase < 23.99) return { phase, illum, name: 'Ostatnia kwadra', emoji: '🌗' };
  return { phase, illum, name: 'Sierp malejący', emoji: '🌘' };
}

function tile(label, value, sub, extra = null) {
  const node = createEl('div', { className: 'astro-tile' }, [
    createEl('div', { className: 'astro-label', text: label }),
    createEl('div', { className: 'astro-value', text: value }),
    createEl('div', { className: 'astro-sub', text: sub }),
  ]);
  if (extra) node.append(extra);
  return node;
}

export function renderAstronomy(daily) {
  const grid = byId('astroGrid');
  if (!grid) return;
  clear(grid);
  const moon = getMoonPhase(new Date());
  const sunrise = daily?.sunrise?.[0] || null;
  const sunset = daily?.sunset?.[0] || null;
  const rise = sunrise ? fmtHour(sunrise) : null;
  const set = sunset ? fmtHour(sunset) : null;
  const moonSvg = createEl('span');
  const maskX = 24 + (moon.phase < 14.77 ? -1 : 1) * (20 - Math.abs(moon.illum - 50) * 0.4);
  const maskRx = Math.max(2, Math.abs(moon.illum - 50) * 0.4);
  moonSvg.innerHTML = `<svg class="moon-phase-svg" width="48" height="48" viewBox="0 0 48 48" aria-hidden="true">
    <defs><mask id="moonMask"><circle cx="24" cy="24" r="20" fill="white"/><ellipse cx="${maskX}" cy="24" rx="${maskRx}" ry="20" fill="black"/></mask></defs>
    <circle cx="24" cy="24" r="20" fill="var(--border)"/>
    <circle cx="24" cy="24" r="20" fill="#f0e68c" mask="url(#moonMask)" opacity=".9"/>
    <circle cx="24" cy="24" r="20" fill="none" stroke="var(--border)" stroke-width="1"/>
  </svg>`;

  grid.append(
    tile('🌙 Faza Księżyca', `${moon.emoji} ${moon.name}`, `Oświetlenie: ${moon.illum}%`, moonSvg.firstElementChild),
    tile('🌅 Wschód słońca', rise || '—', `Długość dnia: ${sunrise && sunset ? dayLengthLabel(sunrise, sunset) : '—'}`),
    tile('🌇 Zachód słońca', set || '—', 'Astronomiczny zmierzch ~30 min po'),
  );
  if (rise && set) grid.append(tile('📸 Złota godzina', `${rise}–${addMinutesToTime(rise, 60)}`, `Wieczór: ${addMinutesToTime(set, -60)}–${set}`));
  grid.append(tile('📅 Cykl księżyca', `${Math.round(moon.phase)} dni`, 'z 29.5-dniowego cyklu'));
}
