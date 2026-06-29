import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const baseInputPath = resolve(root, '.cache/geonames/cities15000.txt');
const detailInputPath = resolve(root, '.cache/geonames/cities500/cities500.txt');
const baseOutputPath = resolve(root, 'public/data/world-cities.min.json');
const detailOutputDir = resolve(root, 'public/data/world-cities-detail');
const detailIndexPath = resolve(detailOutputDir, 'index.json');

const CAPITAL_CODES = new Set(['PPLC', 'PPLC2']);
const ADMIN_CODES = new Set(['PPLA', 'PPLA2', 'PPLA3', 'PPLA4']);
const CITY_FEATURE_CODES = new Set(['PPL', 'PPLC', 'PPLC2', 'PPLA', 'PPLA2', 'PPLA3', 'PPLA4', 'PPLA5']);
const DETAIL_SHARD_DEGREES = 5;
const BASE_MIN_POPULATION = 15000;
const LOCAL_NAME_OVERRIDES = new Map([
  ['PL:Warsaw', 'Warszawa'],
  ['DE:Munich', 'München'],
  ['DE:Nuremberg', 'Nürnberg'],
  ['DE:Cologne', 'Köln'],
  ['DE:Dusseldorf', 'Düsseldorf'],
  ['AT:Vienna', 'Wien'],
  ['CH:Zurich', 'Zürich'],
  ['SE:Gothenburg', 'Göteborg'],
  ['TR:Istanbul', 'İstanbul'],
  ['CZ:Prague', 'Praha'],
  ['IT:Rome', 'Roma'],
  ['IT:Milan', 'Milano'],
  ['IT:Naples', 'Napoli'],
  ['IT:Turin', 'Torino'],
  ['PT:Lisbon', 'Lisboa'],
  ['ES:Seville', 'Sevilla'],
  ['MX:Mexico City', 'Ciudad de México'],
]);

function isLatinText(value) {
  return /^[\p{Script=Latin}\p{Mark}\p{Number}\s.'’()/-]+$/u.test(value);
}

function hasLatinDiacritic(value) {
  return /[^\u0000-\u007f]/u.test(value) && isLatinText(value);
}

function asciiFold(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/\p{Mark}/gu, '')
    .replace(/ł/gu, 'l')
    .replace(/Ł/gu, 'L')
    .replace(/ß/gu, 'ss')
    .replace(/ø/gu, 'o')
    .replace(/Ø/gu, 'O')
    .replace(/đ/gu, 'd')
    .replace(/Đ/gu, 'D')
    .replace(/ı/gu, 'i');
}

function isReasonableDisplayName(value) {
  const text = String(value || '').trim();
  if (text.length < 2 || text.length > 80) return false;
  if (!isLatinText(text)) return false;
  if (/^\p{Lowercase_Letter}+$/u.test(text)) return false;
  if (text.includes('[') || text.includes(']') || text.includes('ˈ')) return false;
  return true;
}

function pickDisplayName(fields) {
  const rawName = fields[1] || fields[2] || '';
  const asciiName = fields[2] || rawName;
  const country = fields[8] || '';
  const override = LOCAL_NAME_OVERRIDES.get(`${country}:${asciiName}`) || LOCAL_NAME_OVERRIDES.get(`${country}:${rawName}`);
  if (override) return override;
  if (hasLatinDiacritic(rawName)) return rawName;

  const foldedAscii = asciiFold(asciiName).toLowerCase();
  const alternates = String(fields[3] || '')
    .split(',')
    .map((item) => item.trim())
    .filter(isReasonableDisplayName);
  const diacriticCandidate = alternates
    .filter(hasLatinDiacritic)
    .map((candidate) => ({
      candidate,
      folded: asciiFold(candidate).toLowerCase(),
    }))
    .filter((item) => item.folded === foldedAscii || item.folded.startsWith(foldedAscii) || foldedAscii.startsWith(item.folded))
    .sort((a, b) => a.candidate.length - b.candidate.length)[0];
  return diacriticCandidate?.candidate || rawName || asciiName;
}

