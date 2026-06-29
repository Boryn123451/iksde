import { appState } from '../../state/appState.js';
import { cssColor } from '../../utils/colorUtils.js';
import { cloudColor, precipColor, tempColor, windColor } from '../../utils/colorScales.js';
import { temperature, temperatureUnit, windSpeed, windUnit } from '../../utils/unitUtils.js';
import { getWmoIcon } from '../../utils/weatherCodeUtils.js';
import { createDeclutter } from './mapDeclutter.js';
import { latLonToXY } from './mapProjection.js';

function layerValue(point) {
  if (appState.map.layer === 'precip') return `${Number(point.precip ?? 0).toFixed(1)} mm`;
  if (appState.map.layer === 'wind') return `${windSpeed(point.wind, appState.unitSystem)} ${windUnit(appState.unitSystem)}`;
  if (appState.map.layer === 'cloud') return `${Math.round(point.cloud ?? 0)}%`;
  return `${temperature(point.temp, appState.unitSystem, 0)}${temperatureUnit(appState.unitSystem)}`;
}

function pointColor(point) {
  if (appState.map.layer === 'precip') return precipColor(point.precip);
  if (appState.map.layer === 'wind') return windColor(point.wind);
  if (appState.map.layer === 'cloud') return cloudColor(point.cloud);
  return tempColor(point.temp);
}

function translucent(color, alpha) {
  if (color.startsWith('#') && color.length === 7) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  if (color.startsWith('rgba(')) return color.replace(/[\d.]+\)$/u, `${alpha})`);
  return color;
}

function isLightMode() {
  return typeof document !== 'undefined' && document.body?.classList.contains('light');
}

function labelBudgetFor(width, zoom) {
  const mobile = width < 620;
  if (mobile) {
    if (zoom < 3) return 3;
    if (zoom < 5.8) return 5;
    if (zoom < 8) return 7;
    return 10;
  }
  if (zoom < 3) return 7;
  if (zoom < 5) return 11;
  if (zoom < 8) return 15;
  return 20;
}

