import { calculateComfortIndex } from '../features/comfort/comfortIndex.js';
import { byId, createEl, clear } from '../utils/domUtils.js';

export function renderComfortCard(current, daily, aqi) {
  const ringWrap = byId('comfortRing');
  const reasonsEl = byId('comfortReasons');
  if (!ringWrap) return;
  clear(ringWrap);
  const comfort = calculateComfortIndex(current, daily, aqi);

  // SVG ring gauge
  const pct = comfort.score;
  const r = 36;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const svg = `<svg viewBox="0 0 90 90" width="88" height="88" style="display:block;margin:0 auto">
    <circle cx="45" cy="45" r="${r}" fill="none" stroke="var(--border)" stroke-width="6" opacity=".35"/>
    <circle cx="45" cy="45" r="${r}" fill="none" stroke="${comfort.color}" stroke-width="6"
      stroke-dasharray="${circ}" stroke-dashoffset="${offset}" stroke-linecap="round"
      transform="rotate(-90 45 45)" style="transition: stroke-dashoffset .8s ease, stroke .4s ease"/>
    <text x="45" y="42" text-anchor="middle" fill="${comfort.color}" font-family="'Orbitron',monospace" font-size="18" font-weight="900">${pct}</text>
    <text x="45" y="56" text-anchor="middle" fill="var(--muted)" font-family="'Space Mono',monospace" font-size="8">${comfort.label}</text>
  </svg>`;
  ringWrap.innerHTML = svg;

  if (reasonsEl) {
    reasonsEl.textContent = comfort.reasons.length
      ? comfort.reasons.join(' · ')
      : 'Warunki bez mocnych obciążeń.';
  }
}
