import { appState } from '../state/appState.js';
import { $$, byId } from '../utils/domUtils.js';
import { fmtDay, fmtHour, localHourKey } from '../utils/dateUtils.js';
import { isImperial, precipitationUnit, temperatureUnit, temperatureValue, windUnit } from '../utils/unitUtils.js';
import { cssColor } from '../utils/colorUtils.js';

function canvasSize(canvas, logicalHeight = 220) {
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.offsetWidth || canvas.parentElement?.offsetWidth || 320;
  const height = window.matchMedia('(max-width: 600px)').matches ? 160 : logicalHeight;
  canvas.width = Math.max(1, Math.floor(width * dpr));
  canvas.height = Math.max(1, Math.floor(height * dpr));
  canvas.style.height = `${height}px`;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, width, height };
}

function getArrays(data) {
  const mode = appState.chart.mode;
  const range = appState.chart.range;
  const unit = appState.unitSystem;
  const labels = [];
  const values = [];
  const values2 = [];
  const hourly = data.hourly || {};
  const daily = data.daily || {};

  if (range === '7days') {
    daily.time?.forEach((date, i) => {
      labels.push(fmtDay(date));
      if (mode === 'precip') values.push(convertPrecip(daily.precipitation_sum?.[i] ?? 0, unit));
      else if (mode === 'wind') values.push(convertWind(daily.wind_speed_10m_max?.[i] ?? 0, unit));
      else {
        values.push(temperatureValue(daily.temperature_2m_max?.[i] ?? null, unit));
        values2.push(temperatureValue(daily.temperature_2m_min?.[i] ?? null, unit));
      }
    });
  } else {
    const nowHour = localHourKey(appState.location.timezone);
    let start = hourly.time?.findIndex((time) => String(time).slice(0, 13) >= nowHour) ?? 0;
    if (start < 0) start = 0;
    (hourly.time || []).slice(start, start + 24).forEach((time, offset) => {
      const i = start + offset;
      labels.push(fmtHour(time));
      if (mode === 'precip') values.push(hourly.precipitation_probability?.[i] ?? 0);
      else if (mode === 'wind') values.push(convertWind(hourly.wind_speed_10m?.[i] ?? 0, unit));
      else values.push(temperatureValue(hourly.temperature_2m?.[i] ?? null, unit));
    });
  }

  const label = mode === 'precip' ? `Opady (${range === '7days' ? precipitationUnit(unit) : '%'})` : mode === 'wind' ? `Wiatr (${windUnit(unit)})` : `Temperatura (${temperatureUnit(unit)})`;
  return { labels, values, values2, label };
}

function convertWind(kmh, unitSystem) {
  if (kmh === null || kmh === undefined || Number.isNaN(Number(kmh))) return null;
  return isImperial(unitSystem) ? Number(kmh) * 0.621371 : Number(kmh);
}

function convertPrecip(mm, unitSystem) {
  if (mm === null || mm === undefined || Number.isNaN(Number(mm))) return null;
  return isImperial(unitSystem) ? Number(mm) * 0.0393701 : Number(mm);
}

function chartScale(values, values2) {
  const allValues = [...values, ...values2].filter((value) => value !== null && value !== undefined && Number.isFinite(Number(value)));
  if (!allValues.length) return null;
  if (appState.chart.mode === 'precip' && appState.chart.range === '24h') {
    return { min: 0, max: 100, ticks: [100, 75, 50, 25, 0], emptyText: allValues.every((value) => Number(value) === 0) ? 'Brak opadów w wybranym okresie.' : '' };
  }
  if (appState.chart.mode === 'precip') {
    const maxValue = Math.max(...allValues);
    return { min: 0, max: maxValue > 0 ? maxValue * 1.18 : 1, ticks: null, emptyText: maxValue > 0 ? '' : 'Brak opadów.' };
  }
  let min = Math.min(...allValues);
  let max = Math.max(...allValues);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const range = max - min;
  return { min: min - range * 0.12, max: max + range * 0.12, ticks: null, emptyText: '' };
}

