import { buildUrl, fetchJson } from './http.js';
import { wikivoyageRangeLabel, wikivoyageSectionLabel } from '../utils/localizationUtils.js';
import { shortenText, stripMarkup } from '../utils/textUtils.js';

const API = 'https://en.wikivoyage.org/w/api.php';
const PL_API = 'https://pl.wikivoyage.org/w/api.php';
const SECTIONS = ['Eat', 'Drink', 'Sleep', 'Buy', 'Get around'];
const ATTRACTION_SECTIONS = ['See', 'Do'];
const PL_ATTRACTION_SECTIONS = ['Warto zobaczyć', 'Rozrywka'];
const PRICE_PATTERN = /(?:[$€£]\s?\d+(?:[.,]\d+)?(?:\s?[-–]\s?[$€£]?\s?\d+(?:[.,]\d+)?)?|\d+(?:[.,]\d+)?\s?(?:zł|zl|PLN|EUR|USD|GBP)(?:\s?[-–]\s?\d+(?:[.,]\d+)?\s?(?:zł|zl|PLN|EUR|USD|GBP)?)?)/giu;

function normalizeTitle(title) {
  return String(title || '').trim().replace(/\s+/gu, '_');
}

async function parseWithApi(api, page, params) {
  return fetchJson(buildUrl(api, {
    action: 'parse',
    page: normalizeTitle(page),
    format: 'json',
    origin: '*',
    ...params,
  }), { timeout: 12000 });
}

async function parse(page, params) {
  return parseWithApi(API, page, params);
}

async function resolveTitleOnApi(api, name) {
  if (!name) return '';
  const data = await fetchJson(buildUrl(api, {
    action: 'opensearch',
    search: name,
    limit: 5,
    namespace: 0,
    format: 'json',
    origin: '*',
  }), { timeout: 9000 });
  const titles = Array.isArray(data?.[1]) ? data[1] : [];
  const exact = titles.find((title) => title.toLowerCase() === name.toLowerCase());
  const cityLike = titles.find((title) => !title.includes('/'));
  return exact || cityLike || titles[0] || '';
}

export async function resolveWikivoyageTitle({ city, lat, lon } = {}) {
  const name = String(city || '').trim();
  if (name) {
    try {
      const title = await resolveTitleOnApi(API, name);
      if (title) return title;
    } catch {
      // Try coordinate fallback.
    }
  }
  if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lon))) {
    try {
      const data = await fetchJson(buildUrl(API, {
        action: 'query',
        list: 'geosearch',
        gscoord: `${lat}|${lon}`,
        gsradius: 10000,
        gslimit: 5,
        format: 'json',
        origin: '*',
      }), { timeout: 9000 });
      const titles = data?.query?.geosearch?.map((item) => item.title).filter(Boolean) || [];
      return titles.find((title) => !title.includes('/')) || titles[0] || '';
    } catch {
      return '';
    }
  }
  return '';
}

async function resolvePolishWikivoyageTitle({ city } = {}) {
  const name = String(city || '').trim();
  if (!name) return '';
  try {
    return await resolveTitleOnApi(PL_API, name);
  } catch {
    return '';
  }
}

export async function fetchWikivoyageSections(pageTitle, api = API) {
  if (!pageTitle) return [];
  try {
    const data = await parseWithApi(api, pageTitle, { prop: 'sections' });
    return data?.parse?.sections || [];
  } catch {
    return [];
  }
}

async function fetchSectionWikitext(pageTitle, sectionIndex, api = API) {
  const data = await parseWithApi(api, pageTitle, { section: sectionIndex, prop: 'wikitext' });
  return data?.parse?.wikitext?.['*'] || '';
}

function cleanWiki(value) {
  return stripMarkup(value);
}

function cleanSnippet(value) {
  return shortenText(cleanWiki(value), 92);
}

function cleanAttractionText(value) {
  return shortenText(cleanWiki(value), 145);
}

