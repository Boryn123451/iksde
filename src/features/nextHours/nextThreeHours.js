import { appState } from '../../state/appState.js';
import { localHourKey, fmtHour } from '../../utils/dateUtils.js';
import { temperature, windSpeed, windUnit } from '../../utils/unitUtils.js';
import { getWmoIcon } from '../../utils/weatherCodeUtils.js';

function advice(temp, precip, wind) {
  if (precip >= 60) return 'weź parasol';
  if (wind >= 45) return 'uwaga na wiatr';
  if (temp <= -5) return 'ubierz się ciepło';
  if (temp >= 30) return 'ogranicz wysiłek';
  return 'można wyjść';
}

export function getNextThreeHours(weather) {
  const hourly = weather?.hourly;
  if (!hourly?.time?.length) return [];
  const nowHour = localHourKey(appState.location.timezone);
  let start = hourly.time.findIndex((time) => String(time).slice(0, 13) >= nowHour);
  if (start < 0) start = 0;
  return hourly.time.slice(start, start + 3).map((time, offset) => {
    const index = start + offset;
    const temp = hourly.temperature_2m?.[index];
    const precip = hourly.precipitation_probability?.[index] ?? 0;
    const wind = hourly.wind_speed_10m?.[index] ?? 0;
    return {
      time: fmtHour(time),
      icon: getWmoIcon(hourly.weather_code?.[index], 1).icon,
      temp,
      tempLabel: `${temperature(temp, appState.unitSystem)}°`,
      precip,
      wind,
      windLabel: `${windSpeed(wind, appState.unitSystem)} ${windUnit(appState.unitSystem)}`,
      advice: advice(temp, precip, wind),
    };
  });
}
