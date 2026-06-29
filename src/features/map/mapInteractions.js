import { appState } from '../../state/appState.js';
import { TILE_PROVIDER } from '../../config/constants.js';
import { byId, clear, createEl } from '../../utils/domUtils.js';
import { normalizeCountryCode } from '../../utils/countryUtils.js';
import { getWmoIcon } from '../../utils/weatherCodeUtils.js';
import { temperature, temperatureUnit, windSpeed, windUnit } from '../../utils/unitUtils.js';
import { findNearestPoint } from './mapOverlay.js';
import { canvasMetrics } from './mapRenderer.js';
import { xyToLatLon } from './mapProjection.js';

function clampZoom(value) {
  return Math.max(TILE_PROVIDER.minZoom, Math.min(TILE_PROVIDER.maxZoom, value));
}

export function bindMapInteractions({ canvas, pointsGetter, scheduleRender, loadWeather }) {
  const zoomBy = (delta, event = null) => {
    const { width, height } = canvasMetrics(canvas);
    const oldZoom = appState.map.zoom;
    const next = clampZoom(oldZoom + delta);
    if (next === oldZoom) return;
    if (event) {
      const rect = canvas.getBoundingClientRect();
      const before = xyToLatLon(event.clientX - rect.left, event.clientY - rect.top, width, height);
      appState.map.zoom = next;
      appState.map.tileZ = Math.round(next);
      const after = xyToLatLon(event.clientX - rect.left, event.clientY - rect.top, width, height);
      appState.map.centerLat += before.lat - after.lat;
      appState.map.centerLon += before.lon - after.lon;
    } else {
      appState.map.zoom = next;
      appState.map.tileZ = Math.round(next);
    }
    scheduleRender();
  };

  byId('mapZoomIn')?.addEventListener('click', () => zoomBy(1));
  byId('mapZoomOut')?.addEventListener('click', () => zoomBy(-1));
  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    zoomBy(event.deltaY < 0 ? 0.5 : -0.5, event);
  }, { passive: false });
  canvas.addEventListener('mousedown', (event) => {
    appState.map.dragging = true;
    appState.map.lastX = event.clientX;
    appState.map.lastY = event.clientY;
    canvas.classList.add('grabbing');
  });
  window.addEventListener('mousemove', (event) => {
    if (!appState.map.dragging) return;
    const { width, height } = canvasMetrics(canvas);
    const dx = event.clientX - appState.map.lastX;
    const dy = event.clientY - appState.map.lastY;
    const moved = xyToLatLon(width / 2 - dx, height / 2 - dy, width, height);
    appState.map.centerLat = moved.lat;
    appState.map.centerLon = moved.lon;
    appState.map.lastX = event.clientX;
    appState.map.lastY = event.clientY;
    scheduleRender();
  });
  window.addEventListener('mouseup', () => {
    appState.map.dragging = false;
    canvas.classList.remove('grabbing');
  });
  canvas.addEventListener('mousemove', (event) => {
    window.clearTimeout(appState.map.hoverTimer);
    appState.map.hoverTimer = window.setTimeout(() => showPopup(event, canvas, pointsGetter(), loadWeather), 40);
  });
  canvas.addEventListener('mouseleave', () => byId('mapCityPopup')?.classList.remove('show'));
  canvas.addEventListener('click', (event) => {
    const point = nearestFromEvent(event, canvas, pointsGetter());
    if (point) showPopup(event, canvas, pointsGetter(), loadWeather, true);
  });
  canvas.addEventListener('touchstart', (event) => {
    if (event.touches.length === 1) {
      appState.map.dragging = true;
      appState.map.lastX = event.touches[0].clientX;
      appState.map.lastY = event.touches[0].clientY;
    } else if (event.touches.length === 2) {
      const dx = event.touches[0].clientX - event.touches[1].clientX;
      const dy = event.touches[0].clientY - event.touches[1].clientY;
      appState.map.pinchDist = Math.hypot(dx, dy);
      appState.map.pinchZoom = appState.map.zoom;
    }
  }, { passive: true });
  canvas.addEventListener('touchmove', (event) => {
    event.preventDefault();
    const { width, height } = canvasMetrics(canvas);
    if (event.touches.length === 1 && appState.map.dragging) {
      const touch = event.touches[0];
      const dx = touch.clientX - appState.map.lastX;
      const dy = touch.clientY - appState.map.lastY;
      const moved = xyToLatLon(width / 2 - dx, height / 2 - dy, width, height);
      appState.map.centerLat = moved.lat;
      appState.map.centerLon = moved.lon;
      appState.map.lastX = touch.clientX;
      appState.map.lastY = touch.clientY;
      scheduleRender();
    } else if (event.touches.length === 2 && appState.map.pinchDist) {
      const dx = event.touches[0].clientX - event.touches[1].clientX;
      const dy = event.touches[0].clientY - event.touches[1].clientY;
      appState.map.zoom = clampZoom(appState.map.pinchZoom + Math.log2(Math.hypot(dx, dy) / appState.map.pinchDist));
      appState.map.tileZ = Math.round(appState.map.zoom);
      scheduleRender();
    }
  }, { passive: false });
  canvas.addEventListener('touchend', () => {
    appState.map.dragging = false;
    appState.map.pinchDist = null;
  });
}

function nearestFromEvent(event, canvas, points) {
  const rect = canvas.getBoundingClientRect();
  const { width, height } = canvasMetrics(canvas);
  return findNearestPoint(points, width, height, event.clientX - rect.left, event.clientY - rect.top);
}

function showPopup(event, canvas, points, loadWeather, sticky = false) {
  const point = nearestFromEvent(event, canvas, points);
  const popup = byId('mapCityPopup');
  if (!popup) return;
  if (!point) {
    if (!sticky) popup.classList.remove('show');
    return;
  }
  clear(popup);
  const countryCode = normalizeCountryCode(point.country || point.countryCode);
  const titleRow = createEl('div', { className: 'mcp-title-row' }, [
    createEl('div', { className: 'mcp-name', text: point.name }),
  ]);
  popup.append(
    titleRow,
    countryCode ? createEl('div', { className: 'mcp-country', text: countryCode }) : null,
    createEl('div', { className: 'mcp-row', text: `${getWmoIcon(point.code, point.isDay).icon} ${temperature(point.temp, appState.unitSystem)}${temperatureUnit(appState.unitSystem)} · ${getWmoIcon(point.code, point.isDay).label}` }),
    createEl('div', { className: 'mcp-row', text: `Wiatr ${windSpeed(point.wind, appState.unitSystem)} ${windUnit(appState.unitSystem)} · opady ${Number(point.precip ?? 0).toFixed(1)} mm` }),
    createEl('button', {
      className: 'mcp-action',
      type: 'button',
      text: 'Pokaż prognozę',
      on: { click: () => loadWeather?.(point.lat, point.lon, point.name, point.countryName || '', { countryCode }) },
    }),
  );
  const rect = canvas.getBoundingClientRect();
  const mx = event.clientX - rect.left;
  const my = event.clientY - rect.top;
  popup.style.left = `${Math.min(mx + 14, canvas.offsetWidth - 220)}px`;
  popup.style.top = `${Math.max(8, my - 18)}px`;
  popup.classList.add('show');
}
