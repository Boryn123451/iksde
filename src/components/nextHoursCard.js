import { getNextThreeHours } from '../features/nextHours/nextThreeHours.js';
import { byId, clear, createEl } from '../utils/domUtils.js';

export function renderNextHoursCard(weather) {
  const root = byId('nextHoursGrid');
  if (!root) return;
  clear(root);
  getNextThreeHours(weather).forEach((slot) => {
    root.append(createEl('div', { className: 'next-hour-card' }, [
      createEl('div', { className: 'next-hour-time', text: slot.time }),
      createEl('div', { className: 'next-hour-icon', text: slot.icon }),
      createEl('div', { className: 'next-hour-temp', text: slot.tempLabel }),
      createEl('div', { className: 'next-hour-meta', text: `💧 ${Math.round(slot.precip)}% · 💨 ${slot.windLabel}` }),
      createEl('div', { className: 'next-hour-advice', text: slot.advice }),
    ]));
  });
}
