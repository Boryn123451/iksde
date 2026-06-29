import { WMO_ICONS } from '../config/constants.js';

export function getWmoIcon(code, isDay = 1) {
  const item = WMO_ICONS[Number(code)] || WMO_ICONS[0];
  if (!isDay && Number(code) <= 3) return { icon: '🌙', label: item.label };
  return item;
}

export function uvLabel(uv) {
  if (uv === null || uv === undefined || Number.isNaN(Number(uv))) return { label: '—', color: 'var(--muted)' };
  const value = Number(uv);
  if (value < 3) return { label: 'Niski', color: 'var(--uv-low)' };
  if (value < 6) return { label: 'Umiarkowany', color: 'var(--uv-mod)' };
  if (value < 8) return { label: 'Wysoki', color: 'var(--uv-high)' };
  return { label: 'Ekstremalny', color: 'var(--uv-extreme)' };
}

export function windDegToDir(deg) {
  if (deg === null || deg === undefined || Number.isNaN(Number(deg))) return '—';
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(Number(deg) / 45) % 8];
}

export function countryFlag(code) {
  if (!code || typeof code !== 'string' || code.length !== 2) return '🌍';
  const normalized = code.toUpperCase();
  return normalized.replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

export function isSevereCode(code) {
  const value = Number(code);
  return value >= 82 || value === 75 || value === 86 || value >= 95;
}
