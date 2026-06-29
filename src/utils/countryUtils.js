export function normalizeCountryCode(code) {
  const value = String(code || '').trim().toUpperCase();
  return /^[A-Z]{2}$/u.test(value) ? value : '';
}

export function flagUrl(countryCode, size = 40) {
  const code = normalizeCountryCode(countryCode);
  if (!/^[A-Z]{2}$/u.test(code)) return '';
  const width = size <= 40 ? 40 : size <= 80 ? 80 : 160;
  return `https://flagcdn.com/w${width}/${code.toLowerCase()}.png`;
}

export function flagEmoji(countryCode) {
  const code = normalizeCountryCode(countryCode);
  if (!code) return '';
  return [...code]
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join('');
}

export function flagAlt(countryCode) {
  const code = normalizeCountryCode(countryCode);
  return code ? `Flaga kraju ${code}` : 'Flaga kraju';
}
