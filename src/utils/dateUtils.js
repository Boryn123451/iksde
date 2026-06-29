function partsFor(date, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: timeZone || 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  return Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
}

export function localDateKey(timeZone, date = new Date()) {
  const p = partsFor(date, timeZone);
  return `${p.year}-${p.month}-${p.day}`;
}

export function localHourKey(timeZone, date = new Date()) {
  const p = partsFor(date, timeZone);
  return `${p.year}-${p.month}-${p.day}T${p.hour}`;
}

export function localMinutesOfDay(timeZone, date = new Date()) {
  const p = partsFor(date, timeZone);
  return Number(p.hour) * 60 + Number(p.minute);
}

export function localDateOffsetKey(timeZone, offsetDays, date = new Date()) {
  const shifted = new Date(date.getTime() + offsetDays * 24 * 60 * 60 * 1000);
  return localDateKey(timeZone, shifted);
}

export function fmtDay(isoDate) {
  if (!isoDate) return '—';
  const d = new Date(`${isoDate}T12:00:00`);
  return d.toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function fmtHour(isoDateTime) {
  return typeof isoDateTime === 'string' ? isoDateTime.slice(11, 16) : '—';
}

export function fmtDateTime(isoDateTime) {
  if (!isoDateTime) return '—';
  return `${fmtDay(isoDateTime.slice(0, 10))}, ${fmtHour(isoDateTime)}`;
}

export function timeToMinutes(value) {
  if (!value || typeof value !== 'string') return null;
  const match = value.match(/(\d{2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function dayLengthLabel(sunrise, sunset) {
  const rise = timeToMinutes(sunrise?.slice(11, 16) || sunrise);
  const set = timeToMinutes(sunset?.slice(11, 16) || sunset);
  if (rise === null || set === null || set < rise) return '—';
  const minutes = set - rise;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export function addMinutesToTime(time, minutes) {
  const base = timeToMinutes(time);
  if (base === null) return '—';
  const next = (base + minutes + 1440) % 1440;
  const h = String(Math.floor(next / 60)).padStart(2, '0');
  const m = String(next % 60).padStart(2, '0');
  return `${h}:${m}`;
}
