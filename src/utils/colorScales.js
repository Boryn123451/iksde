import { cssColor } from './colorUtils.js';

function isLightMode() {
  return typeof document !== 'undefined' && document.body?.classList.contains('light');
}

export function tempColor(temp) {
  const value = Number(temp);
  if (!Number.isFinite(value)) return cssColor('var(--muted)');
  const light = isLightMode();
  if (value < 0) return light ? '#075985' : '#79c0ff';
  if (value < 10) return light ? '#0f7490' : '#9bd7f0';
  if (value < 20) return light ? '#15803d' : '#56d364';
  if (value < 28) return light ? '#b45309' : '#f0a500';
  return light ? '#b91c1c' : '#f85149';
}

export function precipColor(value) {
  const p = Number(value) || 0;
  const light = isLightMode();
  if (p <= 0) return light ? 'rgba(7,89,133,.13)' : 'rgba(88,166,255,.16)';
  if (p < 2) return light ? 'rgba(2,132,199,.34)' : 'rgba(88,166,255,.32)';
  if (p < 8) return light ? 'rgba(29,78,216,.56)' : 'rgba(56,139,253,.52)';
  return light ? 'rgba(109,40,217,.66)' : 'rgba(188,140,255,.62)';
}

export function windColor(kmh) {
  const wind = Number(kmh) || 0;
  const light = isLightMode();
  if (wind < 15) return light ? '#075985' : '#58a6ff';
  if (wind < 35) return light ? '#b45309' : '#f0a500';
  if (wind < 55) return light ? '#b91c1c' : '#f85149';
  return light ? '#6d28d9' : '#bc8cff';
}

export function cloudColor(percent) {
  const cloud = Number(percent) || 0;
  const light = isLightMode();
  if (cloud < 30) return light ? 'rgba(180,83,9,.16)' : 'rgba(240,165,0,.18)';
  if (cloud < 70) return light ? 'rgba(75,85,99,.28)' : 'rgba(180,190,205,.28)';
  return light ? 'rgba(31,41,55,.38)' : 'rgba(210,220,230,.42)';
}
