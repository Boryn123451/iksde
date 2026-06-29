import { fetchTourismBundle } from '../api/tourismApi.js';
import { appState, setLocation, setLocationContext, setTourism } from '../state/appState.js';
import { updateHeader } from './header.js';
import { byId, clear, createEl } from '../utils/domUtils.js';
import { flagAlt, flagEmoji, flagUrl } from '../utils/countryUtils.js';
import { formatPolishDate, polishSourceLabel, translateCanadaAdvisory, translateGpiCategory } from '../utils/localizationUtils.js';
import { shortenText } from '../utils/textUtils.js';

const NO_DATA = 'Brak danych';
const TEXT_LIMITS = {
  attraction: 115,
  costLabel: 58,
  safety: 120,
  photoTitle: 52,
};

function isPlaceholderLocationName(input) {
  const text = String(input || '').trim().toLowerCase()
    .normalize('NFD')
    .replace(/\p{Mark}/gu, '');
  return !text
    || text === 'udostepniona lokalizacja'
    || text === 'moja lokalizacja'
    || text === 'shared location';
}

function applyResolvedLocationContext(context = {}) {
  if (!Number.isFinite(Number(context.lat)) || !Number.isFinite(Number(context.lon))) return;
  const hasResolvedName = !isPlaceholderLocationName(context.city);
  const hasResolvedCountry = Boolean(context.country || context.countryCodeAlpha2);
  const currentIsPlaceholder = isPlaceholderLocationName(appState.location.city);
  const currentMissingCountry = !appState.location.country && !appState.location.countryCode;
  if (!hasResolvedName && !hasResolvedCountry) return;
  if (!currentIsPlaceholder && !currentMissingCountry) return;
  setLocation({
    lat: context.lat,
    lon: context.lon,
    city: hasResolvedName ? context.city : appState.location.city,
    country: context.country || appState.location.country,
    countryCode: context.countryCodeAlpha2 || appState.location.countryCode,
    timezone: context.timezone || appState.location.timezone,
  });
  updateHeader();
}

function value(text, fallback = NO_DATA) {
  return text || fallback;
}

function sourceLink(url, label = 'Źródło') {
  if (!url) return null;
  return createEl('a', { className: 'tourism-source', text: polishSourceLabel(label), attrs: { href: url, target: '_blank', rel: 'noreferrer' } });
}

function infoTile(label, val, extra = null) {
  const children = [
    createEl('div', { className: 'tourism-label', text: label }),
    createEl('div', { className: 'tourism-value', text: value(val) }),
  ];
  if (extra) children.push(extra);
  return createEl('div', { className: 'tourism-tile' }, children);
}

function renderBasic(root, data) {
  const country = data.country || {};
  const location = data.location || {};
  const code = country.code || location.countryCodeAlpha2 || '';
  const img = location.flagUrl || country.flagUrl || flagUrl(code, 80);
  const conversion = data.costs?.fx?.text || (data.costs?.localCurrency ? 'Waluta lokalna zgodna z preferowaną. Konwersja niepotrzebna.' : '');
  root.append(createEl('section', { className: 'tourism-section tourism-basic' }, [
    createEl('div', { className: 'section-title', text: 'Podstawowe informacje' }),
    createEl('div', { className: 'tourism-basic-grid' }, [
      createEl('div', { className: 'tourism-flag-card' }, [
        code ? createEl('span', { className: 'tourism-flag-emoji', text: flagEmoji(code), attrs: { 'aria-hidden': 'true' }, style: { display: 'none' } }) : null,
        img
          ? createEl('img', {
            className: 'tourism-flag-img',
            attrs: { src: img, alt: country.flagAlt || flagAlt(code), loading: 'lazy' },
            on: {
              error: (event) => {
                if (country.fallbackFlagUrl && event.currentTarget.src !== country.fallbackFlagUrl) {
                  event.currentTarget.src = country.fallbackFlagUrl;
                  return;
                }
                event.currentTarget.style.display = 'none';
                const fallback = event.currentTarget.previousElementSibling;
                if (fallback) fallback.style.display = '';
              },
            },
          })
          : createEl('div', { className: 'tourism-empty', text: 'Brak flagi z FlagCDN / REST Countries' }),
        createEl('div', { className: 'tourism-country-name', text: value(country.name || location.country) }),
      ]),
      infoTile('Kraj', country.officialName || country.name || location.country),
      infoTile('Waluta lokalna', location.localCurrencyCode ? `${location.localCurrencyCode} ${location.localCurrencyName || ''}` : country.currencies),
      infoTile('Konwersja waluty', conversion),
      infoTile('Języki', country.languages),
      infoTile('Region', country.regionLabel || [country.region, country.subregion].filter(Boolean).join(' / ')),
    ]),
  ]));
}

