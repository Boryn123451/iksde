import { isSevereCode } from './weatherCodeUtils.js';

export function calcComfort(temp, hum = 50, wind = 0, precip = 0) {
  let score = 10;
  const t = Number(temp);
  const h = Number(hum);
  const w = Number(wind);
  const p = Number(precip);
  if (t < 0) score -= 4;
  else if (t < 5) score -= 2;
  else if (t > 32) score -= 3;
  else if (t > 28) score -= 1;
  if (h > 85) score -= 2;
  else if (h > 70 || h < 25) score -= 1;
  if (w > 50) score -= 3;
  else if (w > 30) score -= 2;
  else if (w > 20) score -= 1;
  if (p > 70) score -= 2;
  else if (p > 30) score -= 1;
  score = Math.max(1, Math.min(10, score));
  const colors = ['', 'var(--hot)', 'var(--hot)', 'var(--warm)', 'var(--warm)', 'var(--uv-mod)', 'var(--uv-mod)', 'var(--mild)', 'var(--mild)', 'var(--accent)', 'var(--mild)'];
  const labels = ['', 'Ekstremalny dyskomfort', 'Bardzo nieprzyjemnie', 'Nieprzyjemnie', 'Raczej nieprzyjemnie', 'Przeciętnie', 'Znośnie', 'Całkiem komfortowo', 'Komfortowo', 'Bardzo komfortowo', 'Idealnie'];
  return { score, color: colors[score], label: labels[score] };
}

export function classifyClimate(temp, hum) {
  if (temp > 28 && hum > 70) return 'tropical';
  if (temp > 22 && hum > 60) return 'subtropical';
  if (temp > 10 && temp <= 22) return 'temperate';
  if (temp <= 10 && temp > 0) return 'cool';
  if (temp <= 0 && temp > -15) return 'cold';
  if (temp <= -15) return 'arctic';
  return 'temperate';
}

export function hasSnowConditions(temp, wmoCode) {
  return Number(temp) < 3 && ([71, 73, 75, 77, 85, 86].includes(Number(wmoCode)) || Number(temp) < 0);
}

export function calcSportScores(temp, hum = 50, wind = 0, precipProb = 0, uv = null, wmoCode = 0) {
  const t = Number(temp);
  const h = Number(hum);
  const w = Number(wind);
  const p = Number(precipProb);
  const snowPossible = hasSnowConditions(t, wmoCode);
  const sports = [
    {
      id: 'run',
      icon: '🏃',
      name: 'Bieganie',
      check: () => true,
      score: () => 10 - (t < -10 || t > 38 ? 5 : t < -3 || t > 32 ? 3 : t < 0 || t > 28 ? 1 : 0) - (h > 85 && t > 25 ? 3 : h > 80 ? 1 : 0) - (w > 40 ? 2 : w > 25 ? 1 : 0) - (p > 70 ? 3 : p > 40 ? 1 : 0),
      reasons: () => [t > 35 ? 'ekstremalne upały' : '', t < -5 ? 'bardzo mroźno' : '', h > 85 && t > 25 ? 'wysoka wilgotność' : '', w > 30 ? 'silny wiatr' : '', p > 60 ? 'deszcz' : ''].filter(Boolean),
    },
    {
      id: 'bike',
      icon: '🚴',
      name: 'Kolarstwo',
      check: () => true,
      score: () => 10 - (t < -5 || t > 40 ? 5 : t < 0 || t > 35 ? 3 : t < 5 || t > 30 ? 1 : 0) - (w > 50 ? 4 : w > 35 ? 3 : w > 20 ? 2 : w > 12 ? 1 : 0) - (p > 60 ? 3 : p > 30 ? 1 : 0),
      reasons: () => [w > 25 ? 'silny wiatr' : '', t > 35 ? 'za gorąco' : '', t < 0 ? 'śliska nawierzchnia' : '', p > 50 ? 'deszcz' : ''].filter(Boolean),
    },
    {
      id: 'swim',
      icon: '🏊',
      name: 'Pływanie',
      check: () => true,
      score: () => 10 - (t < 10 ? 4 : t < 18 ? 2 : t > 32 ? 1 : 0) - (p > 80 ? 2 : 0),
      reasons: () => [t < 18 ? 'chłodno na zewnątrz' : '', p > 70 ? 'deszcz lub burze' : ''].filter(Boolean),
    },
    {
      id: 'hike',
      icon: '🥾',
      name: 'Wędrówki',
      check: () => true,
      score: () => 10 - (t < -15 || t > 42 ? 5 : t < -5 || t > 36 ? 3 : t < 0 || t > 30 ? 1 : 0) - (h > 90 && t > 28 ? 3 : h > 80 && t > 25 ? 1 : 0) - (p > 75 ? 4 : p > 50 ? 2 : p > 30 ? 1 : 0) - (w > 55 ? 3 : w > 40 ? 1 : 0),
      reasons: () => [t > 35 && h > 70 ? 'upał i wilgotność' : '', t < -5 ? 'silny mróz' : '', p > 60 ? 'deszcz' : '', w > 40 ? 'silny wiatr' : ''].filter(Boolean),
    },
    {
      id: 'ski',
      icon: '⛷️',
      name: 'Narciarstwo',
      check: () => snowPossible || t <= 5,
      unavailableReason: t > 15 ? 'za ciepło na śnieg' : 'śnieg mało prawdopodobny',
      score: () => 10 - (t > 2 ? 5 : t > -2 ? 2 : t < -25 ? 3 : t < -18 ? 1 : 0) - (w > 70 ? 4 : w > 50 ? 3 : w > 30 ? 1 : 0) - (p > 80 ? 1 : 0),
      reasons: () => [t > 0 ? 'odwilż' : '', t < -20 ? 'ekstremalny mróz' : '', w > 50 ? 'silny wiatr' : '', p > 70 ? 'śnieżyca' : ''].filter(Boolean),
    },
    {
      id: 'golf',
      icon: '⛳',
      name: 'Golf',
      check: () => true,
      score: () => 10 - (t < 5 || t > 38 ? 4 : t < 10 || t > 32 ? 2 : 0) - (h > 90 ? 2 : 0) - (w > 35 ? 3 : w > 20 ? 2 : w > 12 ? 1 : 0) - (p > 50 ? 4 : p > 25 ? 2 : 0),
      reasons: () => [t < 5 ? 'za zimno' : '', t > 35 ? 'upał' : '', p > 40 ? 'deszcz lub burze' : '', w > 20 ? 'wiatr' : ''].filter(Boolean),
    },
  ];

  return sports.map((sport) => {
    if (!sport.check()) {
      return { ...sport, score: 0, label: 'Niedostępne', color: 'var(--muted)', reason: sport.unavailableReason, unavailable: true };
    }
    const score = Math.max(1, Math.min(10, Math.round(sport.score())));
    const label = score >= 9 ? 'Doskonałe' : score >= 7 ? 'Dobre' : score >= 5 ? 'Przeciętne' : score >= 3 ? 'Słabe' : 'Bardzo złe';
    const color = score >= 9 ? 'var(--mild)' : score >= 7 ? 'var(--accent)' : score >= 5 ? 'var(--uv-mod)' : score >= 3 ? 'var(--warm)' : 'var(--hot)';
    return { ...sport, score, label, color, reason: sport.reasons().slice(0, 2).join(', '), unavailable: false };
  });
}

