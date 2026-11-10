// Export- und Sicherungs-ZIPs: rein, ohne DOM und IndexedDB (Spec 6.10, 6.11).
import { writeZip, readZip } from './zip.js';
import { uniqueSlugs } from './slug.js';
import { angabenText } from './export-text.js';
import { migrate } from './state.js';

const enc = new TextEncoder();
const dec = new TextDecoder('utf-8', { fatal: true });

export const dateStamp = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const sideId = (c) => c.photos.find((p) => p.role === 'side')?.id;

// candles: exportierbare Kerzen; photoBytes(id) -> Uint8Array der Hauptdatei oder null, wenn das Foto fehlt.
// Kerzen ohne lesbares Seitenfoto werden ausgelassen und über onMissing(kerze) gemeldet.
export async function buildExportZip(candles, photoBytes, now = new Date(), onMissing = () => {}) {
  const ready = [];
  for (const c of candles) {
    const data = await photoBytes(sideId(c));
    if (data) ready.push({ c, data });
    else onMissing(c);
  }
  const slugs = uniqueSlugs(ready.map(({ c }) => c.name));
  const files = ready.flatMap(({ c, data }, i) => [
    { name: `${slugs[i]}/seite.jpg`, data },
    { name: `${slugs[i]}/angaben.txt`, data: enc.encode(angabenText(c)) },
  ]);
  return writeZip(files, now);
}

// Ein fehlendes Foto bricht die Sicherung nicht ab: es wird über onMissing(kerze, foto) gemeldet,
// und state.json enthält den Verweis nicht, damit sich die Sicherung wiederherstellen lässt.
export async function buildBackupZip(state, photoBytes, now = new Date(), onMissing = () => {}) {
  const files = [], gone = new Set();
  for (const c of state.candles) {
    for (const p of c.photos) {
      const data = await photoBytes(p.id);
      if (data) files.push({ name: `fotos/${p.id}.jpg`, data });
      else { gone.add(p.id); onMissing(c, p); }
    }
  }
  const saved = gone.size
    ? { ...state, candles: state.candles.map((c) => ({ ...c, photos: c.photos.filter((p) => !gone.has(p.id)) })) }
    : state;
  return writeZip([{ name: 'state.json', data: enc.encode(JSON.stringify(saved)) }, ...files], now);
}

// bytes -> { state, photos: [{ id, data }] }; wirft bei ungültiger Sicherung
export function parseBackup(bytes) {
  const files = readZip(bytes);
  const sj = files.find((f) => f.name === 'state.json');
  if (!sj) throw new Error('state.json fehlt');
  const state = migrate(JSON.parse(dec.decode(sj.data)));
  if (!Array.isArray(state.candles) || !Array.isArray(state.glasses) || !state.settings) throw new Error('Zustand unvollständig');
  const byName = new Map(files.map((f) => [f.name, f.data]));
  const photos = [];
  for (const c of state.candles) {
    if (!Array.isArray(c.photos)) throw new Error('Kerze ohne Fotoliste');
    for (const p of c.photos) {
      const data = byName.get(`fotos/${p.id}.jpg`);
      if (!data) throw new Error(`Foto ${p.id} fehlt`);
      photos.push({ id: p.id, data });
    }
  }
  return { state, photos };
}
