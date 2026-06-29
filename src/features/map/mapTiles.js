import { TILE_PROVIDER } from '../../config/constants.js';

const tileCache = new Map();

export function tileUrl(z, x, y) {
  const sub = TILE_PROVIDER.subdomains[Math.abs(x + y) % TILE_PROVIDER.subdomains.length];
  return TILE_PROVIDER.template
    .replace('{s}', sub)
    .replace('{z}', z)
    .replace('{x}', x)
    .replace('{y}', y);
}

export function getTile(url, onReady) {
  if (tileCache.has(url)) return tileCache.get(url);
  const img = new Image();
  img.onload = () => {
    img.ready = true;
    onReady?.();
  };
  img.onerror = () => {
    img.failed = true;
  };
  img.src = url;
  tileCache.set(url, img);
  return img;
}

export function providerAttribution() {
  return TILE_PROVIDER.attribution;
}
