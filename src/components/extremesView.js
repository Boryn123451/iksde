import { byId, createEl } from '../utils/domUtils.js';

export async function openExtremesModal(loadWeatherCallback) {
  const overlay = byId('extremesModalOverlay');
  const body = byId('exBody');
  if (!overlay || !body) return;
  
  overlay.classList.add('show');
  body.innerHTML = '<div style="text-align:center; padding:2rem; color:var(--muted)">Pobieranie najnowszych rekordów...</div>';
  
  try {
    const res = await fetch('/data/climateStats.json');
    if (!res.ok) throw new Error('Failed to fetch');
    const data = await res.json();
    renderExtremes(data, body, loadWeatherCallback, overlay);
  } catch (e) {
    body.innerHTML = '<div style="text-align:center; padding:2rem; color:var(--alert-error)">Brak danych ekstremalnych. Sprawdź połączenie lub spróbuj później.</div>';
  }
}

export function closeExtremesModal() {
  const overlay = byId('extremesModalOverlay');
  if (overlay) overlay.classList.remove('show');
}

function renderExtremes(data, container, loadWeatherCallback, overlay) {
  container.innerHTML = '';
  
  const updatedDate = data.updated ? new Date(data.updated).toLocaleString('pl-PL') : 'nieznany';
  
  const header = createEl('div', { 
    style: { fontSize: '0.8rem', color: 'var(--muted)', textAlign: 'center', marginBottom: '1rem' },
    text: `Dane z okresu: ${data.start_date || '?'} - ${data.end_date || '?'}. Aktualizacja: ${updatedDate}`
  });
  container.append(header);

  const grid = createEl('div', {
    style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }
  });
  
  // Hottest
  const hotCol = createEl('div');
  hotCol.append(createEl('h3', { text: '🔥 Najgorętsze', style: { color: 'var(--warm)', marginBottom: '1rem' } }));
  if (data.hot && data.hot.length) {
    data.hot.slice(0, 10).forEach((item, i) => {
      hotCol.append(createExtremeCard(item, i + 1, 'var(--warm)', loadWeatherCallback, overlay));
    });
  } else {
    hotCol.append(createEl('div', { text: 'Brak danych o najwyższych temperaturach.', style: { color: 'var(--muted)' } }));
  }
  
  // Coldest
  const coldCol = createEl('div');
  coldCol.append(createEl('h3', { text: '❄️ Najzimniejsze', style: { color: 'var(--cold)', marginBottom: '1rem' } }));
  if (data.cold && data.cold.length) {
    data.cold.slice(0, 10).forEach((item, i) => {
      coldCol.append(createExtremeCard(item, i + 1, 'var(--cold)', loadWeatherCallback, overlay));
    });
  } else {
    coldCol.append(createEl('div', { text: 'Obecnie brak silnych mrozów (okres letni na półkuli północnej).', style: { color: 'var(--muted)', fontSize: '0.9rem' } }));
  }
  
  grid.append(hotCol, coldCol);
  container.append(grid);
}

function createExtremeCard(item, rank, color, loadWeatherCallback, overlay) {
  const card = createEl('div', {
    className: 'extreme-card',
    style: {
      display: 'flex',
      alignItems: 'center',
      padding: '0.75rem 1rem',
      background: 'var(--surface2)',
      borderRadius: '8px',
      marginBottom: '0.5rem',
      cursor: 'pointer',
      transition: 'transform 0.2s, background 0.2s',
      borderLeft: `4px solid ${color}`
    }
  });
  
  // Rank
  const rankEl = createEl('div', {
    text: `#${rank}`,
    style: { fontWeight: 'bold', fontSize: '1.2rem', opacity: 0.5, width: '40px' }
  });
  
  // Info
  const infoEl = createEl('div', { style: { flex: 1 } });
  infoEl.append(createEl('div', { text: item.name, style: { fontWeight: 'bold', fontSize: '1rem' } }));
  infoEl.append(createEl('div', { text: `${item.country} • ${item.date}`, style: { fontSize: '0.75rem', color: 'var(--muted)' } }));
  
  // Temp
  const tempEl = createEl('div', {
    text: `${item.temp}°C`,
    style: { fontWeight: 'bold', fontSize: '1.4rem', color: color, fontFamily: "'Space Mono', monospace" }
  });
  
  card.append(rankEl, infoEl, tempEl);
  
  card.addEventListener('mouseenter', () => { card.style.background = 'var(--surface)'; card.style.transform = 'translateY(-2px)'; });
  card.addEventListener('mouseleave', () => { card.style.background = 'var(--surface2)'; card.style.transform = 'translateY(0)'; });
  
  card.addEventListener('click', () => {
    overlay.classList.remove('show'); // close modal
    // Check if item has lat/lon
    if (item.lat != null && item.lon != null) {
      loadWeatherCallback(item.lat, item.lon, item.name, item.country);
    }
  });
  
  return card;
}
