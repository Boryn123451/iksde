import { buildUrl, fetchJson } from './http.js';

export async function reverseGeocode(lat, lon) {
  const data = await fetchJson(buildUrl('https://nominatim.openstreetmap.org/reverse', {
    lat,
    lon,
    format: 'json',
    'accept-language': 'pl',
  }), { timeout: 8000 });
  const address = data?.address || {};
  return {
    city: address.city || address.town || address.village || address.state || 'Moja lokalizacja',
    country: address.country || '',
    countryCode: String(address.country_code || '').toUpperCase(),
  };
}
