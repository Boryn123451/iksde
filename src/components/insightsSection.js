import { appState } from '../state/appState.js';
import { byId, clear, createEl } from '../utils/domUtils.js';
import { buildWeatherAlerts, calcComfort, calcSportScores, recommendClothing } from '../utils/insightUtils.js';
import { temperature, temperatureUnit, windSpeed, windUnit } from '../utils/unitUtils.js';

function tile(label, value, sub = '', style = {}) {
  return createEl('div', { className: 'insight-tile' }, [
    createEl('div', { className: 'insight-label', text: label }),
    createEl('div', { className: 'insight-value', text: value, style }),
    sub ? createEl('div', { className: 'insight-sub', text: sub }) : null,
  ]);
}

export function renderInsights(current, daily) {
  const grid = byId('insightsGrid');
  if (!grid || !current) return;
  clear(grid);
  const unit = appState.unitSystem;
  const precip = daily?.precipitation_probability_max?.[0] || 0;
  const comfort = calcComfort(current.apparent_temperature ?? current.temperature_2m, current.relative_humidity_2m || 50, current.wind_speed_10m || 0, precip);
  const sports = calcSportScores(current.temperature_2m, current.relative_humidity_2m || 50, current.wind_speed_10m || 0, precip, daily?.uv_index_max?.[0] || 0, current.weather_code || 0);
  const best = sports.filter((item) => !item.unavailable).sort((a, b) => b.score - a.score)[0];
  const worst = sports.filter((item) => !item.unavailable).sort((a, b) => a.score - b.score)[0];
  const alerts = buildWeatherAlerts(current, daily);

  grid.append(
    tile('Komfort', `${comfort.score}/10`, comfort.label, { color: comfort.color }),
    tile('Ubiór', recommendClothing(current, daily), `Odczuwalna ${temperature(current.apparent_temperature ?? current.temperature_2m, unit)}${temperatureUnit(unit)}`),
    tile('Najlepsza aktywność', best ? `${best.icon} ${best.name}` : '—', best ? `${best.label}, ${best.score}/10` : ''),
    tile('Lepiej odpuścić', worst ? `${worst.icon} ${worst.name}` : '—', worst?.reason || 'Brak mocnych przeciwwskazań'),
    tile('Wiatr i opady', `${windSpeed(current.wind_speed_10m, unit)} ${windUnit(unit)} / ${Math.round(precip)}%`, 'Skrót do decyzji wyjścia'),
  );

  const alertTile = createEl('div', { className: 'insight-tile' }, [
    createEl('div', { className: 'insight-label', text: 'Ostrzeżenia warunkowe' }),
  ]);
  if (!alerts.length) {
    alertTile.append(createEl('div', { className: 'insight-value', text: 'Brak istotnych ostrzeżeń' }));
  } else {
    alerts.forEach((alert) => {
      alertTile.append(createEl('span', { className: 'alert-chip', title: alert.text, text: `${alert.level === 'high' ? '!' : '•'} ${alert.label}` }));
    });
  }
  grid.append(alertTile);
}
