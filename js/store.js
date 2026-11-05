// State + IndexedDB "dochtwerk" (Stores: kv, photos). Schreiben entprellt (300 ms) und beim Verlassen.
import { newState, migrate } from './core/state.js';

let db = null;
let state = null;
let timer = null;
let dirty = false;
let errorHandler = () => {};

export const getState = () => state;
export const onSaveError = (fn) => { errorHandler = fn; };

const wrap = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

function openDb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('dochtwerk', 1);
    r.onupgradeneeded = () => { r.result.createObjectStore('kv'); r.result.createObjectStore('photos'); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

function write() {
  const tx = db.transaction('kv', 'readwrite');
  tx.objectStore('kv').put(state, 'state');
  return new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = tx.onabort = () => rej(tx.error); });
}

export function flush() {
  clearTimeout(timer);
  if (!dirty || !db) return;
  dirty = false;
  write().catch(() => { dirty = true; errorHandler(); });
}

// Zustand ändern und Speichern anstoßen
export function commit(mutator) {
  mutator(state);
  dirty = true;
  clearTimeout(timer);
  timer = setTimeout(flush, 300);
  if (!db) errorHandler(); // kein Speicher verfügbar: Nutzer warnen
}

export async function loadStore() {
  try {
    db = await openDb();
    const saved = await wrap(db.transaction('kv').objectStore('kv').get('state'));
    state = saved ? migrate(saved) : newState();
    if (!saved) { dirty = true; flush(); }
  } catch {
    db = null;
    state = newState();
    errorHandler();
  }
  addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
  addEventListener('pagehide', flush);
  return state;
}

// Schutz vor dem Aufräumen durch den Browser (Spec 3.5); Ergebnis zeigt später #/daten
export const requestPersist = () => navigator.storage?.persist?.().catch(() => false);
