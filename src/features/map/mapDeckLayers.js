import { ScatterplotLayer, TextLayer } from '@deck.gl/layers';
import { cloudColor, precipColor, tempColor, windColor } from '../../utils/colorScales.js';
import { temperature, temperatureUnit, windSpeed, windUnit } from '../../utils/unitUtils.js';
import { getWmoIcon } from '../../utils/weatherCodeUtils.js';

function finite(value) {
  return Number.isFinite(Number(value));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function parseColor(color, alpha = 255) {
  if (Array.isArray(color)) return color;
  const raw = String(color || '').trim();
  if (raw.startsWith('#') && raw.length === 7) {
    return [
      parseInt(raw.slice(1, 3), 16),
      parseInt(raw.slice(3, 5), 16),
      parseInt(raw.slice(5, 7), 16),
      alpha,
    ];
  }
  const match = raw.match(/rgba?\(([^)]+)\)/u);
  if (match) {
    const parts = match[1].split(',').map((item) => Number(item.trim()));
    return [
      clamp(parts[0] || 0, 0, 255),
      clamp(parts[1] || 0, 0, 255),
      clamp(parts[2] || 0, 0, 255),
      parts[3] === undefined ? alpha : clamp(Math.round(parts[3] * 255), 0, 255),
    ];
  }
  return [120, 135, 150, alpha];
}

function layerColor(point, layer, alpha = 230) {
  if (layer === 'precip' || layer === 'radar') return parseColor(precipColor(point.precip), alpha);
  if (layer === 'wind') return parseColor(windColor(point.wind), alpha);
  if (layer === 'cloud') return parseColor(cloudColor(point.cloud), alpha);
  return parseColor(tempColor(point.temp), alpha);
}

export function weatherLayerValue(point, layer, unitSystem) {
  if (point?.hasWeather === false) return 'Brak danych';
  if (layer === 'precip' || layer === 'radar') return `${Number(point.precip ?? 0).toFixed(1)} mm`;
  if (layer === 'wind') return `${windSpeed(point.wind, unitSystem)} ${windUnit(unitSystem)}`;
  if (layer === 'cloud') return `${Math.round(Number(point.cloud ?? 0))}%`;
  return `${temperature(point.temp, unitSystem, 0)}${temperatureUnit(unitSystem)}`;
}

function windArrow(deg) {
  if (!finite(deg)) return '';
  const arrows = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];
  return arrows[Math.round(Number(deg) / 45) % arrows.length];
}

export function buildWeatherDeckLayers({ points, labels, layer, unitSystem, theme, zoom, onClick, onHover }) {
  const dark = theme !== 'light';
  const layers = [];

  if (layer !== 'radar') {
    layers.push(new ScatterplotLayer({
      id: 'weather-city-points',
      data: points,
      getPosition: (point) => [Number(point.lon), Number(point.lat)],
      radiusUnits: 'pixels',
      getRadius: (point) => point.isCurrent ? 12 : zoom >= 8 ? 6 : 7.5,
      stroked: false,
      filled: true,
      getFillColor: (point) => layerColor(point, layer, point.isCurrent ? 245 : 222),
      lineWidthUnits: 'pixels',
      getLineWidth: 0,
      pickable: true,
      autoHighlight: true,
      highlightColor: dark ? [255, 255, 255, 44] : [15, 23, 42, 34],
      onClick,
      onHover,
      updateTriggers: { getFillColor: [layer, theme], getRadius: zoom },
      parameters: { depthTest: false },
    }));
  }

  if (layer === 'wind') {
    layers.push(new TextLayer({
      id: 'weather-wind-arrows',
      data: points.filter((point) => finite(point.windDir)),
      getPosition: (point) => [Number(point.lon), Number(point.lat)],
      getText: (point) => windArrow(point.windDir),
      getPixelOffset: [14, -7],
      getSize: 18,
      getColor: (point) => layerColor(point, layer, 235),
      fontFamily: '"IBM Plex Mono", monospace',
      pickable: false,
      parameters: { depthTest: false },
    }));
  }

  layers.push(new TextLayer({
    id: 'weather-city-labels',
    data: labels,
    getPosition: (point) => [Number(point.lon), Number(point.lat)],
    getText: (point) => point.labelText,
    getPixelOffset: (point) => point.pixelOffset,
    getSize: (point) => point.isCurrent ? 11 : 10,
    getColor: () => dark ? [241, 245, 249, 245] : [15, 23, 42, 245],
    background: true,
    getBackgroundColor: (point) => point.isCurrent
      ? dark ? [11, 27, 46, 238] : [219, 234, 254, 245]
      : dark ? [3, 7, 12, 218] : [255, 255, 255, 232],
    getBorderColor: (point) => point.isCurrent
      ? dark ? [88, 166, 255, 235] : [3, 105, 161, 235]
      : dark ? [125, 133, 144, 112] : [15, 23, 42, 84],
    getBorderWidth: (point) => point.isCurrent ? 1.4 : .8,
    backgroundPadding: [7, 5],
    backgroundBorderRadius: 6,
    fontFamily: '"IBM Plex Mono", monospace',
    lineHeight: 1.08,
    characterSet: 'auto',
    pickable: true,
    onClick,
    onHover,
    updateTriggers: { getText: [layer, unitSystem], getBackgroundColor: theme },
    parameters: { depthTest: false },
  }));

  return layers;
}

export function labelText(point, layer, unitSystem) {
  if (point?.hasWeather === false) return point.name || 'Lokalizacja';
  const weather = getWmoIcon(point.code, point.isDay).icon;
  const value = weatherLayerValue(point, layer, unitSystem);
  const name = point.name || 'Lokalizacja';
  return `${weather} ${value}\n${name}`;
}
