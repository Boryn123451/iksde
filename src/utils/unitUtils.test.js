import { describe, expect, it } from 'vitest';
import { formatTemperatureDelta, pressure, precipitation, temperature, windSpeed } from './unitUtils.js';

describe('unit conversions', () => {
  it('formats SI values without converting', () => {
    expect(temperature(21.25, 'si')).toBe('21.3');
    expect(windSpeed(12.6, 'si')).toBe('13');
    expect(pressure(1013.25, 'si')).toBe('1013');
    expect(precipitation(2.34, 'si')).toBe('2.3');
  });

  it('formats imperial values', () => {
    expect(temperature(0, 'imperial')).toBe('32.0');
    expect(windSpeed(10, 'imperial')).toBe('6.2');
    expect(pressure(1013.25, 'imperial')).toBe('29.92');
    expect(precipitation(25.4, 'imperial')).toBe('1.00');
  });

  it('converts temperature deltas separately from absolute temperature', () => {
    expect(formatTemperatureDelta(-4.4, 'si')).toBe('-4.4°C');
    expect(formatTemperatureDelta(-4.4, 'imperial')).toBe('-7.9°F');
  });
});
