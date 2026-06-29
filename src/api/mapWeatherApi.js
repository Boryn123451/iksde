import { CACHE } from '../config/constants.js';
import { getMapCacheKey, readTimedCache, writeTimedCache } from '../services/cacheService.js';
import { fetchCityWeatherBatch } from './weatherApi.js';

function normalizeBatchResponse(data, cities) {
  const arr = Array.isArray(data) ? data : [data];
  return arr.map((item, index) => {
    const city = cities[index];
    if (!city) return null;
    return {
      name: city.name,
      country: city.country || '',
      countryName: city.countryName || '',
      rank: city.rank ?? 9,
      labelRank: city.labelRank ?? city.rank ?? 9,
      population: city.population ?? 0,
      lat: city.lat,
      lon: city.lon,
      isCurrent: Boolean(city.isCurrent),
      temp: item.current?.temperature_2m ?? null,
      apparent: item.current?.apparent_temperature ?? null,
      humidity: item.current?.relative_humidity_2m ?? null,
      code: item.current?.weather_code ?? null,
      isDay: item.current?.is_day ?? 1,
      wind: item.current?.wind_speed_10m ?? null,
      windDir: item.current?.wind_direction_10m ?? null,
      precip: item.current?.precipitation ?? 0,
      precipProb: item.daily?.precipitation_probability_max?.[0] ?? null,
      cloud: item.current?.cloud_cover ?? null,
    };
  }).filter(Boolean);
}

export async function fetchMapWeather(cities, scope) {
  const key = getMapCacheKey(scope);
  const cached = readTimedCache(key, CACHE.mapTtlMs);
  if (cached) return { points: cached.data, cached: true, age: cached.age };

  const results = [];
  const batchSize = 12;
  for (let i = 0; i < cities.length; i += batchSize) {
    const batch = cities.slice(i, i + batchSize);
    try {
      const data = await fetchCityWeatherBatch(batch);
      results.push(...normalizeBatchResponse(data, batch));
    } catch {
      // Map weather is supplemental. Keep already fetched batches.
    }
  }
  if (results.length) writeTimedCache(key, results);
  return { points: results, cached: false, age: 0 };
}
