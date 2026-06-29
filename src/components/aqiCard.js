import { byId, setText, setWidthPercent, show } from '../utils/domUtils.js';

function aqiStyle(aqi) {
  if (aqi <= 40) return { color: 'var(--aqi-good)', label: 'Dobra' };
  if (aqi <= 60) return { color: 'var(--aqi-fair)', label: 'Umiarkowana' };
  if (aqi <= 80) return { color: 'var(--aqi-mod)', label: 'Zła' };
  if (aqi <= 100) return { color: 'var(--aqi-poor)', label: 'Bardzo zła' };
  return { color: 'var(--aqi-very-poor)', label: 'Ekstremalnie zła' };
}

function setComponent(id, barId, value, maxValue) {
  setText(id, value != null ? Number(value).toFixed(1) : '—');
  if (value != null) setWidthPercent(barId, Math.min(Number(value) / maxValue * 100, 100));
}

export function renderAQI(data) {
  const current = data?.current;
  const aqi = current?.european_aqi;
  if (aqi == null) return;
  show('aqiCard');
  const style = aqiStyle(Number(aqi));
  setText('aqiValue', Math.round(Number(aqi)));
  setText('aqiLabel', style.label);
  const value = byId('aqiValue');
  if (value) value.style.color = style.color;
  const fill = byId('aqiGaugeFill');
  if (fill) {
    fill.style.stroke = style.color;
    fill.style.strokeDashoffset = String(157 - 157 * Math.min(Number(aqi) / 200, 1));
  }
  setComponent('aqiPM25', 'aqiPM25bar', current.pm2_5, 75);
  setComponent('aqiPM10', 'aqiPM10bar', current.pm10, 150);
  setComponent('aqiNO2', 'aqiNO2bar', current.nitrogen_dioxide, 200);
  setComponent('aqiO3', 'aqiO3bar', current.ozone, 240);
}
