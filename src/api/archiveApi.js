import { API } from '../config/constants.js';
import { buildUrl, fetchJson } from './http.js';
import { localDateOffsetKey } from '../utils/dateUtils.js';

export function fetchHistory(lat, lon, timeZone) {
  const end = localDateOffsetKey(timeZone, -1);
  const start = localDateOffsetKey(timeZone, -7);
  return fetchJson(buildUrl(API.archive, {
    latitude: lat,
    longitude: lon,
    start_date: start,
    end_date: end,
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum',
    timezone: 'auto',
  }), { timeout: 12000 });
}
