import { localMinutesOfDay, timeToMinutes } from '../../utils/dateUtils.js';

export function recommendClothing(current, daily, timezone) {
  const feels = Number(current?.apparent_temperature ?? current?.temperature_2m);
  const wind = Number(current?.wind_speed_10m ?? 0);
  const precip = Number(daily?.precipitation_probability_max?.[0] ?? 0);
  const uv = Number(daily?.uv_index_max?.[0] ?? 0);
  const now = localMinutesOfDay(timezone);
  const sunrise = timeToMinutes(daily?.sunrise?.[0]?.slice(11, 16));
  const sunset = timeToMinutes(daily?.sunset?.[0]?.slice(11, 16));
  const night = sunrise !== null && sunset !== null && (now < sunrise || now > sunset);
  const items = [];

  if (feels <= -5) items.push('ciepła kurtka', 'czapka i rękawiczki', 'warstwa termiczna');
  else if (feels <= 5) items.push('ciepła kurtka', 'pełne buty');
  else if (feels <= 13) items.push('lekka kurtka', 'długi rękaw');
  else if (feels <= 22) items.push('lekka bluza');
  else items.push('lekka odzież');

  if (precip >= 40) items.push('parasol lub kurtka przeciwdeszczowa');
  if (wind >= 35) items.push('wiatroodporna warstwa');
  if (uv >= 6) items.push('krem UV', 'okulary przeciwsłoneczne');
  if (night && feels < 16) items.push('dodatkowa warstwa na wieczór');

  return [...new Set(items)].slice(0, 6);
}
