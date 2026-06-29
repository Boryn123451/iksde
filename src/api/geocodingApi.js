import { API } from '../config/constants.js';
import { buildUrl, fetchJson } from './http.js';

export async function searchCities(query) {
  if (!query || query.trim().length < 2) return [];
  const data = await fetchJson(buildUrl(API.geocoding, {
    name: query.trim(),
    count: 8,
    language: 'pl',
    format: 'json',
  }), { timeout: 8000 });
  return Array.isArray(data.results) ? data.results : [];
}
