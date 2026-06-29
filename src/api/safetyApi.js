import GPI_2025 from '../data/safety/gpi-2025.json';
import { STORAGE_KEYS } from '../config/constants.js';
import { buildUrl, fetchJson, fetchText } from './http.js';
import { readTimedCache, writeTimedCache } from '../services/cacheService.js';

const WEEK = 7 * 24 * 60 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;
const MONTH = 30 * 24 * 60 * 60 * 1000;
const GPI_SOURCE = 'https://www.visionofhumanity.org/maps/';
const GOV_SOURCE = 'https://www.gov.pl/web/dyplomacja/informacje-dla-podrozujacych/';

function readerUrl(url) {
  return `https://r.jina.ai/http://${url.replace(/^https?:\/\//u, '')}`;
}

function stripDiacritics(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/gu, '').replace(/ł/giu, 'l');
}

function slug(value) {
  return stripDiacritics(value).toLowerCase().replace(/[^a-z0-9]+/gu, '-').replace(/^-|-$/gu, '');
}

function clean(value, max = 700) {
  return String(value || '')
    .replace(/\[[^\]]+\]\([^)]+\)/gu, '')
    .replace(/[*_`#|]/gu, '')
    .replace(/\s+/gu, ' ')
    .trim()
    .slice(0, max)
    .trim();
}

function section(text, heading) {
  const source = String(text || '');
  const pattern = new RegExp(`\\n${heading}\\n([\\s\\S]{80,1200})`, 'iu');
  const match = source.match(pattern);
  if (!match) return '';
  const stop = match[1].search(/\n[A-ZĄĆĘŁŃÓŚŹŻ][^\n]{2,70}\n/u);
  return clean(stop > 80 ? match[1].slice(0, stop) : match[1]);
}

function markdownSection(text, heading) {
  const source = String(text || '');
  const pattern = new RegExp(`(?:^|\\n)#{1,4}\\s*${heading}\\s*\\n([\\s\\S]{80,1600})`, 'iu');
  const match = source.match(pattern);
  if (!match) return '';
  const stop = match[1].search(/\n#{1,4}\s+[^\n]{2,90}\n/u);
  return clean(stop > 80 ? match[1].slice(0, stop) : match[1]);
}

function extractGovCountryLinks(text) {
  const links = new Map();
  const regex = /\[([^\]]{2,90})\]\((https?:\/\/www\.gov\.pl\/web\/dyplomacja\/[^)#\s]+)\)/giu;
  for (const match of String(text || '').matchAll(regex)) {
    const label = clean(match[1], 90);
    const url = match[2].replace(/^http:/u, 'https:');
    const key = slug(label);
    if (!key || key === 'informacje-dla-podrozujacych' || links.has(key)) continue;
    links.set(key, { label, url });
  }
  return links;
}

async function resolveGovCountryUrl(countryName) {
  const countrySlug = slug(countryName);
  if (!countrySlug) return '';
  const indexKey = `${STORAGE_KEYS.travelAdvisoryPrefix}_gov_index`;
  const cached = readTimedCache(indexKey, DAY);
  let links = cached?.data || null;
  if (!links) {
    const text = await fetchText(readerUrl(GOV_SOURCE), { timeout: 16000 });
    links = [...extractGovCountryLinks(text).values()];
    writeTimedCache(indexKey, links);
  }
  const exact = links.find((item) => slug(item.label) === countrySlug);
  if (exact) return exact.url;
  const partial = links.find((item) => slug(item.label).includes(countrySlug) || countrySlug.includes(slug(item.label)));
  return partial?.url || '';
}

export function getGpi(countryCodeAlpha3) {
  const iso3 = String(countryCodeAlpha3 || '').toUpperCase();
  const row = GPI_2025.find((item) => item.iso3 === iso3);
  if (!row) {
    return {
      source: 'Global Peace Index',
      sourceUrl: GPI_SOURCE,
      level: 'country-level',
      note: 'Brak danych Global Peace Index dla tego kraju.',
    };
  }
  return {
    ...row,
    source: 'Global Peace Index',
    sourceUrl: row.sourceUrl || GPI_SOURCE,
    level: 'country-level',
  };
}

export async function fetchWorldBankHomicide(countryCodeAlpha3) {
  const iso3 = String(countryCodeAlpha3 || '').toUpperCase();
  if (!iso3) return { source: 'World Bank / UNODC', level: 'country-level', note: 'Brak danych World Bank / UNODC dla tego kraju.' };
  const key = `${STORAGE_KEYS.worldBankSafetyPrefix}_${iso3}`;
  const cached = readTimedCache(key, WEEK);
  if (cached) return cached.data;
  try {
    const data = await fetchJson(buildUrl(`https://api.worldbank.org/v2/country/${iso3}/indicator/VC.IHR.PSRC.P5`, {
      format: 'json',
      per_page: 60,
    }), { timeout: 16000 });
    const row = (Array.isArray(data?.[1]) ? data[1] : []).find((item) => item.value !== null && item.value !== undefined);
    const result = row ? {
      source: 'World Bank / UNODC',
      sourceUrl: 'https://data.worldbank.org/indicator/VC.IHR.PSRC.P5',
      level: 'country-level',
      value: Number(row.value),
      year: row.date,
    } : {
      source: 'World Bank / UNODC',
      sourceUrl: 'https://data.worldbank.org/indicator/VC.IHR.PSRC.P5',
      level: 'country-level',
      note: 'Brak danych World Bank / UNODC dla tego kraju.',
    };
    writeTimedCache(key, result);
    return result;
  } catch {
    return {
      source: 'World Bank / UNODC',
      sourceUrl: 'https://data.worldbank.org/indicator/VC.IHR.PSRC.P5',
      level: 'country-level',
      note: 'Brak danych World Bank / UNODC dla tego kraju.',
    };
  }
}

export async function fetchGovAdvisory(countryName) {
  const countrySlug = slug(countryName);
  if (!countrySlug) return { source: 'gov.pl / MSZ', sourceUrl: GOV_SOURCE, note: 'Brak automatycznego odczytu danych MSZ.' };
  const key = `${STORAGE_KEYS.travelAdvisoryPrefix}_gov_${countrySlug}`;
  const cached = readTimedCache(key, DAY);
  if (cached) return cached.data;
  try {
    const sourceUrl = await resolveGovCountryUrl(countryName);
    if (!sourceUrl) throw new Error('Brak profilu kraju MSZ.');
    const text = await fetchText(readerUrl(sourceUrl), { timeout: 14000 });
    const result = {
      source: 'gov.pl / MSZ',
      sourceUrl,
      level: 'country-level',
      text: clean(section(text, 'Bezpieczeństwo') || section(text, 'MSZ odradza') || ''),
      note: '',
    };
    const parsedMarkdownText = clean(markdownSection(text, 'Bezpieczeństwo') || markdownSection(text, 'MSZ odradza') || '');
    if (parsedMarkdownText) result.text = parsedMarkdownText;
    const parsedMarkdownTextUtf = clean(markdownSection(text, 'Bezpiecze\u0144stwo') || markdownSection(text, 'MSZ odradza') || '');
    if (parsedMarkdownTextUtf) result.text = parsedMarkdownTextUtf;
    if (!result.text) result.note = 'Brak automatycznego odczytu danych MSZ.';
    writeTimedCache(key, result);
    return result;
  } catch {
    return { source: 'gov.pl / MSZ', sourceUrl: GOV_SOURCE, level: 'country-level', note: 'Brak automatycznego odczytu danych MSZ.' };
  }
}

function canadaSlug(countryName) {
  const value = String(countryName || '').toLowerCase();
  if (/stany|united states|usa/u.test(value)) return 'united-states';
  if (/wielka brytania|united kingdom|kingdom/u.test(value)) return 'united-kingdom';
  return slug(countryName);
}

export async function fetchCanadaAdvisory(countryName) {
  const page = canadaSlug(countryName);
  if (!page) return { source: 'Government of Canada Travel Advice', note: 'Brak danych ostrzeżeń podróżnych Rządu Kanady.' };
  const sourceUrl = `https://travel.gc.ca/destinations/${page}`;
  const key = `${STORAGE_KEYS.travelAdvisoryPrefix}_canada_${page}`;
  const cached = readTimedCache(key, DAY);
  if (cached) return cached.data;
  try {
    const text = await fetchText(readerUrl(sourceUrl), { timeout: 14000 });
    const headingLine = text
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .find((line) => /^###\s+.+\s+-\s+.+/u.test(line));
    const headingLevel = headingLine?.replace(/^###\s+.+?\s+-\s+/u, '').trim() || '';
    const plainLevel = text.match(/\b(Take normal security precautions|Exercise a high degree of caution|Exercise increased caution|Avoid non-essential travel|Avoid all travel)\b/iu)?.[1] || '';
    const updated = text.match(/Last updated:\s*([^\n]+)/iu)?.[1] || '';
    const result = {
      source: 'Government of Canada Travel Advice',
      sourceUrl,
      level: 'country-level',
      advisoryLevel: clean(headingLevel || plainLevel, 140),
      updated: clean(updated, 80),
      note: '',
    };
    if (!result.advisoryLevel) result.note = 'Brak danych ostrzeżeń podróżnych Rządu Kanady.';
    writeTimedCache(key, result);
    return result;
  } catch {
    return { source: 'Government of Canada Travel Advice', sourceUrl, level: 'country-level', note: 'Brak danych ostrzeżeń podróżnych Rządu Kanady.' };
  }
}

export { MONTH as WIKIVOYAGE_SAFETY_TTL };
