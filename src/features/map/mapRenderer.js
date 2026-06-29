import { appState } from '../../state/appState.js';
import { cssColor } from '../../utils/colorUtils.js';
import { drawMapLegend } from './mapLegend.js';
import { getTile, tileUrl } from './mapTiles.js';
import { mercPx, worldToCanvas } from './mapProjection.js';
import { drawWeatherOverlay, drawWeatherPoints } from './mapOverlay.js';

export function canvasMetrics(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.offsetWidth || canvas.parentElement?.offsetWidth || 320;
  const height = window.matchMedia('(max-width: 600px)').matches ? 360 : 420;
  if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.height = `${height}px`;
  }
  return { dpr, width, height };
}

export function renderMapFrame(canvas, points, scheduleRender) {
  const { dpr, width, height } = canvasMetrics(canvas);
  const ctx = canvas.getContext('2d');
  const light = document.body?.classList.contains('light');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = light ? '#eef3f7' : '#070b11';
  ctx.fillRect(0, 0, width, height);

  const z = appState.map.tileZ;
  const center = mercPx(appState.map.centerLat, appState.map.centerLon, z);
  const startTx = Math.floor((center.wx - width / 2) / 256);
  const endTx = Math.floor((center.wx + width / 2) / 256);
  const startTy = Math.floor((center.wy - height / 2) / 256);
  const endTy = Math.floor((center.wy + height / 2) / 256);
  const nTiles = 2 ** z;
  for (let tx = startTx; tx <= endTx; tx += 1) {
    for (let ty = startTy; ty <= endTy; ty += 1) {
      if (ty < 0 || ty >= nTiles) continue;
      const wrappedTx = ((tx % nTiles) + nTiles) % nTiles;
      const img = getTile(tileUrl(z, wrappedTx, ty), scheduleRender);
      if (!img.ready) continue;
      const { x, y } = worldToCanvas(tx * 256, ty * 256, width, height);
      ctx.save();
      ctx.filter = light ? 'saturate(.82) contrast(1.08) brightness(.98)' : 'saturate(.62) contrast(1.12) brightness(.9)';
      ctx.drawImage(img, Math.round(x), Math.round(y), 257, 257);
      ctx.restore();
    }
  }

  ctx.fillStyle = light ? 'rgba(255,255,255,.12)' : 'rgba(5,12,22,.16)';
  ctx.fillRect(0, 0, width, height);
  drawWeatherOverlay(ctx, points, width, height);
  drawWeatherPoints(ctx, points, width, height);

  ctx.fillStyle = light ? 'rgba(255,255,255,.88)' : 'rgba(3,7,12,.82)';
  ctx.strokeStyle = light ? 'rgba(15,23,42,.22)' : 'rgba(125,133,144,.22)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(10, 10, 124, 26, 3);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = cssColor('var(--text)');
  ctx.font = '11px "IBM Plex Mono", monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`Zoom ${appState.map.zoom.toFixed(1)}`, 20, 23);
  const area = [appState.location.country || '', appState.location.countryCode || ''].filter(Boolean).join(' / ');
  if (area) {
    const label = `Obszar: ${area}`;
    const w = Math.min(width - 20, Math.max(124, ctx.measureText(label).width + 22));
    ctx.fillStyle = light ? 'rgba(255,255,255,.88)' : 'rgba(3,7,12,.74)';
    ctx.strokeStyle = light ? 'rgba(15,23,42,.18)' : 'rgba(125,133,144,.22)';
    ctx.beginPath();
    ctx.roundRect(10, 42, w, 24, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = cssColor('var(--text)');
    ctx.fillText(label, 20, 54);
  }
  drawMapLegend(ctx, width, height);
}
