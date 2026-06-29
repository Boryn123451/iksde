import { buildUrl, fetchJson } from './http.js';

const FRANKFURTER = 'https://api.frankfurter.dev/v1';

export async function fetchSupportedCurrencies() {
  const data = await fetchJson(`${FRANKFURTER}/currencies`, { timeout: 9000 });
  return Object.entries(data || {})
    .map(([code, name]) => ({ code: String(code).toUpperCase(), name: String(name || code) }))
    .sort((a, b) => a.code.localeCompare(b.code));
}

export async function fetchLatestRate(base, target) {
  const from = String(base || '').toUpperCase();
  const to = String(target || '').toUpperCase();
  if (!from || !to || from === to) return { rate: 1, date: new Date().toISOString().slice(0, 10) };
  const data = await fetchJson(buildUrl(`${FRANKFURTER}/latest`, {
    base: from,
    symbols: to,
  }), { timeout: 9000 });
  const rate = data?.rates?.[to];
  if (!Number.isFinite(Number(rate))) throw new Error('Brak kursu dla konwersji waluty.');
  return { rate: Number(rate), date: data.date || new Date().toISOString().slice(0, 10) };
}