function renderAttractions(root, attractions) {
  root.append(createEl('section', { className: 'tourism-section' }, [
    createEl('div', { className: 'section-title', text: 'Atrakcje turystyczne' }),
    attractions.length
      ? createEl('div', { className: 'tourism-attractions' }, attractions.slice(0, 10).map((item) => createEl('article', { className: 'tourism-attraction' }, [
        item.image
          ? createEl('img', { className: 'tourism-attraction-img', attrs: { src: item.image, alt: item.name, loading: 'lazy' } })
          : createEl('div', { className: 'tourism-no-image', text: 'Brak zdjęcia w Wikimedia' }),
        createEl('div', { className: 'tourism-attraction-body' }, [
          createEl('div', { className: 'tourism-chip', text: item.category || NO_DATA }),
          createEl('h3', { text: item.name }),
          createEl('p', { text: shortenText(item.description || NO_DATA, TEXT_LIMITS.attraction) }),
          item.distanceKm != null ? createEl('div', { className: 'tourism-note', text: `${Number(item.distanceKm).toFixed(1)} km od centrum` }) : null,
          sourceLink(item.sourceUrl, item.source || 'Wikipedia'),
        ]),
      ])))
      : createEl('div', { className: 'tourism-empty', text: 'Brak atrakcji z Wikivoyage oraz Wikipedia / Wikimedia dla tej lokalizacji.' }),
  ]));
}

function renderCostItem(item) {
  return createEl('div', { className: 'tourism-cost-item' }, [
    createEl('div', { className: 'tourism-label', text: shortenText(item.label || NO_DATA, TEXT_LIMITS.costLabel) }),
    createEl('div', { className: 'tourism-value', text: value(item.value) }),
    item.note ? createEl('div', { className: 'tourism-note', text: item.note }) : null,
    sourceLink(item.sourceUrl, item.source || 'Źródło'),
  ]);
}

function renderCosts(root, costs = {}) {
  const sections = Array.isArray(costs.sections) ? costs.sections : [];
  root.append(createEl('section', { className: 'tourism-section' }, [
    createEl('div', { className: 'section-title-row' }, [
      createEl('div', { className: 'section-title', text: 'Koszty życia' }),
      costs.fx ? createEl('div', { className: 'tourism-source', text: costs.fx.text }) : null,
    ]),
    createEl('div', { className: 'tourism-note', text: [
      costs.localCurrency ? `Waluta lokalna: ${costs.localCurrency}` : '',
      costs.fx ? `konwersja: ${costs.preferredCurrency}` : '',
      costs.fx?.date ? `Kurs: ${costs.fx.source || 'NBP'}, ${costs.fx.date}` : '',
    ].filter(Boolean).join(' · ') || 'Brak kursu waluty.' }),
    sections.length
      ? createEl('div', { className: 'tourism-cost-sections' }, sections.map((section) => createEl('div', { className: 'tourism-cost-section' }, [
        createEl('div', { className: 'section-title-row' }, [
          createEl('div', { className: 'tourism-cost-title', text: section.title }),
          sourceLink(section.sourceUrl, section.source),
        ]),
        section.items?.length
          ? createEl('div', { className: 'tourism-cost-grid' }, section.items.map(renderCostItem))
          : createEl('div', { className: 'tourism-empty', text: section.empty || 'Brak danych dla tej sekcji.' }),
      ])))
      : createEl('div', { className: 'tourism-empty', text: 'Brak danych kosztów dla tej lokalizacji.' }),
  ]));
}

function compactTile(label, main, meta, source) {
  return createEl('div', { className: 'tourism-tile' }, [
    createEl('div', { className: 'tourism-label', text: label }),
    createEl('div', { className: 'tourism-value', text: value(main) }),
    meta ? createEl('div', { className: 'tourism-note', text: meta }) : null,
    source || null,
  ]);
}

function hasText(valueToCheck) {
  return String(valueToCheck || '').trim().length > 0;
}

function localSafetyValue(local = {}) {
  if (!hasText(local.text)) return local.note;
  return 'Wikivoyage ma lokalne wskazówki bezpieczeństwa po angielsku. Otwórz źródło, aby przeczytać pełny tekst.';
}

