const REGION_PL = {
  Africa: 'Afryka',
  Americas: 'Ameryki',
  Antarctica: 'Antarktyda',
  Asia: 'Azja',
  Europe: 'Europa',
  Oceania: 'Oceania',
};

const SUBREGION_PL = {
  'Australia and New Zealand': 'Australia i Nowa Zelandia',
  Caribbean: 'Karaiby',
  'Central America': 'Ameryka Środkowa',
  'Central Asia': 'Azja Środkowa',
  'Central Europe': 'Europa Środkowa',
  'Eastern Africa': 'Afryka Wschodnia',
  'Eastern Asia': 'Azja Wschodnia',
  'Eastern Europe': 'Europa Wschodnia',
  Melanesia: 'Melanezja',
  Micronesia: 'Mikronezja',
  'Middle Africa': 'Afryka Środkowa',
  'North America': 'Ameryka Północna',
  'Northern Africa': 'Afryka Północna',
  'Northern Europe': 'Europa Północna',
  Polynesia: 'Polinezja',
  'South America': 'Ameryka Południowa',
  'South-Eastern Asia': 'Azja Południowo-Wschodnia',
  'Southern Africa': 'Afryka Południowa',
  'Southern Asia': 'Azja Południowa',
  'Southern Europe': 'Europa Południowa',
  'Western Africa': 'Afryka Zachodnia',
  'Western Asia': 'Azja Zachodnia',
  'Western Europe': 'Europa Zachodnia',
};

function displayName(type, codeOrName, fallback = '') {
  const value = String(codeOrName || '').trim();
  if (!value) return fallback;
  try {
    const translated = new Intl.DisplayNames(['pl'], { type }).of(value);
    return translated || fallback || value;
  } catch {
    return fallback || value;
  }
}

function sentenceCase(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function currencyNamePl(code, fallback = '') {
  return displayName('currency', code, fallback || code);
}

export function languageNamePl(code, fallback = '') {
  return sentenceCase(displayName('language', code, fallback || code));
}

export function regionNamePl(region) {
  const value = String(region || '').trim();
  return REGION_PL[value] || value;
}

export function subregionNamePl(subregion) {
  const value = String(subregion || '').trim();
  return SUBREGION_PL[value] || value;
}

export function formatRegionPl(region, subregion) {
  return [regionNamePl(region), subregionNamePl(subregion)].filter(Boolean).join(' / ');
}

export function translateCanadaAdvisory(value) {
  const text = String(value || '').trim();
  const normalized = text.toLowerCase();
  if (!text) return '';
  if (normalized.includes('take normal security precautions')) return 'Zachowaj standardowe środki ostrożności';
  if (normalized.includes('exercise a high degree of caution')) return 'Zachowaj wysoki stopień ostrożności';
  if (normalized.includes('exercise increased caution')) return 'Zachowaj zwiększoną ostrożność';
  if (normalized.includes('avoid non-essential travel')) return 'Unikaj podróży innych niż niezbędne';
  if (normalized.includes('avoid all travel')) return 'Unikaj wszelkich podróży';
  return text;
}

export function wikivoyageSectionLabel(section) {
  const value = String(section || '').toLowerCase();
  if (value === 'eat') return 'Jedzenie';
  if (value === 'drink') return 'Napoje';
  if (value === 'sleep') return 'Noclegi';
  if (value === 'buy') return 'Zakupy';
  if (value === 'get around') return 'Transport';
  return section || '';
}

export function wikivoyageRangeLabel(section, index) {
  const base = wikivoyageSectionLabel(section);
  const labels = ['budżetowo', 'standardowo', 'drożej'];
  return `${base}: ${labels[index] || `zakres ${index + 1}`}`;
}

export function translateWikidataType(value) {
  const text = String(value || '').toLowerCase();
  if (text.includes('museum')) return 'Muzeum';
  if (text.includes('tourist attraction')) return 'Atrakcja turystyczna';
  if (text.includes('monument')) return 'Pomnik lub zabytek';
  if (text.includes('archaeological')) return 'Stanowisko archeologiczne';
  if (text.includes('theatre')) return 'Teatr';
  if (text.includes('castle')) return 'Zamek';
  if (text.includes('church')) return 'Obiekt sakralny';
  if (text.includes('park')) return 'Park';
  if (text.includes('bridge')) return 'Most';
  return value || 'Atrakcja turystyczna';
}

export function translateGpiCategory(value) {
  const match = String(value || '').match(/band\s*(\d+)/iu);
  return match ? `kategoria ${match[1]}` : value || '';
}

export function polishSourceLabel(source) {
  const value = String(source || '');
  if (/Government of Canada/i.test(value)) return 'Rząd Kanady';
  if (/Global Peace Index/i.test(value)) return 'Global Peace Index';
  if (/World Bank/i.test(value)) return 'World Bank / UNODC';
  if (/Wikivoyage/i.test(value)) return 'Wikivoyage';
  if (/Wikipedia/i.test(value)) return 'Wikipedia / Wikimedia';
  if (/Wikidata/i.test(value)) return 'Wikidata / Wikimedia';
  return value || 'Źródło';
}

export function formatPolishDate(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return new Intl.DateTimeFormat('pl-PL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: raw.includes(':') ? '2-digit' : undefined,
      minute: raw.includes(':') ? '2-digit' : undefined,
    }).format(parsed);
  }
  return raw
    .replace(/\bJanuary\b/giu, 'stycznia')
    .replace(/\bFebruary\b/giu, 'lutego')
    .replace(/\bMarch\b/giu, 'marca')
    .replace(/\bApril\b/giu, 'kwietnia')
    .replace(/\bMay\b/giu, 'maja')
    .replace(/\bJune\b/giu, 'czerwca')
    .replace(/\bJuly\b/giu, 'lipca')
    .replace(/\bAugust\b/giu, 'sierpnia')
    .replace(/\bSeptember\b/giu, 'września')
    .replace(/\bOctober\b/giu, 'października')
    .replace(/\bNovember\b/giu, 'listopada')
    .replace(/\bDecember\b/giu, 'grudnia');
}

export function translateProductLabel(value) {
  const text = String(value || '').trim();
  const key = text.toLowerCase();
  const map = {
    carrots: 'marchew',
    carrot: 'marchew',
    broccoli: 'brokuły',
    celeriac: 'seler korzeniowy',
    milk: 'mleko',
    bread: 'chleb',
    water: 'woda',
    coffee: 'kawa',
    apple: 'jabłko',
    apples: 'jabłka',
    banana: 'banan',
    bananas: 'banany',
    tomato: 'pomidor',
    tomatoes: 'pomidory',
    potato: 'ziemniak',
    potatoes: 'ziemniaki',
  };
  return map[key] || text;
}
