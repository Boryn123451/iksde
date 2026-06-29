import { appState } from '../state/appState.js';
import { searchCities } from '../api/geocodingApi.js';
import { byId, button, clear, createEl, focusFirst, setModalOpen } from '../utils/domUtils.js';
import { flagAlt, flagEmoji, flagUrl, normalizeCountryCode } from '../utils/countryUtils.js';
import { getFavorites, getRecent, saveFavorites, setHomeLocation } from '../services/locationService.js';
import { showToast } from './toast.js';
import { addLocationToComparison } from './comparisonPanel.js';

function normalizeResult(result) {
  return {
    lat: Number(result.latitude ?? result.lat),
    lon: Number(result.longitude ?? result.lon),
    city: String(result.name || result.city || ''),
    country: String(result.country || ''),
    admin1: String(result.admin1 || ''),
    countryCode: String(result.country_code || ''),
    elevation: result.elevation,
  };
}

function loadFromNode(node, loadWeather) {
  loadWeather(Number(node.dataset.lat), Number(node.dataset.lon), node.dataset.city || '', node.dataset.country || '', { countryCode: node.dataset.countryCode || '' });
  closeOverlay();
}

function flagNode(countryCode) {
  const code = normalizeCountryCode(countryCode);
  if (!code) return createEl('span', { className: 'result-flag', text: '' });
  const fallback = createEl('span', { className: 'result-flag result-flag-emoji', text: flagEmoji(code), style: { display: 'none' } });
  const img = createEl('img', {
    className: 'result-flag-img',
    attrs: { src: flagUrl(code, 40), alt: flagAlt(code), loading: 'lazy' },
    on: {
      error: (event) => {
        event.currentTarget.style.display = 'none';
        fallback.style.display = '';
      },
    },
  });
  return createEl('span', { className: 'result-flag' }, [fallback, img]);
}

export function renderSearchResults(results, query, { loadWeather } = {}) {
  const root = byId('searchResults');
  clear(root);
  if (!root) return;
  if (!results.length) {
    root.append(createEl('div', { className: 'no-results', text: `Nie znaleziono miast dla: „${query}”` }));
    return;
  }
  results.map(normalizeResult).filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lon)).forEach((item) => {
    const row = createEl('div', {
      className: 'result-item',
      role: 'button',
      tabIndex: 0,
      dataset: { lat: item.lat, lon: item.lon, city: item.city, country: item.country, countryCode: item.countryCode },
    }, [
      flagNode(item.countryCode),
      createEl('div', { className: 'result-info' }, [
        createEl('div', { className: 'result-name', text: item.city }),
        createEl('div', { className: 'result-sub', text: [item.admin1, item.country].filter(Boolean).join(', ') }),
      ]),
      createEl('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '.3rem' } }, [
        createEl('span', { className: 'result-elev', text: item.elevation != null ? `${Math.round(Number(item.elevation))} m` : '' }),
        button({
          className: 'set-home-btn',
          title: 'Ustaw jako miasto domowe',
          dataset: { lat: item.lat, lon: item.lon, city: item.city, country: item.country, countryCode: item.countryCode },
          style: { fontSize: '.6rem', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '4px', padding: '.15rem .4rem', cursor: 'pointer', color: 'var(--muted)', whiteSpace: 'nowrap' },
          on: {
            click: (event) => {
              event.stopPropagation();
              setHomeLocation({ lat: item.lat, lon: item.lon, city: item.city, country: item.country, countryCode: item.countryCode, name: item.city });
              loadWeather(item.lat, item.lon, item.city, item.country, { countryCode: item.countryCode });
              closeOverlay();
            },
          },
        }, '🏠 dom'),
        button({
          className: 'set-home-btn',
          title: 'Dodaj do porównania',
          style: { fontSize: '.6rem', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '4px', padding: '.15rem .4rem', cursor: 'pointer', color: 'var(--muted)', whiteSpace: 'nowrap' },
          on: {
            click: (event) => {
              event.stopPropagation();
              addLocationToComparison({ lat: item.lat, lon: item.lon, city: item.city, name: item.city, country: item.country, countryCode: item.countryCode });
              showToast(`Dodano „${item.city}” do porównania`, 'success');
            },
          },
        }, '⇄ porównaj'),
      ]),
    ]);
    row.addEventListener('click', () => loadFromNode(row, loadWeather));
    row.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        loadFromNode(row, loadWeather);
      }
    });
    root.append(row);
  });
}

