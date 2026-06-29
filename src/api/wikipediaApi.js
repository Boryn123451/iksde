import { buildUrl, fetchJson } from './http.js';
import { translateWikidataType } from '../utils/localizationUtils.js';
import { shortenText } from '../utils/textUtils.js';

const API = 'https://pl.wikipedia.org/w/api.php';
const REST = 'https://pl.wikipedia.org/api/rest_v1/page/summary/';
const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
const WIKIDATA_SPARQL = 'https://query.wikidata.org/sparql';

const BLOCKED = /gmina|powiat|województwo|dzielnica|osiedle|ulica|administracyj|county|district|province|oblast|region|miasto$|metro|stacja|przystanek|wybory|powstanie|bitwa|zbrodnie|zbrodnia|zburzenie|walki|akcja\s|operacja wojskowa|insurekcja|rzeczpospolita|wojna|explosion|uprising|war crimes/iu;
const PREFERRED = /muze|museum|zamek|pałac|park|ogród|katedra|kościół|teatr|galeria|pomnik|rynek|stare miasto|zabytek|widok|rezerwat|jezioro|góra|fort|garden|cathedral|castle|palace|monument|square|national park|fotoplastikon|opera|biblioteka|stadion/iu;

function distanceKm(lat1, lon1, lat2, lon2) {
  const r = 6371;
  const a = Number(lat1) * Math.PI / 180;
  const b = Number(lat2) * Math.PI / 180;
  const dLat = (Number(lat2) - Number(lat1)) * Math.PI / 180;
  const dLon = (Number(lon2) - Number(lon1)) * Math.PI / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a) * Math.cos(b) * Math.sin(dLon / 2) ** 2;
  return r * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

async function geosearch(lat, lon) {
  const data = await fetchJson(buildUrl(API, {
    action: 'query',
    list: 'geosearch',
    gscoord: `${lat}|${lon}`,
    gsradius: 10000,
    gslimit: 50,
    format: 'json',
    origin: '*',
  }), { timeout: 12000 });
  return data?.query?.geosearch || [];
}

async function summary(title) {
  const data = await fetchJson(`${REST}${encodeURIComponent(title)}`, { timeout: 9000 });
  return {
    title: data.title || title,
    description: data.description || '',
    extract: data.extract || '',
    image: data.thumbnail?.source || data.originalimage?.source || '',
    sourceUrl: data.content_urls?.desktop?.page || `https://pl.wikipedia.org/wiki/${encodeURIComponent(title.replace(/\s+/gu, '_'))}`,
  };
}

function category(item) {
  const text = `${item.title || item.name || ''} ${item.description || ''}`.toLowerCase();
  if (/muze|museum/u.test(text)) return 'Muzeum';
  if (/park|ogród|rezerwat|jezioro|góra|natura|forest|garden/u.test(text)) return 'Natura';
  if (/zamek|pałac|fort|katedra|kościół|pomnik|history|zabytek|monument|castle|palace/u.test(text)) return 'Zabytek';
  return 'Atrakcja';
}

function shortDescription(value, fallback = 'Opis niedostępny w źródle') {
  const text = shortenText(value, 145);
  return text || fallback;
}

function commonsFileUrl(fileUrl, width = 720) {
  const value = String(fileUrl || '');
  if (!value) return '';
  if (value.includes('/Special:FilePath/')) return `${value}?width=${width}`;
  return value;
}

function sourceFromArticle(article, fallbackTitle) {
  return article || `https://www.wikidata.org/wiki/Special:Search?search=${encodeURIComponent(fallbackTitle || '')}`;
}

