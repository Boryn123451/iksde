import { byId } from '../utils/domUtils.js';

let toastTimer = null;

export function showToast(message, type = 'info', duration = 3500) {
  const toast = byId('toast');
  if (!toast) return;
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
  toastTimer = window.setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}
