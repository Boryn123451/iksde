import { appState } from '../state/appState.js';
import { byId, clear, createEl, show } from '../utils/domUtils.js';
import { temperature, temperatureUnit, waveHeight, waveUnit } from '../utils/unitUtils.js';
import { windDegToDir } from '../utils/weatherCodeUtils.js';

function isFiniteValue(value) {
  return value !== null && value !== undefined && Number.isFinite(Number(value));
}

function waveSvg(heightMeters) {
  const waveH = Math.min(28, Math.max(4, (Number(heightMeters) || 0.5) * 10));
  const svg = createEl('span');
  svg.innerHTML = `<svg width="120" height="30" viewBox="0 0 120 30" aria-hidden="true">
    <path class="wave-path" d="M0,${30 - waveH} Q15,${30 - waveH * 1.8} 30,${30 - waveH} Q45,${30 - waveH * 0.2} 60,${30 - waveH} Q75,${30 - waveH * 1.8} 90,${30 - waveH} Q105,${30 - waveH * 0.2} 120,${30 - waveH}" fill="none" stroke="var(--mild)" stroke-width="2.5" stroke-linecap="round"/>
  </svg>`;
  return svg.firstElementChild;
}

function tile(label, value, sub, extra = null) {
  const node = createEl('div', { className: 'marine-tile' }, [
    createEl('div', { className: 'marine-label', text: label }),
    createEl('div', { className: 'marine-value', text: value }),
    createEl('div', { className: 'marine-sub', text: sub }),
  ]);
  if (extra) node.append(createEl('div', { className: 'wave-viz' }, [extra]));
  return node;
}

export function renderMarine(data) {
  const current = data?.current;
  const section = byId('marineSection');
  const grid = byId('marineGrid');
  if (!section || !grid) return;
  show(section);
  clear(grid);
  const wh = current?.wave_height;
  const wp = current?.wave_period;
  const wd = current?.wave_direction;
  const sst = current?.sea_surface_temperature;
  const sw = current?.swell_wave_height;
  const swp = current?.swell_wave_period;
  const hasKeyData = [wh, wp, wd, sst].some(isFiniteValue);
  if (!hasKeyData) {
    grid.append(createEl('div', { className: 'marine-empty' }, [
      createEl('div', { className: 'marine-value', text: 'Brak danych morskich dla tej lokalizacji' }),
      createEl('div', { className: 'marine-sub', text: 'Brak obsługiwanego akwenu morskiego lub zbiornika wodnego dla tej lokalizacji. Dane morskie Open-Meteo Marine są dostępne tylko dla lokalizacji przy obsługiwanych akwenach.' }),
    ]));
    return;
  }
  const beaufort = wh < 0.1 ? 0 : wh < 0.5 ? 1 : wh < 1.25 ? 2 : wh < 2.5 ? 3 : wh < 4 ? 4 : 5;
  const labels = ['Spokojne', 'Lekko zmarszczone', 'Słaba fala', 'Umiarkowana fala', 'Wysoka fala', 'Bardzo wysoka fala'];
  grid.append(
    tile('🌊 Wysokość fali', isFiniteValue(wh) ? `${waveHeight(wh, appState.unitSystem)} ${waveUnit(appState.unitSystem)}` : 'Brak danych', isFiniteValue(wh) ? labels[beaufort] : 'Brak danych Open-Meteo Marine', isFiniteValue(wh) ? waveSvg(wh) : null),
    tile('⏱️ Okres fali', isFiniteValue(wp) ? `${Number(wp).toFixed(0)} s` : 'Brak danych', 'czas między falami'),
    tile('🧭 Kierunek fali', isFiniteValue(wd) ? windDegToDir(wd) : 'Brak danych', isFiniteValue(wd) ? `${Math.round(wd)}°` : 'Brak danych Open-Meteo Marine'),
    tile('🌡️ Temperatura morza', isFiniteValue(sst) ? `${temperature(sst, appState.unitSystem)}${temperatureUnit(appState.unitSystem)}` : 'Brak danych', 'sea surface temperature'),
    tile('🌊 Fala morska', isFiniteValue(sw) ? `${waveHeight(sw, appState.unitSystem)} ${waveUnit(appState.unitSystem)}` : 'Brak danych', isFiniteValue(swp) ? `okres: ${Number(swp).toFixed(0)} s` : 'brak danych swell'),
  );
}
