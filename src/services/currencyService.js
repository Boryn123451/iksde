import { STORAGE_KEYS } from '../config/constants.js';
import { fetchLatestRate, fetchSupportedCurrencies } from '../api/currencyApi.js';
import { fetchNbpCrossRate, fetchNbpCurrencies } from '../api/nbpApi.js';
import { appState } from '../state/appState.js';
import { readJson, readString, writeJson, writeString } from './storageService.js';

const DAY_MS = 24 * 60 * 60 * 1000;

function browserDefaultCurrency() {
  const locale = typeof navigator !== 'undefined' ? navigator.language || '' : '';
  const region = (() => {
    try {
      return new Intl.Locale(locale).region;
    } catch {
      return '';
    }
  })();
  if (String(region).toUpperCase() === 'PL') return 'PLN';
  return 'EUR';
}

export function preferredCurrency() {
  return appState.preferredCurrency || readString(STORAGE_KEYS.preferredCurrency, browserDefaultCurrency()).toUpperCase();
}

export function setPreferredCurrency(code) {
  const value = String(code || '').trim().toUpperCase();
  appState.preferredCurrency = /^[A-Z]{3}$/u.test(value) ? value : browserDefaultCurrency();
  writeString(STORAGE_KEYS.preferredCurrency, appState.preferredCurrency);
}

export function livingCostApiKey() {
  return readString(STORAGE_KEYS.livingCostApiKey, '');
}

export function setLivingCostApiKey(key) {
  writeString(STORAGE_KEYS.livingCostApiKey, String(key || '').trim());
}

export async function getCurrencies() {
  const cached = readJson(STORAGE_KEYS.currenciesCache, null);
  if (cached?.data && cached.ts && Date.now() - cached.ts < DAY_MS) return cached.data;
  const data = await fetchNbpCurrencies().catch(() => fetchSupportedCurrencies());
  writeJson(STORAGE_KEYS.currenciesCache, { ts: Date.now(), data });
  return data;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export async function getFxRate(base, target) {
  const from = String(base || '').toUpperCase();
  const to = String(target || '').toUpperCase();
  if (!from || !to || from === to) return { rate: 1, date: todayKey(), source: 'NBP', sameCurrency: true };
  const key = `${STORAGE_KEYS.fxPrefix}_${from}_${to}_${todayKey()}`;
  const cached = readJson(key, null);
  if (cached?.rate && cached.date) return cached;
  let data;
  try {
    const result = await fetchNbpCrossRate(from, to);
    data = { rate: result.rate, date: result.date, source: result.source || 'NBP' };
  } catch {
    const result = await fetchLatestRate(from, to);
    data = { rate: result.rate, date: result.date, source: 'Frankfurter' };
  }
  writeJson(key, data);
  return data;
}

export function formatMoney(amount, currency, digits = 2) {
  if (!Number.isFinite(Number(amount)) || !currency) return '';
  return `${Number(amount).toFixed(digits)} ${String(currency).toUpperCase()}`;
}

export async function formatMoneyWithConversion(amount, localCurrency, targetCurrency = preferredCurrency()) {
  const local = String(localCurrency || '').toUpperCase();
  const target = String(targetCurrency || '').toUpperCase();
  if (!Number.isFinite(Number(amount)) || !local) return { text: 'Brak danych', note: '' };
  const baseText = formatMoney(amount, local);
  if (!target || local === target) return { text: baseText, note: '' };
  try {
    const fx = await getFxRate(local, target);
    return {
      text: `${baseText} â‰ ${formatMoney(Number(amount) * fx.rate, target)}`,
      note: `Kurs: ${fx.source || 'NBP'}, ${fx.date}`,
      rateText: `1 ${local} â‰ ${Number(fx.rate).toFixed(4)} ${target}`,
      rateDate: fx.date,
      source: fx.source || 'NBP',
    };
  } catch {
    return { text: baseText, note: 'Brak kursu dla konwersji waluty.' };
  }
}

function symbolCurrency(symbol, localCurrency) {
  const value = String(symbol || '').toLowerCase();
  if (value.includes('zĹ‚') || value.includes('zl')) return 'PLN';
  if (value.includes('â‚¬')) return 'EUR';
  if (value.includes('ÂŁ')) return 'GBP';
  if (value.includes('$')) return localCurrency || 'USD';
  if (/^[A-Z]{3}$/u.test(symbol)) return symbol;
  return localCurrency || '';
}

export async function convertPriceText(priceText, localCurrency, targetCurrency = preferredCurrency()) {
  const text = String(priceText || '').trim();
  if (!text) return { text: 'Brak danych', note: '' };
  const rangePattern = /(\d+(?:[.,]\d+)?)\s*(zĹ‚|zl|â‚¬|ÂŁ|\$|[A-Z]{3})?\s*(?:-|â€“|â€”|to)\s*(\d+(?:[.,]\d+)?)\s*(zĹ‚|zl|â‚¬|ÂŁ|\$|[A-Z]{3})?/iu;
  const singlePattern = /(\d+(?:[.,]\d+)?)\s*(zĹ‚|zl|â‚¬|ÂŁ|\$|[A-Z]{3})?/iu;
  const rangeMatch = text.match(rangePattern);
  const singleMatch = rangeMatch ? null : text.match(singlePattern);
  const match = rangeMatch || singleMatch;
  if (!match) return { text, note: 'Brak automatycznej konwersji.' };
  const first = Number(String(match[1]).replace(',', '.'));
  const second = rangeMatch ? Number(String(match[3]).replace(',', '.')) : null;
  const currency = symbolCurrency(rangeMatch ? match[2] || match[4] : match[2], localCurrency);
  if (!Number.isFinite(first) || !currency) return { text, note: 'Brak automatycznej konwersji.' };
  if (!targetCurrency || currency === targetCurrency) return { text, note: '' };
  try {
    const fx = await getFxRate(currency, targetCurrency);
    const converted = second == null
      ? formatMoney(first * fx.rate, targetCurrency)
      : `${formatMoney(first * fx.rate, targetCurrency)}â€“${formatMoney(second * fx.rate, targetCurrency)}`;
    return {
      text: `${text} â‰ ${converted}`,
      note: `Kurs: ${fx.source || 'NBP'}, ${fx.date}`,
      rateText: `1 ${currency} â‰ ${Number(fx.rate).toFixed(4)} ${targetCurrency}`,
      rateDate: fx.date,
      source: fx.source || 'NBP',
    };
  } catch {
    return { text, note: 'Brak kursu dla konwersji waluty.' };
  }
}
