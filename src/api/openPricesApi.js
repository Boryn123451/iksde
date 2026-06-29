import { buildUrl, fetchJson } from './http.js';

const OPEN_PRICES = 'https://prices.openfoodfacts.org/api/v1/prices';

function labelFromItem(item) {
  return item.product_name
    || item.product?.product_name
    || String(item.category_tag || item.product?.categories_tags?.[0] || 'Produkt').replace(/^en:/u, '').replace(/-/gu, ' ');
}

export async function fetchOpenPrices({ countryCode, currency, size = 40 } = {}) {
  if (!countryCode) return { items: [], sourceUrl: OPEN_PRICES };
  const data = await fetchJson(buildUrl(OPEN_PRICES, {
    size,
    location_osm_address_country_code: String(countryCode).toUpperCase(),
    currency: currency || undefined,
  }), { timeout: 12000 });
  const items = (data.items || [])
    .filter((item) => Number.isFinite(Number(item.price)) && item.currency)
    .map((item) => ({
      label: labelFromItem(item),
      price: Number(item.price),
      currency: String(item.currency || '').toUpperCase(),
      date: item.date || item.created?.slice(0, 10) || '',
      city: item.location?.osm_address_city || '',
      countryCode: item.location?.osm_address_country_code || countryCode,
      source: 'Open Prices / Open Food Facts',
      sourceUrl: 'https://prices.openfoodfacts.org',
      sampleCount: 1,
    }));
  return { items, sourceUrl: 'https://prices.openfoodfacts.org' };
}
