function penalty(value, rules) {
  for (const [check, cost, reason] of rules) {
    if (check(value)) return { cost, reason };
  }
  return { cost: 0, reason: '' };
}

export function comfortBand(score) {
  if (score <= 30) return { label: 'słabo', color: 'var(--hot)' };
  if (score <= 55) return { label: 'średnio', color: 'var(--warm)' };
  if (score <= 75) return { label: 'dobrze', color: 'var(--accent)' };
  return { label: 'bardzo dobrze', color: 'var(--mild)' };
}

export function calculateComfortIndex(current, daily, aqiData) {
  let score = 100;
  const reasons = [];
  const temp = Number(current?.temperature_2m);
  const feels = Number(current?.apparent_temperature ?? temp);
  const hum = Number(current?.relative_humidity_2m ?? 50);
  const wind = Number(current?.wind_speed_10m ?? 0);
  const precip = Number(daily?.precipitation_probability_max?.[0] ?? current?.precipitation ?? 0);
  const uv = Number(daily?.uv_index_max?.[0] ?? 0);
  const aqi = Number(aqiData?.current?.european_aqi ?? NaN);

  [
    penalty(feels, [
      [(v) => v <= -10 || v >= 35, 26, 'skrajna temperatura odczuwalna'],
      [(v) => v <= -3 || v >= 30, 16, 'trudna temperatura odczuwalna'],
      [(v) => v <= 5 || v >= 26, 8, 'temperatura poza komfortem'],
    ]),
    penalty(Math.abs(feels - temp), [
      [(v) => v >= 8, 10, 'duża różnica odczuwalnej'],
      [(v) => v >= 4, 5, 'odczuwalna różni się od realnej'],
    ]),
    penalty(hum, [
      [(v) => v >= 90 || v <= 20, 12, 'wilgotność poza komfortem'],
      [(v) => v >= 75 || v <= 30, 6, 'wilgotność obniża komfort'],
    ]),
    penalty(wind, [
      [(v) => v >= 60, 18, 'bardzo silny wiatr'],
      [(v) => v >= 40, 10, 'silny wiatr'],
      [(v) => v >= 25, 5, 'odczuwalny wiatr'],
    ]),
    penalty(precip, [
      [(v) => v >= 80, 16, 'wysokie ryzyko opadów'],
      [(v) => v >= 50, 9, 'możliwe opady'],
      [(v) => v >= 25, 4, 'niewielkie ryzyko opadów'],
    ]),
    penalty(uv, [
      [(v) => v >= 8, 10, 'wysokie UV'],
      [(v) => v >= 6, 6, 'podwyższone UV'],
    ]),
    Number.isFinite(aqi) ? penalty(aqi, [
      [(v) => v >= 100, 16, 'bardzo zła jakość powietrza'],
      [(v) => v >= 80, 10, 'zła jakość powietrza'],
      [(v) => v >= 60, 5, 'umiarkowana jakość powietrza'],
    ]) : { cost: 0, reason: '' },
  ].forEach((item) => {
    score -= item.cost;
    if (item.reason) reasons.push(item.reason);
  });

  score = Math.max(0, Math.min(100, Math.round(score)));
  return { score, ...comfortBand(score), reasons: reasons.slice(0, 3) };
}
