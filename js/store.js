// State + IndexedDB "dochtwerk" (Stores: kv, photos). Schreiben entprellt (300 ms) und beim Verlassen.
import { newState, migrate } from './core/state.js';
import { photoDiff, dropPhotoRefs } from './core/candle.js';

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

// Schreibt sofort. Ergebnis: Promise<boolean>, true = der Zustand liegt sicher im Speicher.
export function flush() {
  clearTimeout(timer);
  if (!dirty || !db) return Promise.resolve(!dirty);
  dirty = false;
  return write().then(() => true, () => { dirty = true; errorHandler(); return false; });
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

// Fotos: Store "photos", Schlüssel = Foto-ID, Wert { blob, thumb, width, height, createdAt }
function photoTx(mode, fn) {
  if (!db) return Promise.reject(new Error('Kein Speicher verfügbar'));
  const tx = db.transaction('photos', mode);
  const r = fn(tx.objectStore('photos'));
  return new Promise((res, rej) => {
    tx.oncomplete = () => res(r.result);
    tx.onerror = tx.onabort = () => rej(tx.error);
  });
}
export const putPhoto = (id, rec) => photoTx('readwrite', (s) => s.put(rec, id));
export const getPhoto = (id) => photoTx('readonly', (s) => s.get(id));
export const deletePhoto = (id) => photoTx('readwrite', (s) => s.delete(id));

const photoKeys = () => photoTx('readonly', (s) => s.getAllKeys());

// Hauptdatei eines Fotos als Bytes; null, wenn es das Foto nicht (mehr) gibt
export async function photoBytes(id) {
  const rec = id == null ? null : await getPhoto(id);
  return rec?.blob ? new Uint8Array(await rec.blob.arrayBuffer()) : null;
}

// Wiederherstellen in EINER Transaktion über beide Stores: danach ist entweder alles ersetzt oder nichts.
// photoRecs: [[id, Datensatz]]. Das Zustandsobjekt bleibt dasselbe (Screens halten Referenzen), der Inhalt wird ersetzt.
export async function restoreAll(next, photoRecs) {
  if (!db) throw new Error('Kein Speicher verfügbar');
  await flush(); // offene Änderungen zuerst schreiben, damit bei einem Abbruch der alte Stand vollständig ist
  await new Promise((res, rej) => {
    const tx = db.transaction(['kv', 'photos'], 'readwrite');
    tx.oncomplete = res;
    tx.onerror = tx.onabort = () => rej(tx.error || new Error('Wiederherstellung abgebrochen'));
    try {
      const photos = tx.objectStore('photos');
      photos.clear();
      for (const [id, rec] of photoRecs) photos.put(rec, id);
      tx.objectStore('kv').put(next, 'state');
    } catch (e) {
      tx.abort(); // z. B. ungültiger Schlüssel: nichts davon darf gespeichert werden
      rej(e);
    }
  });
  clearTimeout(timer);
  dirty = false;
  for (const k of Object.keys(state)) delete state[k];
  Object.assign(state, next);
}

// Beim Start aufräumen: Verweise ohne Foto entfernen, Fotos ohne Verweis löschen
// (entstehen, wenn die App mitten in einem Vorgang beendet wurde). Ergebnis: Zahl der entfernten Verweise.
export async function reconcilePhotos() {
  if (!db) return 0;
  try {
    const { missing, orphans } = photoDiff(state, await photoKeys());
    if (missing.length) commit((s) => dropPhotoRefs(s, missing));
    await Promise.all(orphans.map((id) => deletePhoto(id).catch(() => {})));
    return missing.length;
  } catch {
    return 0; // Aufräumen ist nie ein Grund, den Start zu verhindern
  }
}

// Schutz vor dem Aufräumen durch den Browser (Spec 3.5); Ergebnis zeigt später #/daten
export const requestPersist = () => navigator.storage?.persist?.().catch(() => false);
