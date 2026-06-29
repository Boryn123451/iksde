import { STORAGE_KEYS } from '../config/constants.js';
import { appState } from '../state/appState.js';
import { writeString } from './storageService.js';
import { byId } from '../utils/domUtils.js';

export function applyUnitButtons() {
  byId('unitSI')?.classList.toggle('active', appState.unitSystem === 'si');
  byId('unitIMP')?.classList.toggle('active', appState.unitSystem === 'imperial');
}

export function setUnitSystem(system) {
  appState.unitSystem = system === 'imperial' ? 'imperial' : 'si';
  writeString(STORAGE_KEYS.unitSystem, appState.unitSystem);
  applyUnitButtons();
}
