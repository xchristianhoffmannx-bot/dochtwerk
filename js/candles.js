// Kerzen: Snapshot beim Speichern, Bearbeiten-Formular, Foto-Rollen, Reihenfolgen. Rein, ohne DOM und Speicher.
import { parseDecimal } from './core/units.js';
import { pricePerKg, pricePerMl, pricePerPiece } from './core/pricing.js';
import { rund05 } from './core/calc-cost.js';
import { toInput } from './materials.js';

export const KEEP = '__keep'; // Duft-Auswahl "gespeicherter Wert bleibt" (Material inzwischen gelöscht)

export const glassSnapshot = (g) => ({
  glassId: g.id, name: g.name, shape: g.shape, heightMm: g.heightMm, widthMm: g.widthMm,
  diameterTopMm: g.diameterTopMm ?? null, diameterBottomMm: g.diameterBottomMm ?? null, depthMm: g.depthMm ?? null,
  emptyWeightG: g.emptyWeightG ?? null, price: pricePerPiece(g.priceMode, g.price, g.packQty),
});

export const waxSnapshot = (w) => ({
  waxId: w.id, name: w.name, pricePerKg: pricePerKg(w.price, w.quantityKg), densityGml: w.densityGml,
});

// Kerze aus einer Kostenrechnung (Spec 4: Preise, Gewichte und Maße werden kopiert)
export function snapshotCandle({ state, draft, input, result, name, now = new Date() }) {
  const g = state.glasses.find((x) => x.id === draft.glassId);
  const w = state.waxes.find((x) => x.id === draft.waxId);
  const s = state.settings;
  return {
    id: crypto.randomUUID(),
    name: (name || '').trim(),
    createdAt: now.toISOString(),
    glass: { ...glassSnapshot(g), price: input.glass.price },
    wax: { ...waxSnapshot(w), pricePerKg: input.wax.pricePerKg },
    // nur bei Mischungen: alle Wachse mit Anteil, Gramm und Kosten (wax bleibt das erste)
    ...(result.waxes.length > 1 && {
      waxMix: result.waxes.map((x, i) => ({ waxId: input.waxes[i].waxId, name: x.name, pricePerKg: input.waxes[i].pricePerKg, sharePct: x.sharePct, grams: x.g, cost: x.cost })),
    }),
    scentMode: input.mode,
    scents: result.scents.map((x, i) => ({
      scentId: input.scents[i].scentId ?? null, name: x.name,
      pricePerMl: input.scents[i].pricePerMl, densityGml: input.scents[i].densityGml,
      ml: x.ml, grams: x.g, shareMassPct: x.shareMassPct, shareVolPct: x.shareVolPct,
    })),
    scentPct: result.scentPct,
    totalWeightG: input.totalWeightG, waxG: result.waxG, scentG: result.scentG,
    extras: input.extras.map((e) => ({ extraId: e.extraId, name: e.name, qty: e.qty, pricePerPiece: e.pricePerPiece })),
    costs: { ...result.costs },
    markup: { on: s.markupOn, pct: s.markupPct, price: s.markupOn ? rund05(result.costs.total * (1 + s.markupPct / 100)) : null },
    photos: [],
  };
}

// Von Hand angelegte Kerze: keine automatische Kostenrechnung
export const newManualCandle = (now = new Date()) => ({
  id: crypto.randomUUID(), name: '', createdAt: now.toISOString(),
  glass: null, wax: null, scentMode: 'percent', scents: [],
  scentPct: null, totalWeightG: null, waxG: null, scentG: null, extras: [],
  costs: { wax: 0, scent: 0, glass: 0, extras: 0, total: 0 },
  markup: { on: false, pct: 150, price: null }, photos: [],
});

// --- Formular (Kerzen-Detail) ---

// Startwerte als Eingabetexte. Düfte: Zeilen mit Verweis auf den gespeicherten Eintrag (src).
export function candleFormValues(c, state) {
  const key = c.scentMode === 'ml' ? 'shareVolPct' : 'shareMassPct';
  return {
    name: c.name || '',
    glassId: c.glass?.glassId ?? '',
    waxId: c.wax?.waxId ?? '',
    scents: c.scents.map((s) => ({
      src: s,
      scentId: s.scentId && state.scents.some((x) => x.id === s.scentId) ? s.scentId : KEEP,
      share: toInput(s[key]),
    })),
    scentPct: toInput(c.scentPct),
    totalWeight: toInput(c.totalWeightG),
    costTotal: toInput(c.costs?.total),
  };
}