function round(value, digits) {
  const factor = 10 ** digits;
  return Math.round(Number(value) * factor) / factor;
}

function normalizeCityLine(line) {
  const fields = line.split('\t');
  const name = pickDisplayName(fields);
  const lat = Number(fields[4]);
  const lon = Number(fields[5]);
  const featureCode = fields[7] || '';
  const country = fields[8] || '';
  const population = Number(fields[14] || 0);
  if (!CITY_FEATURE_CODES.has(featureCode)) return null;
  if (!name || !country || !Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(population)) return null;
  return [
    String(name).slice(0, 80),
    country,
    round(lat, 4),
    round(lon, 4),
    population,
    CAPITAL_CODES.has(featureCode) ? 1 : 0,
    ADMIN_CODES.has(featureCode) ? 1 : 0,
  ];
}

function parseCities(text) {
  return text
  .split(/\r?\n/u)
  .filter(Boolean)
  .map(normalizeCityLine)
  .filter(Boolean);
}

function shardKey(lat, lon) {
  const row = Math.max(0, Math.min(35, Math.floor((Number(lat) + 90) / DETAIL_SHARD_DEGREES)));
  const col = Math.max(0, Math.min(71, Math.floor((Number(lon) + 180) / DETAIL_SHARD_DEGREES)));
  return `r${String(row).padStart(2, '0')}_c${String(col).padStart(2, '0')}`;
}

async function writeBaseCatalog() {
  const text = await readFile(baseInputPath, 'utf8');
  const cities = parseCities(text)
    .sort((a, b) => b[4] - a[4] || a[0].localeCompare(b[0]));

  const payload = {
    version: 'cities15000-geonames-localnames-2026-02',
    source: 'GeoNames cities15000 via npm/jsDelivr package cities15000',
    sourceUrl: 'https://cdn.jsdelivr.net/npm/cities15000/cities15000.txt',
    packageUrl: 'https://www.npmjs.com/package/cities15000',
    columns: ['name', 'country', 'lat', 'lon', 'population', 'capital', 'admin'],
    count: cities.length,
    cities,
  };

  await mkdir(dirname(baseOutputPath), { recursive: true });
  await writeFile(baseOutputPath, `${JSON.stringify(payload)}\n`, 'utf8');
  console.log(`Wrote ${cities.length} base cities to ${baseOutputPath}`);
}

async function writeDetailShards() {
  const text = await readFile(detailInputPath, 'utf8');
  const shards = new Map();
  let totalCount = 0;
  parseCities(text)
    .filter((city) => city[4] < BASE_MIN_POPULATION)
    .forEach((city) => {
      const key = shardKey(city[2], city[3]);
      const bucket = shards.get(key) || [];
      bucket.push(city);
      shards.set(key, bucket);
      totalCount += 1;
    });

  await rm(detailOutputDir, { recursive: true, force: true });
  await mkdir(detailOutputDir, { recursive: true });
  const index = {};
  for (const [key, cities] of shards.entries()) {
    cities.sort((a, b) => b[4] - a[4] || a[0].localeCompare(b[0]));
    index[key] = cities.length;
    await writeFile(resolve(detailOutputDir, `${key}.json`), `${JSON.stringify(cities)}\n`, 'utf8');
  }

  const payload = {
    version: 'cities500-geonames-localnames-shards-2026-02',
    source: 'GeoNames cities500',
    sourceUrl: 'https://download.geonames.org/export/dump/cities500.zip',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    shardDegrees: DETAIL_SHARD_DEGREES,
    minPopulation: 500,
    maxPopulationExclusive: BASE_MIN_POPULATION,
    columns: ['name', 'country', 'lat', 'lon', 'population', 'capital', 'admin'],
    totalCount,
    shardCount: shards.size,
    shards: index,
  };
  await writeFile(detailIndexPath, `${JSON.stringify(payload)}\n`, 'utf8');
  console.log(`Wrote ${totalCount} detail cities in ${shards.size} shards to ${detailOutputDir}`);
}

await writeBaseCatalog();
await writeDetailShards();
