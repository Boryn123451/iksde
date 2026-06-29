import { STORAGE_KEYS } from '../config/constants.js';
import { fetchOpenPrices } from './openPricesApi.js';
import { fetchWikimediaPhotos, fetchWikipediaAttractions } from './wikipediaApi.js';
import { fetchPolishWikivoyageAttractions, fetchWikivoyageAttractions, fetchWikivoyageCosts, fetchWikivoyageSafety } from './wikivoyageApi.js';
import { fetchCanadaAdvisory, fetchGovAdvisory, fetchWorldBankHomicide, getGpi } from './safetyApi.js';
import { readTimedCache, writeTimedCache } from '../services/cacheService.js';
import { buildLocationContext } from '../services/locationContextService.js';
import { convertPriceText, formatMoneyWithConversion, getFxRate, livingCostApiKey, preferredCurrency } from '../services/currencyService.js';
import { translateProductLabel } from '../utils/localizationUtils.js';
import { shortenText } from '../utils/textUtils.js';

const TOURISM_TTL = 24 * 60 * 60 * 1000;

function distanceKm(lat1, lon1, lat2, lon2) {
  const aLat = Number(lat1);
  const aLon = Number(lon1);
  const bLat = Number(lat2);
  const bLon = Number(lon2);
  if (![aLat, aLon, bLat, bLon].every(Number.isFinite)) return null;
  const r = 6371;
  const p1 = aLat * Math.PI / 180;
  const p2 = bLat * Math.PI / 180;
  const dLat = (bLat - aLat) * Math.PI / 180;
  const dLon = (bLon - aLon) * Math.PI / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dLon / 2) ** 2;
  return r * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function withAttractionDistance(items, context) {
  return items.map((item) => {
    if (item.distanceKm != null) return item;
    if (item.lat == null || item.lon == null) return item;
    const distance = distanceKm(context.lat, context.lon, item.lat, item.lon);
    return distance == null ? item : { ...item, distanceKm: distance };
  });
}

async function fetchTourismAttractions(context) {
  const polishWikivoyage = await fetchPolishWikivoyageAttractions({ city: context.city }).catch(() => []);
  const englishWikivoyage = polishWikivoyage.length >= 10
    ? []
    : await fetchWikivoyageAttractions(context.wikivoyageTitle || context.city).catch(() => []);
  const seenPrimary = new Set();
  const primary = withAttractionDistance([...polishWikivoyage, ...englishWikivoyage].filter((item) => {
    const key = String(item.name || '').toLowerCase();
    if (!key || seenPrimary.has(key)) return false;
    seenPrimary.add(key);
    return true;
  }), context);
  if (primary.length >= 10) return primary.slice(0, 10);
  const fallback = await fetchWikipediaAttractions(context.lat, context.lon).catch(() => []);
  const seen = new Set(primary.map((item) => String(item.name || '').toLowerCase()));
  return [
    ...primary,
    ...fallback.filter((item) => {
      const key = String(item.name || '').toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    }),
  ].slice(0, 10);
}

function tourismCacheKey(location) {
  const code = String(location.countryCode || location.country || 'xx').toLowerCase().replace(/[^a-z0-9-]/gu, '');
  return `${STORAGE_KEYS.tourismPrefix}_${Number(location.lat).toFixed(2)}_${Number(location.lon).toFixed(2)}_${code}_${preferredCurrency()}`;
}

function sectionKey(section) {
  if (/sleep/iu.test(section)) return 'sleep';
  if (/get around|transport/iu.test(section)) return 'transport';
  if (/buy/iu.test(section)) return 'buy';
  return 'eatDrink';
}

