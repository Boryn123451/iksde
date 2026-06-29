import { DEFAULT_SECTION_VISIBILITY } from '../config/constants.js';
import { getCurrencies, livingCostApiKey, preferredCurrency, setLivingCostApiKey, setPreferredCurrency } from '../services/currencyService.js';
import { clearRuntimeLogs, readRuntimeLogs, runtimeLogsBlob, runtimeLogsFilename } from '../services/loggerService.js';
import { getSectionLabel, setSectionVisible } from '../services/settingsService.js';
import { appState } from '../state/appState.js';
import { byId, clear, createEl, downloadBlob, setModalOpen } from '../utils/domUtils.js';

function renderCurrencySettings(list) {
  const select = createEl('select', { className: 'settings-select', attrs: { 'aria-label': 'Preferowana waluta' } });
  select.append(createEl('option', { value: preferredCurrency(), text: `${preferredCurrency()} (ładowanie listy...)` }));
  select.value = preferredCurrency();
  select.addEventListener('change', () => setPreferredCurrency(select.value));
  const keyInput = createEl('input', {
    className: 'settings-input',
    value: livingCostApiKey(),
    attrs: { type: 'password', placeholder: 'Opcjonalny LivingCost API key', autocomplete: 'off' },
  });
  keyInput.addEventListener('change', () => setLivingCostApiKey(keyInput.value));
  list.append(createEl('div', { className: 'settings-block' }, [
    createEl('div', { className: 'settings-block-title', text: 'Waluty i źródła kosztów' }),
    createEl('label', { className: 'settings-field' }, [
      createEl('span', { text: 'Preferowana waluta' }),
      select,
    ]),
    createEl('label', { className: 'settings-field' }, [
      createEl('span', { text: 'LivingCost API key' }),
      keyInput,
    ]),
  ]));
  getCurrencies()
    .then((currencies) => {
      select.replaceChildren(...currencies.map((item) => createEl('option', { value: item.code, text: `${item.code} - ${item.name}` })));
      select.value = preferredCurrency();
    })
    .catch(() => {
      select.replaceChildren(createEl('option', { value: preferredCurrency(), text: `${preferredCurrency()} - brak listy walut` }));
    });
}

function renderLogSettings(list) {
  const count = readRuntimeLogs().length;
  const counter = createEl('span', { className: 'settings-log-count', text: `${count} wpisow` });
  const exportBtn = createEl('button', {
    className: 'settings-action-btn',
    type: 'button',
    text: 'Eksportuj logi',
    on: { click: () => downloadBlob(runtimeLogsFilename(), runtimeLogsBlob()) },
  });
  const clearBtn = createEl('button', {
    className: 'settings-action-btn',
    type: 'button',
    text: 'Wyczysc',
    on: {
      click: () => {
        clearRuntimeLogs();
        renderSettingsPanel();
      },
    },
  });
  list.append(createEl('div', { className: 'settings-block' }, [
    createEl('div', { className: 'settings-block-title', text: 'Logi dzialania aplikacji' }),
    createEl('div', { className: 'settings-log-row' }, [
      counter,
      createEl('div', { className: 'settings-actions' }, [exportBtn, clearBtn]),
    ]),
    createEl('div', {
      className: 'settings-help',
      text: 'Logi runtime sa zapisywane lokalnie w przegladarce. Logi uruchomienia Vite zapisuje skrypt BAT w katalogu logs.',
    }),
  ]));
}

export function renderSettingsPanel() {
  const list = byId('settingsSections');
  if (!list) return;
  clear(list);
  renderCurrencySettings(list);
  renderLogSettings(list);
  list.append(createEl('div', { className: 'settings-block-title settings-full', text: 'Sekcje ekranu głównego' }));
  Object.keys(DEFAULT_SECTION_VISIBILITY).forEach((key) => {
    const input = createEl('input', {
      attrs: { type: 'checkbox' },
    });
    input.checked = appState.sectionVisibility[key] !== false;
    input.addEventListener('change', () => setSectionVisible(key, input.checked));
    list.append(createEl('label', { className: 'settings-toggle' }, [
      createEl('span', { text: getSectionLabel(key) }),
      input,
    ]));
  });
}

export function openSettingsPanel() {
  renderSettingsPanel();
  setModalOpen('settingsOverlay', true);
}

export function closeSettingsPanel() {
  setModalOpen('settingsOverlay', false);
}
