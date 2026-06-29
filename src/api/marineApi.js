import { API } from '../config/constants.js';
import { buildUrl, fetchJson } from './http.js';

export function fetchMarine(lat, lon) {
  return fetchJson(buildUrl(API.marine, {
    latitude: lat,
    longitude: lon,
    current: 'wave_height,wave_direction,wave_period,wind_wave_height,swell_wave_height,swell_wave_direction,swell_wave_period,sea_surface_temperature',
    hourly: 'wave_height,wave_period',
    timezone: 'auto',
    forecast_days: 3,
  }), { timeout: 10000 });
}
