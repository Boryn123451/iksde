import { hide, show } from '../utils/domUtils.js';

export function showLoadingState() {
  show('loadingOverlay', 'flex');
}

export function hideLoadingState() {
  hide('loadingOverlay');
}