function wikivoyageImageUrl(value) {
  const image = cleanWiki(value);
  if (!image) return '';
  if (/^https?:\/\//iu.test(image)) return image;
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(image)}?width=720`;
}

function localizePriceText(value) {
  return cleanWiki(value)
    .replace(/\bMenus from\b/giu, 'menu od')
    .replace(/\bFrom\b/giu, 'od')
    .replace(/\bor less\b/giu, 'lub mniej')
    .replace(/\band up\b/giu, 'i więcej')
    .replace(/\bup\b/giu, 'i więcej');
}

function localizeLooseLabel(value) {
  return shortenText(cleanWiki(value)
    .replace(/\((?:alternatively|not from|valid from|valid for|valid until)[^)]+\)/giu, '')
    .replace(/\balternatively this ticket[\s\S]*/giu, '')
    .replace(/\bnot from the moment of sale\b[\s\S]*/giu, '')
    .replace(/\bvalid for 24 hours since its validation\b/giu, '')
    .replace(/\bvalid from room\b/giu, '')
    .replace(PRICE_PATTERN, '')
    .replace(/\b20-minute\b/giu, 'bilet 20 min')
    .replace(/\b75-minute\b/giu, 'bilet 75 min')
    .replace(/\b90-minute\b/giu, 'bilet 90 min')
    .replace(/\b24H ticket\b/giu, 'bilet 24h')
    .replace(/\bticket\b/giu, 'bilet')
    .replace(/\bzone\b/giu, 'strefa')
    .replace(/\bvalid\b/giu, 'ważny')
    .replace(/\s*[-–;,]\s*$/gu, '')
    .replace(/\s+/gu, ' ')
    .trim(), 58);
}

function parseListings(wikitext, sectionName) {
  const listings = [];
  const regex = /\{\{(?:eat|drink|sleep|buy|listing|do|see)[\s\S]*?\n\}\}/giu;
  for (const match of String(wikitext || '').matchAll(regex)) {
    const block = match[0];
    const name = block.match(/\|\s*name\s*=\s*([^\n|]+)/iu)?.[1];
    const price = block.match(/\|\s*price\s*=\s*([^\n|]+)/iu)?.[1];
    if (!price) continue;
    listings.push({
      section: sectionName,
      name: cleanWiki(name || sectionName),
      priceText: localizePriceText(price),
      source: 'Wikivoyage',
      sourceUrl: `https://en.wikivoyage.org/wiki/${normalizeTitle(sectionName)}`,
    });
  }
  return listings;
}

function parseAttractionListings(wikitext, sectionName) {
  const listings = [];
  const regex = /\{\{(?:see|do|listing)\b[\s\S]*?\}\}/giu;
  for (const match of String(wikitext || '').matchAll(regex)) {
    const block = match[0];
    const name = block.match(/\|\s*name\s*=\s*([^\n|]+)/iu)?.[1];
    if (!name) continue;
    const alt = block.match(/\|\s*alt\s*=\s*([^\n|]+)/iu)?.[1];
    const content = block.match(/\|\s*content\s*=\s*([^\n|]+)/iu)?.[1]
      || block.match(/\|\s*description\s*=\s*([^\n|]+)/iu)?.[1]
      || block.match(/\|\s*directions\s*=\s*([^\n|]+)/iu)?.[1]
      || block.match(/\|\s*dodatkowe informacje\s*=\s*([^\n|]+)/iu)?.[1]
      || block.match(/\|\s*wskazówki\s*=\s*([^\n|]+)/iu)?.[1]
      || '';
    const image = block.match(/\|\s*image\s*=\s*([^\n|]+)/iu)?.[1] || '';
    const lat = block.match(/\|\s*lat\s*=\s*([^\n|]+)/iu)?.[1];
    const lon = block.match(/\|\s*(?:long|lon)\s*=\s*([^\n|]+)/iu)?.[1];
    const parsedLat = lat == null ? null : Number(lat);
    const parsedLon = lon == null ? null : Number(lon);
    listings.push({
      section: sectionName,
      name: cleanWiki(name),
      description: cleanAttractionText(content || alt || sectionName),
      category: sectionName === 'Do' || sectionName === 'Rozrywka' ? 'Atrakcja' : 'Zabytek',
      image: wikivoyageImageUrl(image),
      source: 'Wikivoyage',
      lat: Number.isFinite(parsedLat) ? parsedLat : null,
      lon: Number.isFinite(parsedLon) ? parsedLon : null,
    });
  }
  return listings;
}

function firstBoldName(line) {
  const bold = String(line || '').match(/'''([^']{3,120})'''/u)?.[1];
  if (bold) return cleanWiki(bold);
  return shortenText(cleanWiki(line), 70);
}

function parseAttractionBullets(wikitext, sectionName) {
  if (sectionName !== 'See' && sectionName !== 'Warto zobaczyć') return [];
  return String(wikitext || '')
    .split(/\r?\n/gu)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('*') && !line.startsWith('**'))
    .map((line) => ({
      section: sectionName,
      name: firstBoldName(line),
      description: cleanAttractionText(line),
      category: 'Zabytek',
      image: '',
      source: 'Wikivoyage',
      lat: null,
      lon: null,
    }))
    .filter((item) => item.name && item.description)
    .slice(0, 10);
}

