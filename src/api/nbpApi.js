import { fetchJson } from './http.js';

const NBP = 'https://api.nbp.pl/api';

export async function fetchNbpTable(table = 'a') {
  const code = String(table || 'a').toLowerCase();
  const data = await fetchJson(`${NBP}/exchangerates/tables/${code}/?format=json`, { timeout: 9000 });
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.rates?.length) throw new Error('Brak tabeli kursowej NBP.');
  return row;
}

export async function fetchNbpCurrencyTables() {
  const [a, b] = await Promise.allSettled([fetchNbpTable('a'), fetchNbpTable('b')]);
  const tables = [a, b]
    .filter((result) => result.status === 'fulfilled')
    .map((result) => result.value);
  if (!tables.length) throw new Error('Brak tabel kursowych NBP.');
  return tables;
}

export async function fetchNbpCurrencies() {
  const rows = new Map();
  rows.set('PLN', { code: 'PLN', name: 'złoty polski', source: 'NBP' });
  const tables = await fetchNbpCurrencyTables();
  tables.forEach((table) => {
    (table.rates || []).forEach((rate) => {
      const code = String(rate.code || '').toUpperCase();
      if (!code || rows.has(code)) return;
      rows.set(code, {
        code,
        name: rate.currency || code,
        source: 'NBP',
      });
    });
  });
  return [...rows.values()].sort((a, b) => a.code.localeCompare(b.code));
}

export async function fetchNbpCrossRate(base, target) {
  const from = String(base || '').toUpperCase();
  const to = String(target || '').toUpperCase();
  const today = new Date().toISOString().slice(0, 10);
  if (!from || !to) throw new Error('Brak kodu waluty.');
  if (from === to) return { rate: 1, date: today, source: 'NBP', sameCurrency: true };

  const tables = await fetchNbpCurrencyTables();
  const rates = new Map();
  let effectiveDate = '';
  rates.set('PLN', 1);
  tables.forEach((table) => {
    if (!effectiveDate || table.effectiveDate > effectiveDate) effectiveDate = table.effectiveDate;
    (table.rates || []).forEach((rate) => {
      const code = String(rate.code || '').toUpperCase();
      const mid = Number(rate.mid);
      if (code && Number.isFinite(mid) && !rates.has(code)) rates.set(code, mid);
    });
  });

  const fromPln = rates.get(from);
  const toPln = rates.get(to);
  if (!Number.isFinite(fromPln) || !Number.isFinite(toPln)) {
    throw new Error('NBP nie obsługuje tej pary walut.');
  }
  return {
    rate: fromPln / toPln,
    date: effectiveDate || today,
    source: 'NBP',
  };
}