export function drawWeatherOverlay(ctx, points, width, height) {
  const visible = points;
  const layer = appState.map.layer;
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  visible.forEach((point) => {
    const { x, y } = latLonToXY(point.lat, point.lon, width, height);
    if (x < -100 || x > width + 100 || y < -100 || y > height + 100) return;
    const radius = point.isCurrent ? 76 : layer === 'temp' ? 52 : 40;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
    const base = pointColor(point);
    grad.addColorStop(0, layer === 'temp' ? translucent(base, isLightMode() ? .18 : .24) : translucent(base, isLightMode() ? .2 : .26));
    grad.addColorStop(.48, layer === 'temp' ? translucent(base, isLightMode() ? .08 : .1) : translucent(base, .1));
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function drawWindArrow(ctx, x, y, deg, color) {
  if (!Number.isFinite(Number(deg))) return;
  const angle = (Number(deg) - 90) * Math.PI / 180;
  const len = 16;
  const x2 = x + Math.cos(angle) * len;
  const y2 = y + Math.sin(angle) * len;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x2, y2, 2, 0, Math.PI * 2);
  ctx.fill();
}

export function drawWeatherPoints(ctx, points, width, height) {
  const visible = points
    .map((point) => ({ ...point, screen: latLonToXY(point.lat, point.lon, width, height) }))
    .filter((point) => point.screen.x > -60 && point.screen.x < width + 60 && point.screen.y > -60 && point.screen.y < height + 60)
    .sort((a, b) => (b.isCurrent - a.isCurrent) || (a.labelRank || 99) - (b.labelRank || 99));
  const declutter = createDeclutter(reservedBoxes(width, height));
  const labelBudget = labelBudgetFor(width, appState.map.zoom);
  const light = isLightMode();

  ctx.save();
  visible.forEach((point) => {
    const { x, y } = point.screen;
    const color = cssColor(pointColor(point));
    const radius = point.isCurrent ? 9.5 : 5.5;
    if (point.isCurrent) {
      ctx.beginPath();
      ctx.arc(x, y, 18, 0, Math.PI * 2);
      ctx.strokeStyle = cssColor('var(--accent)');
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.beginPath();
    ctx.arc(x, y, radius + 4, 0, Math.PI * 2);
    ctx.fillStyle = light ? 'rgba(255,255,255,.72)' : 'rgba(0,0,0,.58)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = point.isCurrent ? 2.4 : 1.2;
    ctx.strokeStyle = point.isCurrent ? '#fff' : light ? 'rgba(15,23,42,.86)' : 'rgba(255,255,255,.78)';
    ctx.stroke();
    if (appState.map.layer === 'wind') drawWindArrow(ctx, x + 9, y - 2, point.windDir, color);

    const showLabel = point.isCurrent || point.labelRank <= labelBudget;
    if (!showLabel) return;
    const icon = getWmoIcon(point.code, point.isDay).icon;
    const value = layerValue(point);
    const name = point.name;
    const country = point.country || point.countryCode || '';
    const topLine = `${icon} ${value}`;
    const bottomLine = country ? `${name} · ${country}` : name;
    ctx.font = '11px "IBM Plex Mono", monospace';
    const labelW = Math.max(ctx.measureText(bottomLine).width, ctx.measureText(topLine).width) + 20;
    let box = findLabelBox({ x, y, labelW, labelH: 42, width, height, declutter });
    if (!box && point.isCurrent) box = clampBox({ x: x + 13, y: y - 21, w: labelW, h: 42 }, width, height);
    if (!box) return;
    declutter.place(box);
    ctx.fillStyle = light ? 'rgba(255,255,255,.94)' : 'rgba(3,7,12,.88)';
    ctx.strokeStyle = point.isCurrent ? cssColor('var(--accent)') : 'rgba(125,133,144,.38)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(box.x, box.y, box.w, box.h, 6);
    ctx.fill();
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = light ? '#0f172a' : '#fff';
    ctx.font = '11px "IBM Plex Mono", monospace';
    ctx.fillText(topLine, box.x + box.w / 2, box.y + 5);
    ctx.fillStyle = light ? 'rgba(15,23,42,.82)' : 'rgba(230,237,243,.88)';
    ctx.font = '10px "IBM Plex Mono", monospace';
    ctx.fillText(bottomLine, box.x + box.w / 2, box.y + 23);
  });
  ctx.restore();
}

export function findNearestPoint(points, width, height, px, py) {
  let nearest = null;
  let nearestDistance = 24;
  points.forEach((point) => {
    const { x, y } = latLonToXY(point.lat, point.lon, width, height);
    const distance = Math.hypot(px - x, py - y);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = point;
    }
  });
  return nearest;
}

export function mapPointSummary(point) {
  return {
    value: layerValue(point),
    color: pointColor(point),
  };
}

function reservedBoxes(width, height) {
  return [
    { x: 8, y: 8, w: 132, h: 32 },
    { x: Math.max(142, width - 184), y: 8, w: 176, h: 34 },
    { x: 8, y: height - 44, w: Math.min(260, width - 70), h: 38 },
    { x: width - 54, y: height - 104, w: 48, h: 98 },
  ];
}

function clampBox(box, width, height) {
  return {
    x: Math.max(6, Math.min(width - box.w - 6, box.x)),
    y: Math.max(44, Math.min(height - box.h - 46, box.y)),
    w: box.w,
    h: box.h,
  };
}

function findLabelBox({ x, y, labelW, labelH, width, height, declutter }) {
  const raw = [
    { x: x + 13, y: y - labelH / 2, w: labelW, h: labelH },
    { x: x - labelW - 13, y: y - labelH / 2, w: labelW, h: labelH },
    { x: x - labelW / 2, y: y + 14, w: labelW, h: labelH },
    { x: x - labelW / 2, y: y - labelH - 14, w: labelW, h: labelH },
  ].map((box) => clampBox(box, width, height));
  return raw.find((box) => declutter.canPlace(box, 3)) || null;
}
