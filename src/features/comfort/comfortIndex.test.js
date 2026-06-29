import { describe, expect, it } from 'vitest';
import { calculateComfortIndex, comfortBand } from './comfortIndex.js';

describe('comfort index', () => {
  it('keeps good weather in the top comfort band', () => {
    const result = calculateComfortIndex(
      {
        temperature_2m: 21,
        apparent_temperature: 21,
        relative_humidity_2m: 48,
        wind_speed_10m: 8,
        precipitation: 0,
      },
      {
        precipitation_probability_max: [5],
        uv_index_max: [3],
      },
      { current: { european_aqi: 18 } },
    );

    expect(result.score).toBeGreaterThanOrEqual(76);
    expect(result.reasons).toEqual([]);
  });

  it('penalizes severe weather and pollution', () => {
    const result = calculateComfortIndex(
      {
        temperature_2m: 34,
        apparent_temperature: 38,
        relative_humidity_2m: 92,
        wind_speed_10m: 62,
        precipitation: 0,
      },
      {
        precipitation_probability_max: [85],
        uv_index_max: [9],
      },
      { current: { european_aqi: 110 } },
    );

    expect(result.score).toBeLessThanOrEqual(30);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it('maps score ranges to expected bands', () => {
    expect(comfortBand(30).label).toBe('słabo');
    expect(comfortBand(55).label).toBe('średnio');
    expect(comfortBand(75).label).toBe('dobrze');
    expect(comfortBand(76).label).toBe('bardzo dobrze');
  });
});
