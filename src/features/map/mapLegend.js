import { appState } from '../../state/appState.js';

function layerLabel(layer) {
  if (layer === 'precip') return 'OPADY';
  if (layer === 'wind') return 'WIATR';
  if (layer === 'cloud') return 'CHMURY';
  return 'TEMP';
}

export function drawMapLegend(ctx, width) {
  const layer = appState.map.layer;
  const light = document.body?.classList.contains('light');
  const w = Math.min(168, width - 154);
  if (w < 118) return;
  const x = Math.max(144, width - w - 10);
  const y = 10;
  const lx = x + 58;
  const ly = y + 10;
  const gw = Math.max(58, w - 68);
  const grad = ctx.createLinearGradient(lx, ly, lx + gw, ly);

  if (layer === 'temp') {
    grad.addColorStop(0, light ? '#075985' : '#79c0ff');
    grad.addColorStop(.35, light ? '#15803d' : '#56d364');
    grad.addColorStop(.68, light ? '#b45309' : '#f0a500');
    grad.addColorStop(1, light ? '#b91c1c' : '#f85149');
  } else if (layer === 'precip') {
    grad.addColorStop(0, light ? 'rgba(7,89,133,.24)' : 'rgba(88,166,255,.18)');
    grad.addColorStop(.6, light ? 'rgba(29,78,216,.7)' : 'rgba(56,139,253,.65)');
    grad.addColorStop(1, light ? 'rgba(109,40,217,.82)' : 'rgba(188,140,255,.8)');
  } else if (layer === 'wind') {
    grad.addColorStop(0, light ? '#075985' : '#58a6ff');
    grad.addColorStop(.5, light ? '#b45309' : '#f0a500');
    grad.addColorStop(1, light ? '#6d28d9' : '#bc8cff');
  } else {
    grad.addColorStop(0, light ? 'rgba(180,83,9,.34)' : 'rgba(240,165,0,.35)');
    grad.addColorStop(1, light ? 'rgba(31,41,55,.74)' : 'rgba(230,237,243,.75)');
  }

  ctx.save();
  ctx.fillStyle = light ? 'rgba(255,255,255,.9)' : 'rgba(3,7,12,.78)';
  ctx.strokeStyle = light ? 'rgba(15,23,42,.24)' : 'rgba(125,133,144,.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, w, 30, 7);
  ctx.fill();
  ctx.stroke();
  ctx.font = '9px "IBM Plex Mono", monospace';
  ctx.fillStyle = light ? 'rgba(15,23,42,.84)' : 'rgba(230,237,243,.82)';
  ctx.textBaseline = 'middle';
  ctx.fillText(layerLabel(layer), x + 9, y + 15);
  ctx.fillStyle = grad;
  ctx.fillRect(lx, ly, gw, 10);
  ctx.strokeStyle = light ? 'rgba(15,23,42,.28)' : 'rgba(255,255,255,.28)';
  ctx.strokeRect(lx, ly, gw, 10);
  ctx.restore();
}
