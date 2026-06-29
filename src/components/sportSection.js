import { byId, clear, createEl } from '../utils/domUtils.js';
import { calcSportScores } from '../utils/insightUtils.js';

function scoreSvg(score, color) {
  const r = 16;
  const circ = 2 * Math.PI * r;
  const dash = score / 10 * circ;
  const wrap = createEl('span');
  wrap.innerHTML = `<svg class="score-ring" viewBox="0 0 42 42" aria-hidden="true">
    <circle cx="21" cy="21" r="${r}" fill="none" stroke="var(--border)" stroke-width="3"/>
    <circle cx="21" cy="21" r="${r}" fill="none" stroke="${color}" stroke-width="3"
      stroke-dasharray="${dash.toFixed(1)} ${circ.toFixed(1)}"
      stroke-linecap="round" transform="rotate(-90 21 21)"/>
    <text x="21" y="25" text-anchor="middle" font-size="10" fill="${color}" font-family="Orbitron,monospace" font-weight="700">${score}</text>
  </svg>`;
  return wrap.firstElementChild;
}

function unavailableSvg() {
  const wrap = createEl('span');
  wrap.innerHTML = `<svg class="score-ring" viewBox="0 0 42 42" aria-hidden="true">
    <circle cx="21" cy="21" r="16" fill="none" stroke="var(--border)" stroke-width="3"/>
    <text x="21" y="26" text-anchor="middle" font-size="9" fill="var(--muted)" font-family="IBM Plex Mono,monospace">N/D</text>
  </svg>`;
  return wrap.firstElementChild;
}

export function renderSport(current, daily) {
  const grid = byId('sportGrid');
  if (!grid || !current) return;
  clear(grid);
  const scores = calcSportScores(
    current.temperature_2m,
    current.relative_humidity_2m || 50,
    current.wind_speed_10m || 0,
    daily?.precipitation_probability_max?.[0] || 0,
    daily?.uv_index_max?.[0] || 0,
    current.weather_code || 0,
  );

  scores.forEach((sport) => {
    const card = createEl('div', { className: 'sport-card', style: sport.unavailable ? { opacity: '.55' } : {} });
    card.append(createEl('div', { style: { display: 'flex', alignItems: 'center', gap: '.7rem' } }, [
      createEl('span', { className: 'sport-icon', text: sport.icon, style: sport.unavailable ? { filter: 'grayscale(1)' } : {} }),
      sport.unavailable ? unavailableSvg() : scoreSvg(sport.score, sport.color),
    ]));
    card.append(
      createEl('div', { className: 'sport-name', text: sport.name }),
      createEl('div', { className: 'sport-label', text: sport.unavailable ? 'Niedostępne' : sport.label, style: { color: sport.unavailable ? 'var(--muted)' : sport.color } }),
    );
    if (sport.reason) card.append(createEl('div', { className: 'sport-reason', text: sport.reason }));
    grid.append(card);
  });
}
