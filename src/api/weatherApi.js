import { API } from '../config/constants.js';
import { buildUrl, fetchJson } from './http.js';

export function fetchForecast(lat, lon) {
  return fetchJson(buildUrl(API.forecast, {
    latitude: lat,
    longitude: lon,
    current: [
      'temperature_2m',
      'apparent_temperature',
      'relative_humidity_2m',
      'precipitation',
      'weather_code',
      'wind_speed_10m',
      'wind_direction_10m',
      'cloud_cover',
      'surface_pressure',
      'is_day',
    ].join(','),
    hourly: [
      'temperature_2m',
      'precipitation_probability',
      'weather_code',
      'wind_speed_10m',
      'apparent_temperature',
      'relative_humidity_2m',
      'cloud_cover',
    ].join(','),
    daily: [
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_sum',
      'wind_speed_10m_max',
      'uv_index_max',
      'sunrise',
      'sunset',
      'precipitation_probability_max',
    ].join(','),
    forecast_days: 7,
    timezone: 'auto',
    wind_speed_unit: 'kmh',
  }), { timeout: 12000 });
}

export function fetchCityWeatherBatch(cities) {
  const lats = cities.map((city) => city.lat).join(',');
  const lons = cities.map((city) => city.lon).join(',');
  return fetchJson(buildUrl(API.forecast, {
    latitude: lats,
    longitude: lons,
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,precipitation,cloud_cover,is_day',
    daily: 'uv_index_max,precipitation_probability_max,precipitation_sum',
    forecast_days: 1,
    timezone: 'auto',
    wind_speed_unit: 'kmh',
  }), { timeout: 10000 });
}
