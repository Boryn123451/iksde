import { describe, expect, it } from 'vitest';
import { flagAlt, flagEmoji, flagUrl, normalizeCountryCode } from './countryUtils.js';

describe('country utils', () => {
  it('accepts only ISO-3166 alpha-2 codes', () => {
    expect(normalizeCountryCode('pl')).toBe('PL');
    expect(normalizeCountryCode('Polska')).toBe('');
    expect(normalizeCountryCode('')).toBe('');
  });

  it('builds public flagcdn urls without guessing country names', () => {
    expect(flagUrl('PL', 40)).toBe('https://flagcdn.com/w40/pl.png');
    expect(flagUrl('Polska', 40)).toBe('');
    expect(flagAlt('PL')).toBe('Flaga kraju PL');
    expect(flagEmoji('PL')).toBe('🇵🇱');
  });
});
