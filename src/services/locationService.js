import { STORAGE_KEYS } from '../config/constants.js';
import { normalizeLocation, normalizeLocations, readJson, writeJson } from './storageService.js';

export function getLastLocation() {
  return normalizeLocation(readJson(STORAGE_KEYS.lastLocation, null));
}

export function saveLastLocation(location) {
  const loc = normalizeLocation(location);
  if (loc) writeJson(STORAGE_KEYS.lastLocation, loc);
}

export function getRecent() {
  return normalizeLocations(readJson(STORAGE_KEYS.recent, []), 8);
}

export function saveToRecent(location) {
  const loc = normalizeLocation(location);
  if (!loc) return;
  const rest = getRecent().filter((item) => Math.abs(item.lat - loc.lat) > 0.01 || Math.abs(item.lon - loc.lon) > 0.01);
  writeJson(STORAGE_KEYS.recent, [loc, ...rest].slice(0, 8));
}

export function getFavorites() {
  return normalizeLocations(readJson(STORAGE_KEYS.favorites, []), 30);
}

export function saveFavorites(favorites) {
  writeJson(STORAGE_KEYS.favorites, normalizeLocations(favorites, 30));
}

export function isFavorite(lat, lon) {
  return getFavorites().some((item) => Math.abs(item.lat - Number(lat)) < 0.01 && Math.abs(item.lon - Number(lon)) < 0.01);
}

export function toggleFavoriteLocation(location) {
  const loc = normalizeLocation(location);
  if (!loc) return false;
  const favorites = getFavorites();
  const index = favorites.findIndex((item) => Math.abs(item.lat - loc.lat) < 0.01 && Math.abs(item.lon - loc.lon) < 0.01);
  if (index >= 0) {
    favorites.splice(index, 1);
    saveFavorites(favorites);
    return false;
  }
  saveFavorites([loc, ...favorites].slice(0, 30));
  return true;
}

export function getHomeLocation() {
  return normalizeLocation(readJson(STORAGE_KEYS.home, null));
}

export function setHomeLocation(location) {
  const loc = normalizeLocation(location);
  if (loc) writeJson(STORAGE_KEYS.home, loc);
}

export function isHomeLocation(lat, lon) {
  const home = getHomeLocation();
  return Boolean(home) && Math.abs(home.lat - Number(lat)) < 0.01 && Math.abs(home.lon - Number(lon)) < 0.01;
}