async function wikidataAttractions(lat, lon) {
  const query = `
SELECT ?item ?itemLabel ?distance (SAMPLE(?image) AS ?image) (SAMPLE(?article) AS ?article) (SAMPLE(?typeLabel) AS ?typeLabel) WHERE {
  SERVICE wikibase:around {
    ?item wdt:P625 ?location .
    bd:serviceParam wikibase:center "Point(${Number(lon)} ${Number(lat)})"^^geo:wktLiteral;
      wikibase:radius "10";
      wikibase:distance ?distance.
  }
  ?item wdt:P31/wdt:P279* ?type .
  VALUES ?type { wd:Q33506 wd:Q570116 wd:Q4989906 wd:Q839954 wd:Q24354 wd:Q23413 wd:Q16970 wd:Q22698 wd:Q46169 wd:Q12280 wd:Q17431399 }
  OPTIONAL { ?item wdt:P18 ?image. }
  OPTIONAL { ?article schema:about ?item; schema:isPartOf <https://pl.wikipedia.org/>. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "pl,en". ?item rdfs:label ?itemLabel. ?type rdfs:label ?typeLabel. }
}
GROUP BY ?item ?itemLabel ?distance
ORDER BY ?distance
LIMIT 18`;
  const data = await fetchJson(buildUrl(WIKIDATA_SPARQL, {
    query,
    format: 'json',
  }), { timeout: 18000, headers: { Accept: 'application/sparql-results+json' } });
  return (data?.results?.bindings || []).map((row) => ({
    id: row.item?.value || row.itemLabel?.value,
    name: row.itemLabel?.value || 'Atrakcja',
    description: translateWikidataType(row.typeLabel?.value),
    category: category({ title: row.itemLabel?.value || '', description: row.typeLabel?.value || '' }),
    image: commonsFileUrl(row.image?.value),
    source: 'Wikidata / Wikimedia',
    sourceUrl: sourceFromArticle(row.article?.value, row.itemLabel?.value),
    distanceKm: Number(row.distance?.value),
  }));
}

export async function fetchWikimediaPhotos(lat, lon, cityTitle = '') {
  const photos = [];
  if (cityTitle) {
    try {
      const city = await summary(cityTitle);
      if (city.image) {
        photos.push({
          title: city.title,
          url: city.image,
          sourceUrl: city.sourceUrl,
          source: 'Wikipedia / Wikimedia',
        });
      }
    } catch {
      // Continue with Commons fallback.
    }
  }
  try {
    const data = await fetchJson(buildUrl(COMMONS_API, {
      action: 'query',
      generator: 'geosearch',
      ggscoord: `${lat}|${lon}`,
      ggsradius: 10000,
      ggslimit: 12,
      ggsnamespace: 6,
      prop: 'imageinfo',
      iiprop: 'url|extmetadata',
      iiurlwidth: 720,
      format: 'json',
      origin: '*',
    }), { timeout: 14000 });
    Object.values(data?.query?.pages || {}).forEach((page) => {
      const info = page.imageinfo?.[0];
      const url = info?.thumburl || info?.url || '';
      if (!url) return;
      photos.push({
        title: page.title?.replace(/^File:/u, '') || 'Wikimedia Commons',
        url,
        sourceUrl: info?.descriptionurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title || '')}`,
        source: 'Wikimedia Commons',
      });
    });
  } catch {
    // Photos are optional.
  }
  const seen = new Set();
  return photos.filter((photo) => {
    const key = photo.url;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 10);
}

export async function fetchWikipediaAttractions(lat, lon) {
  const candidates = await geosearch(lat, lon).catch(() => []);
  const summaries = [];
  for (const item of candidates) {
    if (BLOCKED.test(item.title)) continue;
    try {
      const data = await summary(item.title);
      if (BLOCKED.test(`${data.title} ${data.description} ${data.extract}`)) continue;
      if (!PREFERRED.test(`${data.title} ${data.description} ${data.extract}`)) continue;
      summaries.push({
        id: String(item.pageid),
        name: data.title,
        description: shortDescription(data.extract, 'Brak opisu w źródle'),
        category: category(data),
        image: data.image,
        source: 'Wikipedia / Wikimedia',
        sourceUrl: data.sourceUrl,
        distanceKm: distanceKm(lat, lon, item.lat, item.lon),
      });
    } catch {
      // Keep processing candidates.
    }
    if (summaries.length >= 18) break;
  }
  if (summaries.length < 6) {
    try {
      summaries.push(...await wikidataAttractions(lat, lon));
    } catch {
      // Keep Wikipedia-only results.
    }
  }
  const seen = new Set();
  return summaries
    .filter((item) => {
      const key = item.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => Number(Boolean(b.image)) - Number(Boolean(a.image))
      || Number(Boolean(b.description && b.description !== 'Brak opisu w źródle')) - Number(Boolean(a.description && a.description !== 'Brak opisu w źródle'))
      || a.distanceKm - b.distanceKm)
    .slice(0, 10);
}