export function renderFavorites({ loadWeather } = {}) {
  const favorites = getFavorites();
  const section = byId('favSection');
  const list = byId('favList');
  if (!section || !list) return;
  clear(list);
  if (!favorites.length) {
    section.style.display = 'none';
    return;
  }
  section.style.display = 'block';
  favorites.forEach((favorite, index) => {
    const item = createEl('span', {
      className: 'fav-item',
      dataset: { i: index, lat: favorite.lat, lon: favorite.lon, city: favorite.city || favorite.name, country: favorite.country || '', countryCode: favorite.countryCode || '' },
    }, [
      `★ ${favorite.city || favorite.name}`,
      createEl('span', { className: 'fav-remove', title: 'Usuń', text: '✕', dataset: { i: index } }),
      createEl('span', { className: 'fav-compare', title: 'Dodaj do porównania', text: ' ⇄', dataset: { i: index } }),
    ]);
    item.addEventListener('click', (event) => {
      if (event.target.classList.contains('fav-remove')) {
        const next = getFavorites();
        next.splice(index, 1);
        saveFavorites(next);
        renderFavorites({ loadWeather });
        renderRecent({ loadWeather });
        return;
      }
      if (event.target.classList.contains('fav-compare')) {
        addLocationToComparison(favorite);
        showToast(`Dodano „${favorite.city || favorite.name}” do porównania`, 'success');
        return;
      }
      loadWeather(favorite.lat, favorite.lon, favorite.city || favorite.name, favorite.country || '', { countryCode: favorite.countryCode || '' });
      closeOverlay();
    });
    list.append(item);
  });
}

export function renderRecent({ loadWeather } = {}) {
  const recent = getRecent();
  const root = byId('searchRecent');
  clear(root);
  if (!root) return;
  if (recent.length) {
    root.append(createEl('div', { className: 'recent-label', text: 'Ostatnio' }));
    recent.forEach((item) => {
      root.append(button({
        className: 'recent-item',
        dataset: { lat: item.lat, lon: item.lon, city: item.city || item.name, country: item.country || '', countryCode: item.countryCode || '' },
        on: { click: (event) => loadFromNode(event.currentTarget, loadWeather) },
      }, item.city || item.name));
    });
  }
  renderFavorites({ loadWeather });
}

export function openOverlay({ loadWeather } = {}) {
  const overlay = byId('searchOverlay');
  setModalOpen('searchOverlay', true);
  clear(byId('searchResults'));
  const input = byId('overlaySearchInput');
  if (input) input.value = '';
  renderRecent({ loadWeather });
  window.setTimeout(() => focusFirst(overlay), 250);
}

export function closeOverlay() {
  setModalOpen('searchOverlay', false);
}

async function runSearch(query, loadWeather) {
  try {
    const results = await searchCities(query);
    renderSearchResults(results, query, { loadWeather });
  } catch {
    showToast('Błąd wyszukiwania', 'error');
  }
}

export function bindSearchOverlay({ loadWeather, requestGeolocation }) {
  const headerSearchInput = byId('searchInput');
  headerSearchInput?.addEventListener('focus', (event) => {
    event.target.blur();
    openOverlay({ loadWeather });
  });
  headerSearchInput?.addEventListener('click', () => openOverlay({ loadWeather }));
  byId('searchBtn')?.addEventListener('click', () => openOverlay({ loadWeather }));
  byId('overlayClose')?.addEventListener('click', closeOverlay);
  byId('overlayGeoBtn')?.addEventListener('click', () => {
    closeOverlay();
    requestGeolocation(true);
  });

  const overlayInput = byId('overlaySearchInput');
  overlayInput?.addEventListener('input', (event) => {
    const query = event.target.value.trim();
    window.clearTimeout(appState.search.timeoutId);
    if (!query) {
      clear(byId('searchResults'));
      renderRecent({ loadWeather });
      return;
    }
    appState.search.timeoutId = window.setTimeout(() => runSearch(query, loadWeather), 400);
  });
  overlayInput?.addEventListener('keydown', async (event) => {
    if (event.key === 'Enter') {
      const query = overlayInput.value.trim();
      if (!query) return;
      try {
        const results = await searchCities(query);
        if (results.length) {
          const item = normalizeResult(results[0]);
          loadWeather(item.lat, item.lon, item.city, item.country, { countryCode: item.countryCode });
          closeOverlay();
        }
      } catch {
        showToast('Błąd wyszukiwania', 'error');
      }
    }
    if (event.key === 'Escape') closeOverlay();
  });

  const overlay = byId('searchOverlay');
  overlay?.addEventListener('touchstart', () => { appState.search.overlayTapMoved = false; }, { passive: true });
  overlay?.addEventListener('touchmove', () => { appState.search.overlayTapMoved = true; }, { passive: true });
  overlay?.addEventListener('touchend', (event) => {
    if (!appState.search.overlayTapMoved && event.target === overlay) closeOverlay();
  });
  overlay?.addEventListener('click', (event) => {
    if (event.target === overlay) closeOverlay();
  });
}