export function buildWeatherAlerts(current, daily) {
  const alerts = [];
  const temp = current?.temperature_2m;
  const wind = current?.wind_speed_10m;
  const code = current?.weather_code;
  const precip = daily?.precipitation_probability_max?.[0] ?? 0;
  const uv = daily?.uv_index_max?.[0] ?? null;
  if (isSevereCode(code)) alerts.push({ level: 'high', label: 'Ostre zjawiska', text: 'Kod pogody wskazuje burzę, silne opady albo śnieg.' });
  if (wind >= 50) alerts.push({ level: 'high', label: 'Silny wiatr', text: `Wiatr około ${Math.round(wind)} km/h.` });
  if (precip >= 70) alerts.push({ level: 'medium', label: 'Wysokie ryzyko opadów', text: `Prawdopodobieństwo opadów ${Math.round(precip)}%.` });
  if (uv >= 8) alerts.push({ level: 'medium', label: 'Wysokie UV', text: `Indeks UV ${Number(uv).toFixed(1)}.` });
  if (temp >= 32) alerts.push({ level: 'medium', label: 'Upał', text: `Temperatura około ${Math.round(temp)}°C.` });
  if (temp <= -10) alerts.push({ level: 'medium', label: 'Silny mróz', text: `Temperatura około ${Math.round(temp)}°C.` });
  return alerts;
}

export function recommendClothing(current, daily) {
  const temp = Number(current?.apparent_temperature ?? current?.temperature_2m);
  const precip = Number(daily?.precipitation_probability_max?.[0] ?? 0);
  const wind = Number(current?.wind_speed_10m ?? 0);
  const parts = [];
  if (temp < -5) parts.push('kurtka zimowa', 'czapka', 'rękawiczki');
  else if (temp < 5) parts.push('ciepła kurtka', 'warstwa termiczna');
  else if (temp < 14) parts.push('lekka kurtka', 'długi rękaw');
  else if (temp < 24) parts.push('lekka bluza');
  else parts.push('lekka odzież');
  if (precip > 40) parts.push('parasol lub kurtka przeciwdeszczowa');
  if (wind > 35) parts.push('wiatroodporna warstwa');
  return parts.join(', ');
}
