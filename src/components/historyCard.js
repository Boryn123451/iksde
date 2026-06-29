import { appState } from '../state/appState.js';
import { byId, clear, createEl, show } from '../utils/domUtils.js';
import { fmtDay } from '../utils/dateUtils.js';
import { getTempColor, precipitation, precipitationUnit, temperature } from '../utils/unitUtils.js';

export function renderHistory(data) {
  const daily = data?.daily;
  if (!daily?.time?.length) return;
  show('historyCard');
  const tbody = document.querySelector('#historyTable tbody');
  clear(tbody);
  daily.time.forEach((date, i) => {
    const tmax = daily.temperature_2m_max?.[i];
    const tmin = daily.temperature_2m_min?.[i];
    const pr = daily.precipitation_sum?.[i];
    tbody.append(createEl('tr', {}, [
      createEl('td', { text: fmtDay(date) }),
      createEl('td', { text: `${temperature(tmax, appState.unitSystem)}°`, style: { color: getTempColor(tmax) } }),
      createEl('td', { text: `${temperature(tmin, appState.unitSystem)}°`, style: { color: getTempColor(tmin) } }),
      createEl('td', { text: pr != null ? `${precipitation(pr, appState.unitSystem)} ${precipitationUnit(appState.unitSystem)}` : '—' }),
    ]));
  });

}
