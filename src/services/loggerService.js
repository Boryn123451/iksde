import { STORAGE_KEYS } from '../config/constants.js';
import { readJson, writeJson } from './storageService.js';

const MAX_LOGS = 500;
const MAX_STRING = 320;
const originalConsole = {};
let initialized = false;
let nativeFetch = null;

function nowIso() {
  return new Date().toISOString();
}

function trimString(value, max = MAX_STRING) {
  const text = String(value ?? '');
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function safeRequestTarget(input) {
  const raw = typeof input === 'string' ? input : input?.url;
  if (!raw) return 'unknown';
  try {
    const url = new URL(raw, window.location.href);
    return `${url.origin}${url.pathname}`;
  } catch {
    return trimString(raw, 140);
  }
}

function normalizeValue(value, depth = 0) {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: trimString(value.message),
      stack: trimString(value.stack || '', 700),
    };
  }
  if (value === null || value === undefined) return value;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return trimString(value);
  if (depth > 2) return '[object]';
  if (Array.isArray(value)) return value.slice(0, 8).map((item) => normalizeValue(item, depth + 1));
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !/key|token|secret|password|authorization/iu.test(key))
        .slice(0, 20)
        .map(([key, item]) => [key, normalizeValue(item, depth + 1)]),
    );
  }
  return trimString(value);
}

function readLogs() {
  return readJson(STORAGE_KEYS.runtimeLogs, [], Array.isArray);
}

function writeLog(level, message, details = {}) {
  const entry = {
    ts: nowIso(),
    level,
    message: trimString(message, 120),
    details: normalizeValue(details),
    url: typeof window === 'undefined' ? '' : `${window.location.pathname}${window.location.search}`,
  };
  const logs = readLogs();
  logs.push(entry);
  writeJson(STORAGE_KEYS.runtimeLogs, logs.slice(-MAX_LOGS));
  return entry;
}

export function logEvent(level, message, details = {}) {
  return writeLog(level, message, details);
}

export function readRuntimeLogs() {
  return readLogs();
}

export function clearRuntimeLogs() {
  try {
    localStorage.removeItem(STORAGE_KEYS.runtimeLogs);
    return true;
  } catch {
    return false;
  }
}

export function runtimeLogCount() {
  return readLogs().length;
}

export function runtimeLogsBlob() {
  const payload = {
    exportedAt: nowIso(),
    app: 'Pogoda — Deep Weather',
    logs: readLogs(),
  };
  return new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
}

export function runtimeLogsFilename() {
  return `pogoda-runtime-${nowIso().replace(/[:.]/gu, '-')}.json`;
}

function patchConsole() {
  ['warn', 'error'].forEach((method) => {
    if (typeof console?.[method] !== 'function' || originalConsole[method]) return;
    originalConsole[method] = console[method].bind(console);
    console[method] = (...args) => {
      writeLog(method, `console.${method}`, { args: args.map((item) => normalizeValue(item)).slice(0, 5) });
      originalConsole[method](...args);
    };
  });
}

function patchFetch() {
  if (nativeFetch || typeof window?.fetch !== 'function') return;
  nativeFetch = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const started = performance.now();
    try {
      const response = await nativeFetch(...args);
      if (!response.ok) {
        writeLog('warn', 'fetch_non_ok', {
          target: safeRequestTarget(args[0]),
          status: response.status,
          ms: Math.round(performance.now() - started),
        });
      }
      return response;
    } catch (error) {
      writeLog('error', 'fetch_failed', {
        target: safeRequestTarget(args[0]),
        ms: Math.round(performance.now() - started),
        error,
      });
      throw error;
    }
  };
}

export function initRuntimeLogger() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  patchConsole();
  patchFetch();
  window.addEventListener('error', (event) => {
    writeLog('error', 'window_error', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error,
    });
  });
  window.addEventListener('unhandledrejection', (event) => {
    writeLog('error', 'unhandled_rejection', { reason: event.reason });
  });
  writeLog('info', 'runtime_logger_ready', {
    online: navigator.onLine,
    userAgent: navigator.userAgent,
  });
}
