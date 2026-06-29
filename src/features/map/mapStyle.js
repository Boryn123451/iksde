const STYLE_URLS = {
  dark: 'https://tiles.openfreemap.org/styles/dark',
  light: 'https://tiles.openfreemap.org/styles/positron',
};

export const MAP_LIMITS = {
  minZoom: 1.4,
  maxZoom: 15.5,
};

const CONTEXT_PLACE_LABELS = [
  'place_other',
  'place_suburb',
  'place_village',
  'place_town',
  'place_city',
  'place_city_large',
];

const HIDDEN_PLACE_LABELS = [
  'place_state',
];

const COUNTRY_LABELS = [
  'place_country_other',
  'place_country_minor',
  'place_country_major',
];

export const ADMIN_BOUNDARIES = [
  'boundary_state',
];

export const COUNTRY_BOUNDARIES = [
  'boundary_country_z0-4',
  'boundary_country_z5-',
];

export function mapStyleUrl(theme) {
  return theme === 'light' ? STYLE_URLS.light : STYLE_URLS.dark;
}

export function styleTheme() {
  return document.body?.classList.contains('light') ? 'light' : 'dark';
}

export function tuneBaseMapStyle(map, theme = styleTheme()) {
  if (!map?.getStyle?.()) return;
  ADMIN_BOUNDARIES.forEach((layerId) => {
    if (!map.getLayer(layerId)) return;
    try {
      map.setLayoutProperty(layerId, 'visibility', 'visible');
      map.setPaintProperty(layerId, 'line-color', theme === 'light' ? '#ffffff' : '#f8fafc');
      map.setPaintProperty(layerId, 'line-opacity', theme === 'light' ? .92 : .9);
      map.setPaintProperty(layerId, 'line-width', ['interpolate', ['linear'], ['zoom'], 2, .95, 5, 1.45, 8, 2.05, 11, 2.55]);
      map.setPaintProperty(layerId, 'line-blur', 0);
      map.setPaintProperty(layerId, 'line-dasharray', [6, 0]);
    } catch {
      // Boundary layer styling is optional and depends on provider style.
    }
  });

  COUNTRY_BOUNDARIES.forEach((layerId) => {
    if (!map.getLayer(layerId)) return;
    try {
      map.setLayoutProperty(layerId, 'visibility', 'visible');
      map.setPaintProperty(layerId, 'line-color', theme === 'light' ? '#b91c1c' : '#ff4d5a');
      map.setPaintProperty(layerId, 'line-opacity', 1);
      map.setPaintProperty(layerId, 'line-width', ['interpolate', ['linear'], ['zoom'], 1.5, 1.45, 4, 2.05, 7, 2.8, 10, 3.35]);
      map.setPaintProperty(layerId, 'line-blur', 0);
    } catch {
      // Boundary layer styling is optional and depends on provider style.
    }
  });

  HIDDEN_PLACE_LABELS.forEach((layerId) => {
    if (!map.getLayer(layerId)) return;
    try {
      map.setLayoutProperty(layerId, 'visibility', 'none');
    } catch {
      // External style layers may change. Tuning must never break the map.
    }
  });

  CONTEXT_PLACE_LABELS.forEach((layerId) => {
    if (!map.getLayer(layerId)) return;
    try {
      map.setLayoutProperty(layerId, 'visibility', 'visible');
      map.setLayoutProperty(layerId, 'text-field', ['coalesce', ['get', 'name:pl'], ['get', 'name:latin'], ['get', 'name:en'], ['get', 'name']]);
      map.setPaintProperty(layerId, 'text-color', theme === 'light' ? 'rgba(15,23,42,.72)' : 'rgba(203,213,225,.66)');
      map.setPaintProperty(layerId, 'text-halo-color', theme === 'light' ? 'rgba(255,255,255,.82)' : 'rgba(2,6,12,.78)');
      map.setPaintProperty(layerId, 'text-halo-width', theme === 'light' ? 1.1 : 1.4);
    } catch {
      // External style layers may change. Context labels are optional.
    }
  });

  COUNTRY_LABELS.forEach((layerId) => {
    if (!map.getLayer(layerId)) return;
    try {
      map.setPaintProperty(layerId, 'text-color', theme === 'light' ? '#111827' : '#dbeafe');
      map.setPaintProperty(layerId, 'text-halo-color', theme === 'light' ? 'rgba(255,255,255,.88)' : 'rgba(2,6,12,.88)');
      map.setPaintProperty(layerId, 'text-halo-width', theme === 'light' ? 1.5 : 1.8);
      map.setLayoutProperty(layerId, 'text-field', ['coalesce', ['get', 'name:pl'], ['get', 'name:latin'], ['get', 'name:en'], ['get', 'name']]);
      map.setLayoutProperty(layerId, 'text-size', ['interpolate', ['linear'], ['zoom'], 2, 10, 5, 13, 9, 15]);
    } catch {
      // Paint/layout support differs between style versions.
    }
  });
}
