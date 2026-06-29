const SENTENCE_ABBREVIATIONS = new Set([
  'al',
  'ang',
  'dr',
  'im',
  'itd',
  'itp',
  'm.in',
  'maks',
  'min',
  'niem',
  'np',
  'nr',
  'ok',
  'pl',
  'pol',
  'prof',
  'pw',
  'r',
  'św',
  'tj',
  'tzw',
  'tys',
  'ul',
]);

function isAbbreviationEnd(text, dotIndex) {
  const before = text.slice(0, dotIndex);
  const after = text.slice(dotIndex + 1);
  const previous = before.split(/\s+/u).pop()?.replace(/[()[\],;:]+/gu, '').toLowerCase() || '';
  if (/\d$/u.test(before) && /^\d/u.test(after)) return true;
  if (SENTENCE_ABBREVIATIONS.has(previous)) return true;
  if (/^[A-ZĄĆĘŁŃÓŚŹŻ]$/u.test(before.split(/\s+/u).pop() || '')) return true;
  return false;
}

function findSentenceEnd(slice) {
  const matches = [...slice.matchAll(/[.!?](?=\s|$)/gu)];
  for (let i = matches.length - 1; i >= 0; i -= 1) {
    const index = matches[i].index;
    const mark = slice[index];
    if (mark === '.' && isAbbreviationEnd(slice, index)) continue;
    return index + 1;
  }
  return -1;
}

export function shortenText(value, max = 150) {
  const text = String(value || '').replace(/\s+/gu, ' ').trim();
  if (text.length <= max) return text;
  const slice = text.slice(0, max + 1);
  const sentenceEnd = findSentenceEnd(slice);
  if (sentenceEnd >= Math.floor(max * 0.45)) return slice.slice(0, sentenceEnd).trim();
  const comma = slice.lastIndexOf(', ');
  if (comma >= Math.floor(max * 0.65)) return `${slice.slice(0, comma).trim()}…`;
  const space = slice.lastIndexOf(' ');
  return `${slice.slice(0, space > 40 ? space : max).trim()}…`;
}

export function stripMarkup(value) {
  return String(value || '')
    .replace(/\[\[([^|\]]+\|)?([^\]]+)\]\]/gu, '$2')
    .replace(/\{\{[^{}]*\}\}/gu, ' ')
    .replace(/''+/gu, '')
    .replace(/\*\*/gu, '')
    .replace(/^[:#*;\s-]+/gu, '')
    .replace(/<[^>]+>/gu, '')
    .replace(/\s+/gu, ' ')
    .trim();
}
