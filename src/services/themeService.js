import { STORAGE_KEYS } from '../config/constants.js';
import { appState } from '../state/appState.js';
import { writeString } from './storageService.js';
import { byId } from '../utils/domUtils.js';

export function applyTheme(isDark = appState.isDark) {
  appState.isDark = Boolean(isDark);
  document.body.classList.toggle('light', !appState.isDark);
  const toggle = byId('darkToggle');
  if (toggle) {
    toggle.textContent = appState.isDark ? '🌙' : '☀️';
    toggle.setAttribute('aria-label', appState.isDark ? 'Przełącz na jasny motyw' : 'Przełącz na ciemny motyw');
  }
}

export function toggleTheme() {
  applyTheme(!appState.isDark);
  writeString(STORAGE_KEYS.theme, appState.isDark ? 'dark' : 'light');
}