export async function fetchWikivoyageAttractions(pageTitle) {
  if (!pageTitle) return [];
  const sections = await fetchWikivoyageSections(pageTitle);
  const selected = sections.filter((section) => ATTRACTION_SECTIONS.includes(section.line));
  const results = [];
  for (const section of selected) {
    try {
      const text = await fetchSectionWikitext(pageTitle, section.index);
      results.push(...parseAttractionBullets(text, section.line), ...parseAttractionListings(text, section.line));
    } catch {
      // Keep processing other sections.
    }
  }
  const seen = new Set();
  return results
    .map((item) => ({
      ...item,
      sourceUrl: `https://en.wikivoyage.org/wiki/${normalizeTitle(pageTitle)}#${encodeURIComponent(item.section || 'See')}`,
    }))
    .filter((item) => {
      const key = item.name.toLowerCase();
      if (!item.name || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 10);
}

export async function fetchPolishWikivoyageAttractions({ city } = {}) {
  const pageTitle = await resolvePolishWikivoyageTitle({ city });
  if (!pageTitle) return [];
  const sections = await fetchWikivoyageSections(pageTitle, PL_API);
  const selected = sections.filter((section) => PL_ATTRACTION_SECTIONS.includes(section.line));
  const results = [];
  for (const section of selected) {
    try {
      const text = await fetchSectionWikitext(pageTitle, section.index, PL_API);
      results.push(...parseAttractionBullets(text, section.line), ...parseAttractionListings(text, section.line));
    } catch {
      // Keep processing other sections.
    }
  }
  const seen = new Set();
  return results
    .map((item) => ({
      ...item,
      sourceUrl: `https://pl.wikivoyage.org/wiki/${normalizeTitle(pageTitle)}#${encodeURIComponent(item.section || 'Warto zobaczyć')}`,
    }))
    .filter((item) => {
      const key = item.name.toLowerCase();
      if (!item.name || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 10);
}

function parseLoosePrices(wikitext, sectionName) {
  const results = [];
  const text = String(wikitext || '');
  const lines = text
    .split(/\r?\n/gu)
    .map((line) => line.trim())
    .filter(Boolean);
  lines.forEach((line) => {
    if (line.startsWith('|') || line.startsWith('{{')) return;
    const prices = [...line.matchAll(PRICE_PATTERN)].map((match) => match[0]).filter(Boolean);
    if (!prices.length) return;
    const label = localizeLooseLabel(line) || cleanSnippet(line);
    results.push({
      section: sectionName,
      name: `${wikivoyageSectionLabel(sectionName)}: ${label}`,
      priceText: prices.slice(0, 2).join(' / '),
      source: 'Wikivoyage',
      sourceUrl: `https://en.wikivoyage.org/wiki/${normalizeTitle(sectionName)}`,
    });
  });
  return results.slice(0, 6);
}

function parsePriceRange(wikitext, sectionName) {
  const ranges = [];
  const regex = /\{\{(?:eatpricerange|sleeppricerange|drinkpricerange)\|([^}]+)\}\}/giu;
  for (const match of String(wikitext || '').matchAll(regex)) {
    const parts = match[1].split('|').map(cleanWiki).filter(Boolean);
    parts.forEach((price, index) => {
      ranges.push({
        section: sectionName,
        name: wikivoyageRangeLabel(sectionName, index),
        priceText: localizePriceText(price),
        source: 'Wikivoyage',
        sourceUrl: `https://en.wikivoyage.org/wiki/${normalizeTitle(sectionName)}`,
      });
    });
  }
  return ranges;
}

export async function fetchWikivoyageCosts(pageTitle) {
  const sections = await fetchWikivoyageSections(pageTitle);
  const selected = sections.filter((section) => SECTIONS.includes(section.line));
  const results = [];
  for (const section of selected) {
    try {
      const text = await fetchSectionWikitext(pageTitle, section.index);
      results.push(...parsePriceRange(text, section.line), ...parseListings(text, section.line), ...parseLoosePrices(text, section.line));
    } catch {
      // Keep other sections.
    }
  }
  return {
    items: results.slice(0, 12).map((item) => ({
      ...item,
      sourceUrl: `https://en.wikivoyage.org/wiki/${normalizeTitle(pageTitle)}#${encodeURIComponent(item.section.replace(/\s+/gu, '_'))}`,
    })),
    sourceUrl: `https://en.wikivoyage.org/wiki/${normalizeTitle(pageTitle)}`,
  };
}

function cleanSectionText(text) {
  return shortenText(cleanWiki(String(text || '')
    .replace(/\{\{[\s\S]*?\}\}/gu, ' ')
    .replace(/^\s*[=*].*$/gmu, ' ')), 260);
}

export async function fetchWikivoyageSafety(pageTitle) {
  const sections = await fetchWikivoyageSections(pageTitle);
  const section = sections.find((item) => /stay safe/iu.test(item.line))
    || sections.find((item) => /stay healthy/iu.test(item.line));
  if (!section) {
    return {
      source: 'Wikivoyage',
      sourceUrl: pageTitle ? `https://en.wikivoyage.org/wiki/${normalizeTitle(pageTitle)}` : 'https://en.wikivoyage.org',
      text: '',
      note: 'Brak lokalnej sekcji bezpieczeństwa w Wikivoyage.',
      level: 'city-level',
    };
  }
  const text = await fetchSectionWikitext(pageTitle, section.index);
  return {
    source: 'Wikivoyage',
    sourceUrl: `https://en.wikivoyage.org/wiki/${normalizeTitle(pageTitle)}#${encodeURIComponent(section.line.replace(/\s+/gu, '_'))}`,
    text: cleanSectionText(text),
    section: section.line,
    level: 'city-level',
  };
}
