import { recommendClothing } from '../features/clothing/clothingRecommendations.js';
import { appState } from '../state/appState.js';
import { byId, clear, createEl } from '../utils/domUtils.js';

export function renderClothingCard(current, daily) {
  const root = byId('clothingList');
  if (!root) return;
  clear(root);
  recommendClothing(current, daily, appState.location.timezone).forEach((item) => {
    root.append(createEl('span', { className: 'clothing-chip', text: item }));
  });
}
