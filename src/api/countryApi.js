import { buildUrl, fetchJson } from './http.js';
import { flagUrl } from '../utils/countryUtils.js';
import { currencyNamePl, formatRegionPl, languageNamePl, regionNamePl, subregionNamePl } from '../utils/localizationUtils.js';

function currencyEntries(currencies = {}) {
  return Object.entries(currencies || {})
    .map(([code, item]) => ({
      code: String(code || '').toUpperCase(),
      name: item?.name || '',
      symbol: item?.symbol || '',
      label: [code, item?.name].filter(Boolean).join(' - '),
    }))
    .filter((item) => item.code);
}

function parseCurrencies(currencies = {}) {
  return currencyEntries(currencies)
    .map((item) => [item.code, currencyNamePl(item.code, item.name)].filter(Boolean).join(' '))
    .join(', ');
}

function parseLanguages(languages = {}) {
  return languageEntries(languages).map((item) => languageNamePl(item.code, item.name)).join(', ');
}

function languageEntries(languages = {}) {
  return Object.entries(languages || {})
    .map(([code, name]) => ({ code, name }))
    .filter((item) => item.name);
}

function normalizeCountry(item) {
  if (!item) return null;
  const code = String(item.cca2 || '').toUpperCase();
  const currencies = currencyEntries(item.currencies);
  const languages = languageEntries(item.languages);
  return {
    code,
    alpha2: code,
    alpha3: String(item.cca3 || '').toUpperCase(),
    name: item.translations?.pol?.common || item.name?.common || '',
    englishName: item.name?.common || '',
    officialName: item.translations?.pol?.official || item.name?.official || '',
    flagUrl: flagUrl(code, 160) || item.flags?.png || item.flags?.svg || '',
    fallbackFlagUrl: item.flags?.png || item.flags?.svg || '',
    flagAlt: item.flags?.alt || '',
    currencies: parseCurrencies(item.currencies),
    currencyEntries: currencies,
    localCurrencyCode: currencies[0]?.code || '',
    localCurrencyName: currencies[0]?.code ? currencyNamePl(currencies[0].code, currencies[0].name) : '',
    localCurrencySymbol: currencies[0]?.symbol || '',
    languages: parseLanguages(item.languages),
    languageEntries: languages,
    capital: Array.isArray(item.capital) ? item.capital.join(', ') : '',
    region: regionNamePl(item.region),
    subregion: subregionNamePl(item.subregion),
    regionLabel: formatRegionPl(item.region, item.subregion),
  };
}

export async function fetchCountryInfo({ countryCode, countryName } = {}) {
  const fields = 'name,translations,flags,currencies,languages,capital,region,subregion,cca2,cca3';
  const code = String(countryCode || '').trim();
  if (code.length === 2) {
    const data = await fetchJson(`https://restcountries.com/v3.1/alpha/${encodeURIComponent(code)}?fields=${fields}`, { timeout: 9000 });
    return normalizeCountry(Array.isArray(data) ? data[0] : data);
  }
  const name = String(countryName || '').trim();
  if (!name) return null;
  const data = await fetchJson(buildUrl('https://restcountries.com/v3.1/name/' + encodeURIComponent(name), {
    fields,
    fullText: false,
  }), { timeout: 9000 });
  return normalizeCountry(Array.isArray(data) ? data[0] : data);
}