function drawLine(ctx, points, color, fillColor, toX, toY, height, pad) {
  const valid = points.map((value, i) => ({ value, i })).filter((point) => point.value !== null && point.value !== undefined && Number.isFinite(Number(point.value)));
  if (!valid.length) return;
  ctx.beginPath();
  valid.forEach((point, index) => {
    const x = toX(point.i);
    const y = toY(point.value);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  if (fillColor && valid.length > 1) {
    ctx.lineTo(toX(valid.at(-1).i), height - pad.bottom);
    ctx.lineTo(toX(valid[0].i), height - pad.bottom);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();
  }
  ctx.beginPath();
  valid.forEach((point, index) => {
    const x = toX(point.i);
    const y = toY(point.value);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = cssColor(color);
  ctx.lineWidth = 2;
  ctx.stroke();
  valid.forEach((point) => {
    ctx.beginPath();
    ctx.arc(toX(point.i), toY(point.value), 3, 0, Math.PI * 2);
    ctx.fillStyle = cssColor(color);
    ctx.fill();
  });
}

export function renderChart(data = appState.weather) {
  const canvas = byId('chartCanvas');
  if (!canvas || !data) return;
  appState.chart.lastData = data;
  const { ctx, width, height } = canvasSize(canvas);
  const { labels, values, values2, label } = getArrays(data);
  ctx.clearRect(0, 0, width, height);
  if (!labels.length || !values.length) return;

  const pad = { left: 38, right: 16, top: 18, bottom: 34 };
  const scale = chartScale(values, values2);
  if (!scale) return;
  const { min, max } = scale;

  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;
  const toX = (i) => pad.left + (labels.length <= 1 ? 0 : (i / (labels.length - 1)) * chartW);
  const toY = (value) => pad.top + (1 - (Number(value) - min) / (max - min)) * chartH;

  ctx.strokeStyle = 'rgba(125,133,144,.22)';
  ctx.lineWidth = 1;
  ctx.fillStyle = cssColor('var(--muted)');
  ctx.font = '10px "IBM Plex Mono", monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let i = 0; i <= 4; i += 1) {
    const y = pad.top + (i / 4) * chartH;
    const value = scale.ticks ? scale.ticks[i] : max - (i / 4) * (max - min);
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(width - pad.right, y);
    ctx.stroke();
    ctx.fillText(Math.round(value), pad.left - 7, y);
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  labels.forEach((item, i) => {
    if (i % Math.ceil(labels.length / 8) === 0 || i === labels.length - 1) {
      ctx.fillText(item, toX(i), height - pad.bottom + 12);
    }
  });

  const color = appState.chart.mode === 'precip' ? 'var(--rain)' : appState.chart.mode === 'wind' ? 'var(--accent)' : 'var(--mild)';
  drawLine(ctx, values, color, appState.chart.mode === 'precip' ? 'rgba(56,139,253,.12)' : 'rgba(88,166,255,.10)', toX, toY, height, pad);
  if (values2.length) drawLine(ctx, values2, 'var(--cold)', null, toX, toY, height, pad);
  if (scale.emptyText) {
    ctx.fillStyle = cssColor('var(--muted)');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '12px "IBM Plex Mono", monospace';
    ctx.fillText(scale.emptyText, pad.left + chartW / 2, pad.top + chartH / 2);
  }

  ctx.fillStyle = cssColor('var(--text)');
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = '11px "IBM Plex Mono", monospace';
  ctx.fillText(label, pad.left, 4);
}

function showTooltip(data, clientX) {
  const canvas = byId('chartCanvas');
  const tooltip = byId('chartTooltip');
  if (!canvas || !tooltip) return;
  const { labels, values, values2 } = getArrays(data);
  if (!labels.length) return;
  const rect = canvas.getBoundingClientRect();
  const width = rect.width;
  const pad = { left: 38, right: 16 };
  const chartW = width - pad.left - pad.right;
  const mx = clientX - rect.left;
  const rawIdx = ((mx - pad.left) / chartW) * (labels.length - 1);
  const idx = Math.max(0, Math.min(labels.length - 1, Math.round(rawIdx)));
  const suffix = appState.chart.mode === 'precip' ? (appState.chart.range === '7days' ? precipitationUnit(appState.unitSystem) : '%') : appState.chart.mode === 'wind' ? windUnit(appState.unitSystem) : temperatureUnit(appState.unitSystem);
  const formatted = Number.isFinite(Number(values[idx]))
    ? Number(values[idx]).toFixed(appState.chart.mode === 'precip' && appState.chart.range === '24h' ? 0 : 1)
    : '—';
  const formattedMin = Number.isFinite(Number(values2[idx])) ? Number(values2[idx]).toFixed(1) : '—';
  tooltip.replaceChildren(
    document.createTextNode(`${labels[idx]}: ${formatted}${suffix}`),
    values2[idx] !== undefined ? document.createElement('br') : '',
    values2[idx] !== undefined ? document.createTextNode(`min: ${formattedMin}${suffix}`) : '',
  );
  tooltip.style.opacity = '1';
  tooltip.style.left = `${Math.min(mx + 12, width - 130)}px`;
  tooltip.style.top = '20px';
}

export function setupChartTooltip() {
  const canvas = byId('chartCanvas');
  const tooltip = byId('chartTooltip');
  if (!canvas || !tooltip) return;
  canvas.addEventListener('mousemove', (event) => showTooltip(appState.chart.lastData, event.clientX));
  canvas.addEventListener('mouseleave', () => {
    tooltip.style.opacity = '0';
    renderChart(appState.chart.lastData);
  });
  canvas.addEventListener('touchstart', (event) => {
    event.preventDefault();
    showTooltip(appState.chart.lastData, event.touches[0].clientX);
  }, { passive: false });
  canvas.addEventListener('touchmove', (event) => {
    event.preventDefault();
    showTooltip(appState.chart.lastData, event.touches[0].clientX);
  }, { passive: false });
  canvas.addEventListener('touchend', () => {
    window.setTimeout(() => {
      tooltip.style.opacity = '0';
      renderChart(appState.chart.lastData);
    }, 1200);
  });
}

export function setupChartControls({ onChange } = {}) {
  $$('#chartModeBtns .chart-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      appState.chart.mode = btn.dataset.mode || 'temp';
      $$('#chartModeBtns .chart-btn').forEach((item) => item.classList.toggle('active', item === btn));
      renderChart(appState.weather);
      onChange?.();
    });
  });
  $$('#chartRangeBtns .chart-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      appState.chart.range = btn.dataset.range || '24h';
      $$('#chartRangeBtns .chart-btn').forEach((item) => item.classList.toggle('active', item === btn));
      renderChart(appState.weather);
      onChange?.();
    });
  });
  setupChartTooltip();
}
