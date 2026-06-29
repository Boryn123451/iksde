export function isImperial(unitSystem) {
  return unitSystem === 'imperial';
}

export function temperature(celsius, unitSystem, digits = 1) {
  if (celsius === null || celsius === undefined || Number.isNaN(Number(celsius))) return '—';
  const value = isImperial(unitSystem) ? Number(celsius) * 9 / 5 + 32 : Number(celsius);
  return value.toFixed(digits);
}

export function temperatureValue(celsius, unitSystem) {
  if (celsius === null || celsius === undefined || Number.isNaN(Number(celsius))) return null;
  return isImperial(unitSystem) ? Number(celsius) * 9 / 5 + 32 : Number(celsius);
}

export function temperatureDeltaValue(deltaCelsius, unitSystem) {
  if (deltaCelsius === null || deltaCelsius === undefined || Number.isNaN(Number(deltaCelsius))) return null;
  return isImperial(unitSystem) ? Number(deltaCelsius) * 9 / 5 : Number(deltaCelsius);
}

export function formatTemperature(celsius, unitSystem, digits = 1) {
  const value = temperatureValue(celsius, unitSystem);
  return value === null ? 'â€”' : `${value.toFixed(digits)}${temperatureUnit(unitSystem)}`;
}

export function formatTemperatureDelta(deltaCelsius, unitSystem, digits = 1) {
  const value = temperatureDeltaValue(deltaCelsius, unitSystem);
  if (value === null) return 'â€”';
  return `${value >= 0 ? '+' : ''}${value.toFixed(digits)}${temperatureUnit(unitSystem)}`;
}

export function formatTemperatureUnit(unitSystem) {
  return temperatureUnit(unitSystem);
}

export function temperatureRound(celsius, unitSystem) {
  if (celsius === null || celsius === undefined || Number.isNaN(Number(celsius))) return '—';
  return String(Math.round(isImperial(unitSystem) ? Number(celsius) * 9 / 5 + 32 : Number(celsius)));
}

export function temperatureUnit(unitSystem) {
  return isImperial(unitSystem) ? '°F' : '°C';
}

export function windSpeed(kmh, unitSystem) {
  if (kmh === null || kmh === undefined || Number.isNaN(Number(kmh))) return '—';
  return isImperial(unitSystem) ? (Number(kmh) * 0.621371).toFixed(1) : String(Math.round(Number(kmh)));
}

export function windUnit(unitSystem) {
  return isImperial(unitSystem) ? 'mph' : 'km/h';
}

export function pressure(hpa, unitSystem) {
  if (hpa === null || hpa === undefined || Number.isNaN(Number(hpa))) return '—';
  return isImperial(unitSystem) ? (Number(hpa) * 0.02953).toFixed(2) : String(Math.round(Number(hpa)));
}

export function pressureUnit(unitSystem) {
  return isImperial(unitSystem) ? 'inHg' : 'hPa';
}

export function precipitation(mm, unitSystem) {
  if (mm === null || mm === undefined || Number.isNaN(Number(mm))) return '—';
  return isImperial(unitSystem) ? (Number(mm) * 0.0393701).toFixed(2) : Number(mm).toFixed(1);
}

export function precipitationUnit(unitSystem) {
  return isImperial(unitSystem) ? 'in' : 'mm';
}

export function visibility(km, unitSystem) {
  if (km === null || km === undefined || Number.isNaN(Number(km))) return '—';
  return isImperial(unitSystem) ? (Number(km) * 0.621371).toFixed(1) : Number(km).toFixed(1);
}

export function visibilityUnit(unitSystem) {
  return isImperial(unitSystem) ? 'mi' : 'km';
}

export function waveHeight(meters, unitSystem) {
  if (meters === null || meters === undefined || Number.isNaN(Number(meters))) return '—';
  return isImperial(unitSystem) ? (Number(meters) * 3.28084).toFixed(1) : Number(meters).toFixed(1);
}

export function waveUnit(unitSystem) {
  return isImperial(unitSystem) ? 'ft' : 'm';
}

export function getTempColor(celsius) {
  if (celsius === null || celsius === undefined || Number.isNaN(Number(celsius))) return 'var(--muted)';
  const value = Number(celsius);
  if (value < 0) return 'var(--cold)';
  if (value < 10) return 'var(--cool)';
  if (value < 20) return 'var(--mild)';
  if (value < 28) return 'var(--warm)';
  return 'var(--hot)';
}
