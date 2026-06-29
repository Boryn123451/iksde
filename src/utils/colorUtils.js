export function cssColor(value) {
  if (typeof value !== 'string') return value;
  const match = value.match(/^var\((--[^)]+)\)$/);
  if (!match) return value;
  return getComputedStyle(document.body).getPropertyValue(match[1]).trim() || value;
}
