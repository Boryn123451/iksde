import { describe, expect, it } from 'vitest';
import { generateWeatherAlerts } from './weatherAlerts.js';

describe('weather alerts', () => {
  it('detects major local weather risks from forecast data', () => {
    const alerts = generateWeatherAlerts(
      {
        temperature_2m: 1,
        apparent_temperature: -1,
        wind_speed_10m: 58,
        precipitation: 1.2,
        weather_code: 95,
      },
      {
        precipitation_sum: [12],
        precipitation_probability_max: [80],
        uv_index_max: [7],
      },
      { current: { european_aqi: 90 } },
    );

    expect(alerts.length).toBeGreaterThanOrEqual(5);
    expect(alerts.some((alert) => alert.title.includes('wiatr'))).toBe(true);
    expect(alerts.some((alert) => alert.title.includes('Burza'))).toBe(true);
    expect(alerts.some((alert) => alert.title.includes('go'))).toBe(true);
    expect(alerts.every((alert) => ['medium', 'high'].includes(alert.level))).toBe(true);
  });

  it('returns no alerts for mild conditions', () => {
    const alerts = generateWeatherAlerts(
      {
        temperature_2m: 18,
        apparent_temperature: 18,
        wind_speed_10m: 12,
        precipitation: 0,
        weather_code: 1,
      },
      {
        precipitation_sum: [0],
        precipitation_probability_max: [10],
        uv_index_max: [3],
      },
      { current: { european_aqi: 20 } },
    );

    expect(alerts).toEqual([]);
  });
});
