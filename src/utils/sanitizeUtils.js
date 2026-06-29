export function toFiniteNumber(value, fallback = null) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function clamp(value, min, max) {
  const number = toFiniteNumber(value, min);
  return Math.min(max, Math.max(min, number));
}

export function safeText(value, fallback = '—') {
  if (value === null || value === undefined || Number.isNaN(value)) return fallback;
  return String(value);
}

export function safePercent(value) {
  return clamp(value ?? 0, 0, 100);
}

export function sanitizeFileName(value) {
  return safeText(value, 'pogoda')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'pogoda';
}
