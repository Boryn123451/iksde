import { appState } from '../state/appState.js';
import { byId, setText } from '../utils/domUtils.js';
import { getTempColor, pressure, pressureUnit, temperature, temperatureUnit, windSpeed, windUnit } from '../utils/unitUtils.js';
import { getWmoIcon, windDegToDir } from '../utils/weatherCodeUtils.js';

export function renderHero(current) {
  if (!current) return;
  const unit = appState.unitSystem;
  const wmo = getWmoIcon(current.weather_code, current.is_day);
  setText('heroIcon', wmo.icon);
  setText('heroDesc', wmo.label);
  setText('heroBgIcon', wmo.icon);
  const tempEl = byId('heroTemp');
  if (tempEl) {
    tempEl.textContent = `${temperature(current.temperature_2m, unit)}${temperatureUnit(unit)}`;
    tempEl.style.color = getTempColor(current.temperature_2m);
  }
  const feels = current.apparent_temperature ?? current.temperature_2m;
  setText('heroFeelsLike', `Odczuwalna: ${temperature(feels, unit)}${temperatureUnit(unit)}`);
  setText('heroHumidity', current.relative_humidity_2m ?? '—');
  setText('heroWind', windSpeed(current.wind_speed_10m, unit));
  setText('heroWindUnit', windUnit(unit));
  setText('heroPressure', pressure(current.surface_pressure, unit));
  setText('heroPressureUnit', pressureUnit(unit));
  setText('heroWindDir', windDegToDir(current.wind_direction_10m));
  setText('heroClouds', current.cloud_cover ?? '—');
}
