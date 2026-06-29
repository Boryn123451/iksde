import { fetchCityWeatherBatch } from '../../api/weatherApi.js';
import { STORAGE_KEYS } from '../../config/constants.js';
import { calculateComfortIndex } from '../comfort/comfortIndex.js';
import { normalizeLocation, normalizeLocations, readJson, writeJson } from '../../services/storageService.js';

export function getCompareLocations() {
  return normalizeLocations(readJson(STORAGE_KEYS.compareLocations, []), 5);
}

export function saveCompareLocations(locations) {
  writeJson(STORAGE_KEYS.compareLocations, normalizeLocations(locations, 5));
}

export function addCompareLocation(location) {
  const loc = normalizeLocation(location);
  if (!loc) return getCompareLocations();
  const next = [loc, ...getCompareLocations().filter((item) => Math.abs(item.lat - loc.lat) > 0.01 || Math.abs(item.lon - loc.lon) > 0.01)].slice(0, 5);
  saveCompareLocations(next);
  return next;
}

export function removeCompareLocation(index) {
  const next = getCompareLocations();
  next.splice(index, 1);
  saveCompareLocations(next);
  return next;
}

export async function fetchComparisonRows(locations) {
  if (!locations.length) return [];
  const data = await fetchCityWeatherBatch(locations);
  const arr = Array.isArray(data) ? data : [data];
  return arr.map((item, i) => {
    const loc = locations[i];
    const current = item.current || {};
    const daily = item.daily || {};
    return {
      ...loc,
      temp: current.temperature_2m,
      apparent: current.apparent_temperature,
      precip: current.precipitation ?? daily.precipitation_sum?.[0] ?? 0,
      precipProb: daily.precipitation_probability_max?.[0] ?? null,
      wind: current.wind_speed_10m,
      code: current.weather_code,
      comfort: calculateComfortIndex(current, daily, null),
    };
  });
}
