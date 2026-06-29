export function generateWeatherAlerts(current, daily, aqiData) {
  const alerts = [];
  const temp = Number(current?.temperature_2m);
  const feels = Number(current?.apparent_temperature ?? temp);
  const wind = Number(current?.wind_speed_10m ?? 0);
  const precip = Number(daily?.precipitation_sum?.[0] ?? current?.precipitation ?? 0);
  const precipProb = Number(daily?.precipitation_probability_max?.[0] ?? 0);
  const uv = Number(daily?.uv_index_max?.[0] ?? 0);
  const code = Number(current?.weather_code ?? 0);
  const aqi = Number(aqiData?.current?.european_aqi ?? NaN);

  const push = (level, icon, title, text) => alerts.push({ level, icon, title, text });
  if (wind >= 50) push('high', '💨', 'Silny wiatr', `Porywy mogą być uciążliwe. Aktualnie około ${Math.round(wind)} km/h.`);
  if (temp >= 30 || feels >= 32) push('medium', '🔥', 'Upał', `Temperatura odczuwalna około ${Math.round(feels)}°C.`);
  if (temp <= -5 || feels <= -8) push('medium', '❄️', 'Mróz', `Temperatura odczuwalna około ${Math.round(feels)}°C.`);
  if ([95, 96, 99].includes(code)) push('high', '⛈️', 'Burza', 'Kod pogody wskazuje burzę lub grad.');
  if (precip >= 10 || precipProb >= 70) push('medium', '🌧️', 'Intensywne opady', `Opady ${precip.toFixed(1)} mm, ryzyko ${Math.round(precipProb)}%.`);
  if (uv >= 6) push(uv >= 8 ? 'high' : 'medium', '☀️', 'Wysokie UV', `Indeks UV ${uv.toFixed(1)}.`);
  if (temp >= -2 && temp <= 2 && (precip > 0 || precipProb >= 40 || [56, 57, 66, 67].includes(code))) {
    push('high', '🧊', 'Możliwa gołoledź', 'Temperatura blisko zera i opady mogą pogarszać przyczepność.');
  }
  if (Number.isFinite(aqi) && aqi >= 80) push('high', '🏭', 'Bardzo zła jakość powietrza', `Europejski AQI: ${Math.round(aqi)}.`);
  return alerts;
}
