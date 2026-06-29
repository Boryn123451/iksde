import { appState } from '../../state/appState.js';

export function mercPx(lat, lon, z) {
  const n = 256 * 2 ** z;
  const x = (lon + 180) / 360 * n;
  const clippedLat = Math.max(-85, Math.min(85, lat));
  const sinLat = Math.sin(clippedLat * Math.PI / 180);
  const y = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * n;
  return { wx: x, wy: y };
}

export function worldToCanvas(wx, wy, width, height) {
  const center = mercPx(appState.map.centerLat, appState.map.centerLon, appState.map.tileZ);
  return { x: width / 2 + (wx - center.wx), y: height / 2 + (wy - center.wy) };
}

export function latLonToXY(lat, lon, width, height) {
  const pos = mercPx(lat, lon, appState.map.tileZ);
  return worldToCanvas(pos.wx, pos.wy, width, height);
}

export function xyToLatLon(px, py, width, height) {
  const z = appState.map.tileZ;
  const center = mercPx(appState.map.centerLat, appState.map.centerLon, z);
  const wx = center.wx + (px - width / 2);
  const wy = center.wy + (py - height / 2);
  const n = 256 * 2 ** z;
  return {
    lon: wx / n * 360 - 180,
    lat: Math.atan(Math.sinh(Math.PI * (1 - 2 * wy / n))) * 180 / Math.PI,
  };
}