function renderSafety(root, safety = {}) {
  const gpi = safety.gpi || {};
  const homicide = safety.homicide || {};
  const gov = safety.advisories?.gov || {};
  const canada = safety.advisories?.canada || {};
  const local = safety.local || {};
  const cityIndex = safety.cityIndex || {};
  const hasAnyAutomaticData = Boolean(
    gpi.score != null
    || Number.isFinite(homicide.value)
    || hasText(gov.text)
    || hasText(canada.advisoryLevel)
    || hasText(local.text),
  );
  const sectionHeader = createEl('div', { className: 'section-title', text: 'Bezpieczeństwo i zagrożenia' });
  if (!hasAnyAutomaticData) {
    root.append(createEl('section', { className: 'tourism-section' }, [
      sectionHeader,
      createEl('div', { className: 'tourism-empty' }, [
        createEl('div', {
          text: 'Brak automatycznie dostępnych danych bezpieczeństwa dla tej lokalizacji. Sprawdź oficjalne ostrzeżenia podróżne przed wyjazdem.',
        }),
        sourceLink(gov.sourceUrl || 'https://www.gov.pl/web/dyplomacja/informacje-dla-podrozujacych/', 'Sprawdź gov.pl'),
      ]),
    ]));
    return;
  }
  root.append(createEl('section', { className: 'tourism-section' }, [
      sectionHeader,
      createEl('div', { className: 'tourism-safety-grid' }, [
      compactTile('Indeks pokoju kraju (GPI)', gpi.score ? `Wynik ${gpi.score}` : gpi.note, gpi.rank ? `poziom krajowy · pozycja ${gpi.rank} · ${gpi.year} · ${translateGpiCategory(gpi.category)}` : 'poziom krajowy', sourceLink(gpi.sourceUrl, 'Global Peace Index')),
      compactTile('Przestępstwa śmiertelne', Number.isFinite(homicide.value) ? `${Number(homicide.value).toFixed(2)} / 100 tys.` : homicide.note, homicide.year ? `poziom krajowy · ${homicide.year}` : 'poziom krajowy', sourceLink(homicide.sourceUrl, homicide.source)),
      compactTile('MSZ / gov.pl', shortenText(gov.text || gov.note, TEXT_LIMITS.safety), 'poziom krajowy · oficjalne ostrzeżenia', sourceLink(gov.sourceUrl, gov.source || 'gov.pl')),
      compactTile('Rząd Kanady', translateCanadaAdvisory(canada.advisoryLevel) || canada.note, canada.updated ? `poziom krajowy · aktualizacja ${formatPolishDate(canada.updated)}` : 'poziom krajowy · ostrzeżenie podróżne', sourceLink(canada.sourceUrl, 'Rząd Kanady')),
      compactTile('Lokalne wskazówki bezpieczeństwa', shortenText(localSafetyValue(local), TEXT_LIMITS.safety), 'poziom miasta · opisowe wskazówki', sourceLink(local.sourceUrl, local.source)),
      compactTile('Miejski indeks bezpieczeństwa', cityIndex.note, 'poziom miasta', null),
    ]),
  ]));
}

function renderPhotos(root, photos) {
  root.append(createEl('section', { className: 'tourism-section' }, [
    createEl('div', { className: 'section-title', text: 'Zdjęcia' }),
    photos.length
      ? createEl('div', { className: 'tourism-gallery' }, photos.map((photo) => createEl('a', {
        className: 'tourism-photo',
        attrs: { href: photo.sourceUrl || photo.url, target: '_blank', rel: 'noreferrer', title: photo.title },
      }, [
        createEl('img', { attrs: { src: photo.url, alt: photo.title || 'Zdjęcie', loading: 'lazy' } }),
        createEl('span', { text: shortenText(photo.title || '', TEXT_LIMITS.photoTitle) }),
      ])))
      : createEl('div', { className: 'tourism-empty', text: 'Brak zdjęć w Wikimedia dla tej lokalizacji.' }),
  ]));
}

export function renderTourismView(data = appState.tourism.data) {
  const root = byId('tourismContent');
  if (!root) return;
  clear(root);
  if (appState.tourism.loading) {
    root.append(createEl('section', { className: 'tourism-section' }, [
      createEl('div', { className: 'section-title', text: 'Turystyka' }),
      createEl('div', { className: 'tourism-empty', text: 'Pobieranie danych turystycznych...' }),
    ]));
    return;
  }
  if (!data) {
    root.append(createEl('section', { className: 'tourism-section' }, [
      createEl('div', { className: 'section-title', text: 'Turystyka' }),
      createEl('div', { className: 'tourism-empty', text: Number.isFinite(appState.location.lat) ? NO_DATA : 'Wybierz miasto.' }),
    ]));
    return;
  }
  root.append(createEl('div', { className: 'tourism-hero' }, [
    createEl('div', { className: 'tourism-kicker', text: 'TRYB TURYSTYKA' }),
    createEl('h2', { text: data.location.city || appState.location.city || NO_DATA }),
    createEl('p', { text: [data.country?.name || data.location.country, data.location.countryCodeAlpha2].filter(Boolean).join(' · ') || NO_DATA }),
  ]));
  renderBasic(root, data);
  renderAttractions(root, data.attractions || []);
  renderCosts(root, data.costs);
  renderSafety(root, data.safety);
  renderPhotos(root, data.photos || []);
}

export async function loadTourismForCurrentLocation() {
  if (!Number.isFinite(appState.location.lat) || !Number.isFinite(appState.location.lon)) {
    setTourism({ data: null, loading: false, error: '' });
    renderTourismView();
    return;
  }
  setTourism({ loading: true, error: '' });
  renderTourismView();
  try {
    const data = await fetchTourismBundle(appState.location);
    applyResolvedLocationContext(data.location);
    setLocationContext(data.location);
    setTourism({ data, loading: false, error: '' });
  } catch (error) {
    setTourism({ data: null, loading: false, error: error.message || 'Błąd danych turystycznych' });
  }
  renderTourismView();
}
