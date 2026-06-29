import { generateWeatherAlerts } from '../features/alerts/weatherAlerts.js';
import { byId, clear, createEl } from '../utils/domUtils.js';

export function renderAlertCards(current, daily, aqi) {
  const root = byId('alertsGrid');
  const section = byId('alertsSection');
  if (!root || !section) return;
  clear(root);
  const alerts = generateWeatherAlerts(current, daily, aqi);
  section.dataset.empty = alerts.length ? 'false' : 'true';
  if (!alerts.length) {
    root.append(createEl('div', { className: 'alert-card calm' }, [
      createEl('div', { className: 'alert-icon', text: '✓' }),
      createEl('div', {}, [
        createEl('div', { className: 'alert-title', text: 'Brak istotnych alertów' }),
        createEl('div', { className: 'alert-text', text: 'Nie wykryto progów ryzyka dla aktualnych danych.' }),
      ]),
    ]));
    return;
  }
  alerts.forEach((alert) => {
    root.append(createEl('div', { className: `alert-card ${alert.level}` }, [
      createEl('div', { className: 'alert-icon', text: alert.icon }),
      createEl('div', {}, [
        createEl('div', { className: 'alert-title', text: alert.title }),
        createEl('div', { className: 'alert-text', text: alert.text }),
      ]),
    ]));
  });
}
