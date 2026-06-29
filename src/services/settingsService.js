import { DEFAULT_SECTION_VISIBILITY, SECTION_IDS, STORAGE_KEYS } from '../config/constants.js';
import { appState } from '../state/appState.js';
import { readJson, writeJson } from './storageService.js';

export function loadSectionVisibility() {
  const saved = readJson(STORAGE_KEYS.sectionVisibility, {});
  appState.sectionVisibility = { ...DEFAULT_SECTION_VISIBILITY, ...saved };
  return appState.sectionVisibility;
}

export function saveSectionVisibility(next) {
  appState.sectionVisibility = { ...DEFAULT_SECTION_VISIBILITY, ...next };
  writeJson(STORAGE_KEYS.sectionVisibility, appState.sectionVisibility);
  applySectionVisibility();
}

export function setSectionVisible(key, visible) {
  saveSectionVisibility({ ...appState.sectionVisibility, [key]: Boolean(visible) });
}

export function applySectionVisibility() {
  Object.entries(SECTION_IDS).forEach(([key, id]) => {
    const node = document.getElementById(id);
    if (!node) return;
    node.hidden = appState.sectionVisibility[key] === false;
  });
}

export function getSectionLabel(key) {
  return {
    alerts: 'Alerty',
    comfort: 'Komfort',
    clothing: 'Ubiór',
    nextHours: 'Najbliższe 3h',
    map: 'Mapa',
    aqi: 'AQI',
    history: 'Historia',
    sport: 'Sport',
    astronomy: 'Astronomia',
    marine: 'Dane morskie',
    chart: 'Wykres',
    recommendations: 'Rekomendacje',
  }[key] || key;
}
