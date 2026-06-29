import { API } from '../config/constants.js';
import { buildUrl, fetchJson } from './http.js';

export function fetchAirQuality(lat, lon) {
  return fetchJson(buildUrl(API.airQuality, {
    latitude: lat,
    longitude: lon,
    current: 'european_aqi,pm10,pm2_5,nitrogen_dioxide,ozone',
    timezone: 'auto',
  }), { timeout: 10000 });
}
