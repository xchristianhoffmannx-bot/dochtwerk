// Sichern & Hinweise (#/daten): Sicherung, Wiederherstellung, Speicherstatus, Merkzettel (Spec 6.11).
import { h, confirmDialog, toast } from '../components.js';
import { icon } from '../icons.js';
import { T, APP_VERSION } from '../../texts.js';
import { mergeLegacy, isLegacy } from '../../core/legacy-import.js';
import { getState, commit, photoBytes, restoreAll, requestPersist } from '../../store.js';
import { download, pickImage, rebuildRecord } from '../../photos.js';
import { buildBackupZip, parseBackup, dateStamp } from '../../core/backup.js';
import { formatNumber } from '../../core/units.js';

const D = T.data;
const mb = (n) => `${formatNumber(n / 1048576, n >= 10485760 ? 0 : 1)} MB`;

export default function data() {
  const msg = h('div', { 'aria-live': 'polite' });
  const say = (text, kind = 'ok') => msg.replaceChildren(h('p', { class: `msg msg-${kind}` }, text));

  async function backup() {
    try {
      const missing = new Set(); // Namen der Kerzen, bei denen ein Foto im Speicher fehlt
      const zip = await buildBackupZip(getState(), photoBytes, new Date(), (c) => missing.add(c.name || T.gallery.unnamed));
      const name = `dochtwerk-sicherung-${dateStamp()}.zip`;
      download(zip, name);
      if (missing.size) say(D.backupPartial(name, [...missing]), 'warn');
      else say(D.backupDone(name));
    } catch { say(D.backupFailed, 'error'); }
  }

  async function restore() {
    const file = await pickImage(false, '.zip,application/zip');
    if (!file) return;
    let parsed;
    try { parsed = parseBackup(new Uint8Array(await file.arrayBuffer())); } catch { say(D.invalid, 'error'); return; }
    if (!(await confirmDialog(D.restoreConfirm))) return;
    // erst alle Fotos aufbereiten, dann die alten Daten in einem Schritt ersetzen
    const recs = [];
    try {
      const meta = new Map(parsed.state.candles.flatMap((c) => c.photos).map((p) => [p.id, p.createdAt]));
      for (const p of parsed.photos) {
        recs.push([p.id, await rebuildRecord(new Blob([p.data], { type: 'image/jpeg' }), meta.get(p.id) ?? new Date().toISOString())]);
      }
    } catch { say(D.invalid, 'error'); return; }
    // Erfolg erst melden, wenn alles geschrieben ist; bei einem Fehler bleibt der alte Bestand vollständig
    try { await restoreAll(parsed.state, recs); } catch { say(D.restoreFailed, 'error'); return; }
    say(D.restored(parsed.state.candles.length, recs.length));
  }

  async function legacy() {
    const file = await pickImage(false, '.json,application/json');
    if (!file) return;
    let json;
    try { json = JSON.parse(await file.text()); } catch { json = null; }
    if (!isLegacy(json)) { say(D.legacyInvalid, 'error'); return; }
    let r;
    commit((s) => { r = mergeLegacy(json, s); });
    say(D.legacyDone(r));
  }

  const storage = h('div', { 'aria-live': 'polite' });
  (async () => {
    const s = navigator.storage;
    if (!s?.persisted) { storage.append(h('p', { class: 'hint' }, D.unknown)); return; }
    const yes = await s.persisted().catch(() => false);
    const est = await s.estimate?.().catch(() => null);
    storage.replaceChildren(
      h('p', {}, D.persisted(yes)),
      est?.quota && h('p', {}, D.usage(mb(est.usage || 0), mb(est.quota))),
      !yes && h('p', { class: 'msg msg-warn' }, D.persistWarn));
  })();
  requestPersist();

  return h('section', { class: 'screen' },
    h('h1', { class: 'screen-title' }, D.title),
    h('p', { class: 'subtitle' }, D.sub),
    msg,
    h('h2', { class: 'field-label' }, D.backupTitle),
    h('p', { class: 'hint' }, D.backupText),
    h('button', { class: 'btn btn-primary', type: 'button', onclick: backup }, icon('folder-down'), D.backup),
    h('h2', { class: 'field-label' }, D.restoreTitle),
    h('button', { class: 'btn btn-secondary', type: 'button', onclick: restore }, D.restore),
    h('h2', { class: 'field-label' }, D.legacyTitle),
    h('p', { class: 'hint' }, D.legacyText),
    h('button', { class: 'btn btn-secondary', type: 'button', onclick: legacy }, D.legacy),
    h('h2', { class: 'field-label' }, D.storageTitle),
    storage,
    h('h2', { class: 'field-label' }, D.notesTitle),
    h('p', { class: 'msg msg-warn' }, D.notesWarn),
    h('ul', { class: 'notes' }, D.notes.map((n) => h('li', {}, n))),
    h('h2', { class: 'field-label' }, D.aboutTitle),
    h('p', { class: 'hint' }, `${D.version(APP_VERSION)} · ${D.sub}`));
}