async function buildOpenPricesSection(context) {
  const localCurrency = context.localCurrencyCode || '';
  try {
    const result = await fetchOpenPrices({
      countryCode: context.countryCodeAlpha2,
      currency: localCurrency || undefined,
      size: 40,
    });
    const rows = [];
    const seen = new Set();
    for (const item of result.items) {
      const key = `${item.label}:${item.price}:${item.currency}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const converted = await formatMoneyWithConversion(item.price, item.currency);
      rows.push({
        label: shortenText(translateProductLabel(item.label || 'Produkt'), 54),
        value: converted.text,
        note: [item.city, item.date, converted.note].filter(Boolean).join(' · '),
        source: item.source,
        sourceUrl: item.sourceUrl,
        sampleCount: item.sampleCount,
      });
      if (rows.length >= 8) break;
    }
    return {
      key: 'products',
      title: 'Produkty',
      source: 'Open Prices / Open Food Facts',
      sourceUrl: result.sourceUrl,
      items: rows,
      empty: rows.length ? '' : 'Brak danych Open Prices dla tej lokalizacji.',
    };
  } catch {
    return {
      key: 'products',
      title: 'Produkty',
      source: 'Open Prices / Open Food Facts',
      sourceUrl: 'https://prices.openfoodfacts.org',
      items: [],
      empty: 'Brak danych Open Prices dla tej lokalizacji.',
    };
  }
}

async function buildWikivoyageCostSections(context) {
  try {
    const result = await fetchWikivoyageCosts(context.wikivoyageTitle || context.city);
    const sections = new Map([
      ['eatDrink', { key: 'eatDrink', title: 'Jedzenie i napoje', source: 'Wikivoyage', sourceUrl: result.sourceUrl, items: [], empty: '' }],
      ['sleep', { key: 'sleep', title: 'Noclegi', source: 'Wikivoyage', sourceUrl: result.sourceUrl, items: [], empty: '' }],
      ['transport', { key: 'transport', title: 'Transport', source: 'Wikivoyage', sourceUrl: result.sourceUrl, items: [], empty: '' }],
      ['buy', { key: 'buy', title: 'Zakupy', source: 'Wikivoyage', sourceUrl: result.sourceUrl, items: [], empty: '' }],
    ]);
    for (const item of result.items) {
      const converted = await convertPriceText(item.priceText, context.localCurrencyCode);
      const row = {
        label: item.name,
        value: converted.text,
        note: converted.note,
        source: 'Wikivoyage',
        sourceUrl: item.sourceUrl,
      };
      const group = sections.get(sectionKey(item.section));
      if (group && group.items.length < 5) group.items.push(row);
    }
    sections.forEach((section) => {
      if (!section.items.length) section.empty = 'Brak cen w Wikivoyage dla tej lokalizacji.';
    });
    return [...sections.values()];
  } catch {
    return [
      { key: 'eatDrink', title: 'Jedzenie i napoje', source: 'Wikivoyage', sourceUrl: 'https://en.wikivoyage.org', items: [], empty: 'Brak cen w Wikivoyage dla tej lokalizacji.' },
      { key: 'sleep', title: 'Noclegi', source: 'Wikivoyage', sourceUrl: 'https://en.wikivoyage.org', items: [], empty: 'Brak cen w Wikivoyage dla tej lokalizacji.' },
      { key: 'transport', title: 'Transport', source: 'Wikivoyage', sourceUrl: 'https://en.wikivoyage.org', items: [], empty: 'Brak cen w Wikivoyage dla tej lokalizacji.' },
    ];
  }
}

function livingCostSection() {
  const key = livingCostApiKey();
  return {
    key: 'livingCost',
    title: 'Opcjonalne koszty',
    source: 'LivingCost.net',
    sourceUrl: 'https://www.livingcost.net/api',
    items: [],
    empty: key
      ? 'Brak danych z LivingCost. Dostęp API wymaga weryfikacji dla podanego klucza.'
      : 'Brak danych z LivingCost. To opcjonalne źródło wymaga własnego klucza API.',
  };
}

async function buildCosts(context) {
  const preferred = preferredCurrency();
  const local = context.localCurrencyCode || '';
  let fx = null;
  if (local && preferred && local !== preferred) {
    try {
      const rate = await getFxRate(local, preferred);
      fx = {
        text: `1 ${local} ≈ ${Number(rate.rate).toFixed(4)} ${preferred}`,
        source: rate.source || 'NBP',
        date: rate.date,
      };
    } catch {
      fx = { text: 'Brak kursu dla konwersji waluty.', source: 'NBP / Frankfurter' };
    }
  }
  const [products, wikivoyageSections] = await Promise.all([
    buildOpenPricesSection(context),
    buildWikivoyageCostSections(context),
  ]);
  return {
    localCurrency: local,
    preferredCurrency: preferred,
    fx,
    sections: [products, ...wikivoyageSections, livingCostSection()],
  };
}

async function buildSafety(context) {
  const [homicide, gov, canada, wikivoyage] = await Promise.all([
    fetchWorldBankHomicide(context.countryCodeAlpha3),
    fetchGovAdvisory(context.country),
    fetchCanadaAdvisory(context.countryInfo?.englishName || context.country),
    fetchWikivoyageSafety(context.wikivoyageTitle || context.city),
  ]);
  return {
    gpi: getGpi(context.countryCodeAlpha3),
    homicide,
    advisories: { gov, canada },
    local: wikivoyage,
    cityIndex: {
      source: 'public city-level safety index',
      level: 'city-level',
      note: 'Brak miejskiego indeksu bezpieczeństwa z publicznego źródła.',
    },
  };
}

export async function fetchTourismBundle(location) {
  const cacheKey = tourismCacheKey(location);
  const cached = readTimedCache(cacheKey, TOURISM_TTL);
  if (cached) return { ...cached.data, cached: true };

  const context = await buildLocationContext(location);
  const [attractionsResult, costsResult, safetyResult, photosResult] = await Promise.allSettled([
    fetchTourismAttractions(context),
    buildCosts(context),
    buildSafety(context),
    fetchWikimediaPhotos(context.lat, context.lon, context.wikipediaTitle || context.city),
  ]);

  const attractions = attractionsResult.status === 'fulfilled' ? attractionsResult.value : [];
  const attractionPhotos = attractions.filter((item) => item.image).slice(0, 8).map((item) => ({
    title: item.name,
    url: item.image,
    sourceUrl: item.sourceUrl,
    source: item.source,
  }));
  const fallbackPhotos = photosResult.status === 'fulfilled' ? photosResult.value : [];
  const data = {
    location: context,
    country: context.countryInfo,
    attractions,
    photos: attractionPhotos.length ? attractionPhotos : fallbackPhotos,
    costs: costsResult.status === 'fulfilled' ? costsResult.value : {
      localCurrency: context.localCurrencyCode,
      preferredCurrency: preferredCurrency(),
      sections: [
        { key: 'products', title: 'Produkty', source: 'Open Prices / Open Food Facts', sourceUrl: 'https://prices.openfoodfacts.org', items: [], empty: 'Brak danych Open Prices dla tej lokalizacji.' },
        { key: 'wikivoyage', title: 'Wikivoyage', source: 'Wikivoyage', sourceUrl: 'https://en.wikivoyage.org', items: [], empty: 'Brak cen w Wikivoyage dla tej lokalizacji.' },
      ],
    },
    safety: safetyResult.status === 'fulfilled' ? safetyResult.value : {
      gpi: getGpi(context.countryCodeAlpha3),
      homicide: { source: 'World Bank / UNODC', note: 'Brak danych World Bank / UNODC dla tego kraju.' },
      advisories: {
        gov: { source: 'gov.pl / MSZ', sourceUrl: 'https://www.gov.pl/web/dyplomacja/informacje-dla-podrozujacych/', note: 'Brak automatycznego odczytu danych MSZ.' },
        canada: { source: 'Government of Canada Travel Advice', sourceUrl: 'https://travel.gc.ca/travelling/advisories', note: 'Brak danych Government of Canada Travel Advice.' },
      },
      local: { source: 'Wikivoyage', note: 'Brak lokalnej sekcji bezpieczeństwa w Wikivoyage.' },
      cityIndex: { note: 'Brak miejskiego indeksu bezpieczeństwa z publicznego źródła.' },
    },
  };
  writeTimedCache(cacheKey, data);
  return { ...data, cached: false };
}
