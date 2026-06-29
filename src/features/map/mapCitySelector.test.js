import { beforeEach, describe, expect, it } from 'vitest';
import {
  resetWorldCityCatalogForTests,
  selectMapCities,
  setDetailCityCatalogForTests,
  setWorldCityCatalogForTests,
} from './mapCitySelector.js';

describe('map city selector', () => {
  beforeEach(() => {
    resetWorldCityCatalogForTests();
  });

  it('adds smaller local cities at high zoom around Warsaw', () => {
    const result = selectMapCities({
      zoom: 5.8,
      width: 1200,
      currentLocation: { lat: 52.23, lon: 21.01, city: 'Warszawa' },
      viewport: {
        centerLat: 52.23,
        centerLon: 21.01,
        minLat: 50.8,
        maxLat: 53.6,
        halfLat: 1.4,
        halfLon: 3.4,
      },
    });
    const names = result.cities.map((city) => city.name);
    expect(names).toContain('Warszawa');
    expect(names).toContain('Płock');
    expect(names).toContain('Siedlce');
    expect(names).toContain('Ciechanów');
    expect(names).not.toContain('Berlin');
  });

  it('uses global cities outside Europe', () => {
    const result = selectMapCities({
      zoom: 5.6,
      width: 1200,
      currentLocation: { lat: 40.71, lon: -74.01, city: 'Nowy Jork' },
      viewport: {
        centerLat: 40.71,
        centerLon: -74.01,
        minLat: 39.7,
        maxLat: 41.9,
        halfLat: 1.1,
        halfLon: 3,
      },
    });
    const names = result.cities.map((city) => city.name);
    expect(names).toContain('Nowy Jork');
    expect(names).toContain('Newark');
    expect(names).toContain('Jersey City');
    expect(names).not.toContain('Warszawa');
  });

  it('uses Asian city coverage around Tokyo', () => {
    const result = selectMapCities({
      zoom: 5.8,
      width: 1200,
      currentLocation: { lat: 35.68, lon: 139.76, city: 'Tokio', country: 'JP' },
      viewport: {
        centerLat: 35.68,
        centerLon: 139.76,
        minLat: 33.8,
        maxLat: 37.5,
        halfLat: 1.85,
        halfLon: 4,
      },
    });
    const names = result.cities.map((city) => city.name);
    expect(names).toContain('Tokio');
    expect(names).toContain('Jokohama');
    expect(names).toContain('Saitama');
  });

  it('uses African city coverage around West Africa', () => {
    const result = selectMapCities({
      zoom: 4.8,
      width: 1200,
      currentLocation: { lat: 5.56, lon: -0.2, city: 'Accra', country: 'GH' },
      viewport: {
        centerLat: 6,
        centerLon: 0,
        minLat: 0,
        maxLat: 13,
        halfLat: 6.5,
        halfLon: 10,
      },
    });
    const names = result.cities.map((city) => city.name);
    expect(names).toContain('Accra');
    expect(names).toContain('Abidjan');
    expect(names).toContain('Lagos');
  });

  it('uses Oceania city coverage around Australia', () => {
    const result = selectMapCities({
      zoom: 5.4,
      width: 1200,
      currentLocation: { lat: -33.87, lon: 151.21, city: 'Sydney', country: 'AU' },
      viewport: {
        centerLat: -33.87,
        centerLon: 151.21,
        minLat: -39,
        maxLat: -27,
        halfLat: 6,
        halfLon: 8,
      },
    });
    const names = result.cities.map((city) => city.name);
    expect(names).toContain('Sydney');
    expect(names).toContain('Newcastle');
    expect(names).toContain('Canberra');
  });

  it('uses Antarctic station coverage', () => {
    const result = selectMapCities({
      zoom: 5.6,
      width: 1200,
      currentLocation: { lat: -77.85, lon: 166.67, city: 'McMurdo Station', country: 'AQ' },
      viewport: {
        centerLat: -77.85,
        centerLon: 166.67,
        minLat: -82,
        maxLat: -72,
        halfLat: 5,
        halfLon: 25,
      },
    });
    const names = result.cities.map((city) => city.name);
    expect(names).toContain('McMurdo Station');
    expect(names).toContain('Scott Base');
  });

  it('keeps searched remote cities visible even when the catalog is sparse', () => {
    const result = selectMapCities({
      zoom: 8.5,
      width: 390,
      currentLocation: { lat: 64.18, lon: -51.72, city: 'Nuuk', country: 'GL' },
      viewport: {
        centerLat: 64.18,
        centerLon: -51.72,
        minLat: 63.6,
        maxLat: 64.8,
        halfLat: 0.6,
        halfLon: 1.2,
      },
    });
    const names = result.cities.map((city) => city.name);
    expect(names[0]).toBe('Nuuk');
    expect(result.cities[0].isCurrent).toBe(true);
    expect(result.cities[0].labelRank).toBe(0);
  });

  it('keeps low zoom focused on large cities', () => {
    const result = selectMapCities({
      zoom: 2,
      width: 1200,
      currentLocation: null,
      viewport: {
        centerLat: 20,
        centerLon: 20,
        minLat: -60,
        maxLat: 70,
        halfLat: 65,
        halfLon: 180,
      },
    });
    const names = result.cities.map((city) => city.name);
    expect(names).toContain('Londyn');
    expect(names).toContain('Tokio');
    expect(names).not.toContain('Pruszków');
  });

  it('switches from major to smaller generated cities while zooming', () => {
    setWorldCityCatalogForTests([
      { name: 'Beijing', country: 'CN', lat: 39.9042, lon: 116.4074, population: 21500000, capital: true },
      { name: 'Tianjin', country: 'CN', lat: 39.3434, lon: 117.3616, population: 13600000 },
      { name: 'Langfang', country: 'CN', lat: 39.52, lon: 116.7, population: 550000 },
      { name: 'Zhuozhou', country: 'CN', lat: 39.49, lon: 115.98, population: 650000 },
      { name: 'Gaobeidian', country: 'CN', lat: 39.33, lon: 115.85, population: 360000 },
      { name: 'Sanhe', country: 'CN', lat: 39.98, lon: 117.08, population: 700000 },
    ], 'generated-test');

    const viewport = {
      centerLat: 39.9,
      centerLon: 116.4,
      minLat: 38.8,
      maxLat: 40.8,
      halfLat: 1,
      halfLon: 2,
    };
    const lowZoom = selectMapCities({ zoom: 3.2, width: 1200, currentLocation: null, viewport });
    const highZoom = selectMapCities({ zoom: 6.2, width: 1200, currentLocation: null, viewport });
    const lowNames = lowZoom.cities.map((city) => city.name);
    const highNames = highZoom.cities.map((city) => city.name);

    expect(lowNames).toContain('Tianjin');
    expect(lowNames).not.toContain('Langfang');
    expect(highNames).toContain('Tianjin');
    expect(highNames).toContain('Langfang');
    expect(highNames).toContain('Zhuozhou');
  });

  it('uses detail cities below 15k only when zoom is high enough', () => {
    setWorldCityCatalogForTests([
      { name: 'Moscow', country: 'RU', lat: 55.7522, lon: 37.6156, population: 10381222, capital: true },
      { name: 'Khimki', country: 'RU', lat: 55.897, lon: 37.429, population: 239967 },
    ], 'base-test');
    setDetailCityCatalogForTests([
      { name: 'Monino', country: 'RU', lat: 55.8424, lon: 38.1936, population: 10000 },
      { name: 'Losino-Petrovsky', country: 'RU', lat: 55.8714, lon: 38.2006, population: 7800 },
      { name: 'Staraya Kupavna', country: 'RU', lat: 55.8037, lon: 38.1805, population: 9300 },
    ]);

    const viewport = {
      centerLat: 55.82,
      centerLon: 38.05,
      minLat: 55.45,
      maxLat: 56.1,
      halfLat: 0.35,
      halfLon: 0.9,
    };
    const lowZoom = selectMapCities({ zoom: 5.2, width: 1200, currentLocation: null, viewport });
    const highZoom = selectMapCities({ zoom: 7.1, width: 1200, currentLocation: null, viewport });

    expect(lowZoom.cities.map((city) => city.name)).not.toContain('Monino');
    expect(highZoom.cities.map((city) => city.name)).toContain('Monino');
    expect(highZoom.cities.map((city) => city.name)).toContain('Losino-Petrovsky');
  });
});
