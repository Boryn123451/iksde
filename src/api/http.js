export async function fetchJson(url, { timeout = 10000, headers = {} } = {}) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { signal: controller.signal, headers });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    window.clearTimeout(timer);
  }
}

export async function fetchText(url, { timeout = 10000, headers = {} } = {}) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { signal: controller.signal, headers });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } finally {
    window.clearTimeout(timer);
  }
}

export function buildUrl(base, params) {
  const url = new URL(base);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
  });
  return url.toString();
}
