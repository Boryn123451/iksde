import { describe, expect, it } from 'vitest';
import { countryFlag, getWmoIcon, uvLabel, windDegToDir } from './weatherCodeUtils.js';

describe('weather code helpers', () => {
  it('maps WMO codes with fallback', () => {
    expect(getWmoIcon(95, 1).label).toBe('Burza');
    expect(getWmoIcon(999, 1).label).toBe('Bezchmurnie');
  });

  it('maps wind and UV labels', () => {
    expect(windDegToDir(90)).toBe('E');
    expect(uvLabel(7).label).toBe('Wysoki');
  });

  it('builds country flags only for two-letter codes', () => {
    expect(countryFlag('PL')).toBe('🇵🇱');
    expect(countryFlag('')).toBe('🌍');
  });
});
