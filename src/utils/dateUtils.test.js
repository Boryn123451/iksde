import { describe, expect, it } from 'vitest';
import { localDateKey, localHourKey, timeToMinutes } from './dateUtils.js';

describe('timezone helpers', () => {
  it('uses the requested timezone instead of UTC ISO slicing', () => {
    const date = new Date('2026-01-01T23:30:00Z');
    expect(localDateKey('Europe/Warsaw', date)).toBe('2026-01-02');
    expect(localHourKey('Europe/Warsaw', date)).toBe('2026-01-02T00');
  });

  it('handles timezones behind UTC', () => {
    const date = new Date('2026-01-01T04:30:00Z');
    expect(localHourKey('America/New_York', date)).toBe('2025-12-31T23');
  });

  it('parses HH:mm safely', () => {
    expect(timeToMinutes('06:45')).toBe(405);
    expect(timeToMinutes('bad')).toBe(null);
  });
});