// raw -> { ok, errors, next }; next ist eine neue Kerze (die alte bleibt unverändert)
export function applyCandleForm(c, raw, state) {
  const errors = {};
  const next = { ...c, name: raw.name.trim() };

  const g = state.glasses.find((x) => x.id === raw.glassId);
  if (g && c.glass?.glassId !== g.id) next.glass = glassSnapshot(g); // Wechsel kopiert die Maße neu
  const w = state.waxes.find((x) => x.id === raw.waxId);
  if (w && c.wax?.waxId !== w.id) { next.wax = waxSnapshot(w); delete next.waxMix; } // neues Wachs ersetzt die Mischung

  const key = c.scentMode === 'ml' ? 'shareVolPct' : 'shareMassPct';
  const rows = raw.scents.map((r, i) => ({ r, i })).filter(({ r }) => r.scentId);
  const entries = [];
  let sum = 0, rowErrors = false;
  for (const { r, i } of rows) {
    let e, fresh = false;
    if (r.scentId === KEEP || (r.src && r.src.scentId === r.scentId)) e = { ...r.src };
    else {
      const s = state.scents.find((x) => x.id === r.scentId);
      fresh = true;
      e = { scentId: s.id, name: s.name, pricePerMl: pricePerMl(s.price, s.quantityMl), densityGml: s.densityGml, ml: 0, grams: 0, shareMassPct: null, shareVolPct: null };
    }
    const t = String(r.share ?? '').trim();
    let v = null;
    if (t) {
      v = parseDecimal(t);
      if (!Number.isFinite(v) || v > 100) { errors[`scent-${i}`] = 'Bitte einen Anteil zwischen 0 und 100 eingeben.'; rowErrors = true; }
    } else if (rows.length === 1) v = 100;
    else if (e[key] == null) { errors[`scent-${i}`] = 'Pflichtfeld.'; rowErrors = true; }
    if (v != null && !errors[`scent-${i}`]) {
      e[key] = v;
      if (fresh) { e.shareMassPct = v; e.shareVolPct = v; }
    }
    sum += e[key] ?? 0;
    entries.push(e);
  }
  if (entries.length > 1 && !rowErrors && Math.abs(sum - 100) > 0.5) errors.scents = `Die Anteile ergeben zusammen ${toInput(Math.round(sum * 10) / 10)} %, nicht 100 %.`;
  next.scents = entries;

  const num = (text, field) => {
    const v = parseDecimal(text);
    if (Number.isNaN(v)) { errors[field] = 'Bitte eine Zahl eingeben (z. B. 8,5).'; return null; }
    return v;
  };
  next.scentPct = num(raw.scentPct, 'scentPct');
  next.totalWeightG = num(raw.totalWeight, 'totalWeight');
  const total = num(raw.costTotal, 'costTotal');
  next.costs = { ...(c.costs || {}), total: total ?? 0 };

  return { ok: Object.keys(errors).length === 0, errors, next };
}

// --- Fotos ---

export const hasSide = (c) => c.photos.some((p) => p.role === 'side');
export const orderedPhotos = (c) => [...c.photos.filter((p) => p.role === 'side'), ...c.photos.filter((p) => p.role !== 'side')];

// Neue Seitenansicht: die alte wird zu "other", nichts wird gelöscht (Spec 3.7)
export function setSide(c, photoId) {
  c.photos.forEach((p) => { if (p.role === 'side') p.role = 'other'; });
  c.photos.find((p) => p.id === photoId).role = 'side';
}
export function removePhoto(c, photoId) {
  c.photos.splice(c.photos.findIndex((p) => p.id === photoId), 1);
}

// --- Reihenfolgen ---

export const galleryOrder = (candles) => [...candles].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

// Diashow: Galerie-Reihenfolge, je Kerze die Seitenansicht zuerst
export const slidesOf = (candles) =>
  galleryOrder(candles).flatMap((c) => orderedPhotos(c).map((p) => ({ candleId: c.id, photoId: p.id, name: c.name })));

// Foto für die Karte: Seitenansicht, sonst erstes Foto
export const coverPhoto = (c) => orderedPhotos(c)[0] ?? null;
