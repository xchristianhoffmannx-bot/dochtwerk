// Übernahme des Zubehörs aus dem alten Kerzenkalkulator (Sicherungsdatei "dessertkerzen-backup-*.json").
// Rein, ohne DOM. Alt: vessels / waxes / oils mit Textwerten, Maße in cm, Gefäßmaße INNEN.
import { parseDecimal } from './units.js';

const WALL = 3; // mm, Standard-Wandstärke im Dochtwerk
const n = (v) => { const x = parseDecimal(String(v ?? '')); return Number.isFinite(x) ? x : null; };
const pos = (v) => (n(v) > 0 ? n(v) : null);
const key = (s) => String(s ?? '').trim().toLowerCase();

export const isLegacy = (j) => !!j && typeof j === 'object' && Array.isArray(j.vessels) && Array.isArray(j.waxes) && Array.isArray(j.oils);

// Nur der Name ist Pflicht. Fehlende Maße/Gewicht bleiben leer und werden im Dochtwerk ergänzt (ältere Gefäße hatten oft nur Maße).
function glass(v) {
  if (!String(v.name ?? '').trim()) return null;
  const rect = v.shape === 'rect';
  const h = pos(v.h), w = pos(rect ? v.w : v.d), l = pos(v.l);
  // alt: Innenmaße; neu: Außenmaße + Wand, damit die Volumenschätzung gleich bleibt
  const outer = (cm, extra) => (cm ? cm * 10 + extra : null);
  return {
    name: String(v.name).trim(), manufacturer: null, shape: rect ? 'rect' : 'round',
    heightMm: outer(h, WALL), widthMm: outer(w, 2 * WALL),
    diameterTopMm: null, diameterBottomMm: null, depthMm: rect ? outer(l, 2 * WALL) : null,
    wallMm: WALL, emptyWeightG: pos(v.weight), priceMode: 'piece', price: n(v.price), packQty: 1,
  };
}

// Übernimmt in state (innerhalb von commit aufrufen). Vorhandene Wachse/Düfte gleichen Namens werden nur ergänzt.
// Gläser mit gleichem Namen werden nicht doppelt angelegt. Ergebnis: Zähler.
export function mergeLegacy(legacy, state, newId = () => crypto.randomUUID()) {
  const r = { glasses: 0, waxes: 0, scents: 0, updated: 0, skipped: 0, incomplete: 0 };

  for (const v of legacy.vessels) {
    const g = glass(v);
    if (!g) { r.skipped++; continue; }
    if (state.glasses.some((x) => key(x.name) === key(g.name))) { r.skipped++; continue; }
    state.glasses.push({ id: newId(), ...g });
    r.glasses++;
    if (!g.heightMm || !g.widthMm || !g.emptyWeightG || (g.shape === 'rect' && !g.depthMm)) r.incomplete++;
  }

  for (const w of legacy.waxes) {
    if (!String(w.name ?? '').trim()) { r.skipped++; continue; }
    const price = pos(w.price);
    const item = {
      price, quantityKg: price ? 1 : null, // alt: Preis je kg
      densityGml: pos(w.density), fragranceStdPct: n(w.pct), fragranceMaxPct: n(w.max),
    };
    const same = state.waxes.find((x) => key(x.name) === key(w.name));
    if (same) {
      // nur Lücken füllen, nichts Eigenes überschreiben
      let changed = false;
      for (const [k, val] of Object.entries(item)) if (same[k] == null && val != null) { same[k] = val; changed = true; }
      changed ? r.updated++ : r.skipped++;
    } else {
      state.waxes.push({ id: newId(), name: String(w.name).trim(), manufacturer: null, ...item, densityGml: item.densityGml ?? 0.9 });
      r.waxes++;
    }
  }

  for (const o of legacy.oils) {
    if (!String(o.name ?? '').trim()) { r.skipped++; continue; }
    const price = pos(o.price);
    const same = state.scents.find((x) => key(x.name) === key(o.name));
    if (same) {
      if (same.price == null && price) { same.price = price; same.quantityMl = 1; r.updated++; } else r.skipped++;
    } else {
      state.scents.push({ id: newId(), name: String(o.name).trim(), manufacturer: null, price, quantityMl: price ? 1 : null, densityGml: 0.95 });
      r.scents++;
    }
  }
  return r;
}
