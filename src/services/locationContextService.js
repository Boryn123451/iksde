import { STORAGE_KEYS } from '../config/constants.js';
import { fetchCountryInfo } from '../api/countryApi.js';
import { reverseGeocode } from '../api/reverseGeocodingApi.js';
import { resolveWikivoyageTitle } from '../api/wikivoyageApi.js';
import { readTimedCache, writeTimedCache } from './cacheService.js';

const LOCATION_CONTEXT_TTL = 7 * 24 * 60 * 60 * 1000;

function cacheKey(location) {
  return `${STORAGE_KEYS.locationContextPrefix}_${Number(location.lat).toFixed(3)}_${Number(location.lon).toFixed(3)}`;
}

function isPlaceholderLocationName(value) {
  const text = String(value || '').trim().toLowerCase()
    .normalize('NFD')
    .replace(/\p{Mark}/gu, '');
  return !text
    || text === 'udostepniona lokalizacja'
    || text === 'moja lokalizacja'
    || text === 'shared location';
}

async function resolveReverseLabel(location) {
  if (!Number.isFinite(Number(location.lat)) || !Number.isFinite(Number(location.lon))) return null;
  try {
    return await reverseGeocode(location.lat, location.lon);
  } catch {
    return null;
  }
}

async function resolveCountry(location, reverseLabel) {
  if (location.countryCode || location.country) {
    try {
      return await fetchCountryInfo({ countryCode: location.countryCode, countryName: location.country });
    } catch {
      // Continue with reverse geocoding fallback.
    }
  }
  if (reverseLabel?.countryCode || reverseLabel?.country) {
    try {
      return await fetchCountryInfo({ countryCode: reverseLabel.countryCode, countryName: reverseLabel.country });
    } catch {
      return null;
    }
  }
  return null;
}

export async function buildLocationContext(location) {
  const cached = readTimedCache(cacheKey(location), LOCATION_CONTEXT_TTL);
  if (cached) return cached.data;
  const needsReverseLabel = isPlaceholderLocationName(location.city || location.name) || !location.countryCode || !location.country;
  const reverseLabel = needsReverseLabel ? await resolveReverseLabel(location) : null;
  const country = await resolveCountry(location, reverseLabel);
  const rawCity = location.city || location.name || '';
  const city = isPlaceholderLocationName(rawCity) ? reverseLabel?.city || '' : rawCity;
  const countryName = country?.name || location.country || reverseLabel?.country || '';
  const countryCode = country?.alpha2 || location.countryCode || reverseLabel?.countryCode || '';
  const wikivoyageTitle = location.wikivoyageTitle || await resolveWikivoyageTitle({
    city,
    lat: location.lat,
    lon: location.lon,
  });
  const context = {
    city,
    displayName: [city, countryName].filter(Boolean).join(', '),
    country: countryName,
    countryCodeAlpha2: countryCode,
    countryCodeAlpha3: country?.alpha3 || '',
    lat: Number(location.lat),
    lon: Number(location.lon),
    wikidataId: location.wikidataId || '',
    wikipediaTitle: location.wikipediaTitle || city,
    wikivoyageTitle: wikivoyageTitle || city,
    timezone: location.timezone || '',
    localCurrencyCode: country?.localCurrencyCode || '',
    localCurrencyName: country?.localCurrencyName || '',
    localCurrencySymbol: country?.localCurrencySymbol || '',
    languages: country?.languageEntries || [],
    flagUrl: country?.flagUrl || '',
    fallbackFlagUrl: country?.fallbackFlagUrl || '',
    countryInfo: country,
  };
  writeTimedCache(cacheKey(location), context);
  return context;
}
