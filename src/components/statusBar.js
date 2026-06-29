import { appState } from '../state/appState.js';
import { formatCacheAge } from '../services/cacheService.js';
import { byId, setText } from '../utils/domUtils.js';

export function renderStatusBar() {
  const status = byId('networkStatus');
  const updated = byId('updatedStatus');
  if (!status || !updated) return;
  const offline = !appState.network.online;
  const source = appState.network.source;
  status.textContent = offline ? 'offline' : source === 'cache' ? 'dane z cache' : 'online';
  status.className = `status-pill ${offline ? 'offline' : source === 'cache' ? 'cache' : 'online'}`;
  const ts = appState.cacheMeta?.ts || appState.network.lastUpdatedAt;
  setText(updated, ts ? `zaktualizowano ${formatCacheAge(Date.now() - ts)}` : 'brak aktualizacji');
}
