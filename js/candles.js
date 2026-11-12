// Kerzen: Snapshot beim Speichern, Bearbeiten-Formular, Foto-Rollen, Reihenfolgen. Rein, ohne DOM und Speicher.
import { parseDecimal } from './core/units.js';
import { pricePerKg, pricePerMl, pricePerPiece } from './core/pricing.js';
import { rund05 } from './core/calc-cost.js';
import { toInput } from './materials.js';

export const MAX_WAXES = 3;
const round2 = (x) => Math.round(x * 100) / 100; // Kosten auf Cent
export const KEEP = '__keep'; // Duft-/Wachs-Auswahl "gespeicherter Wert bleibt" (Material inzwischen gelöscht)

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
      waxMix: result.waxes.map((x, i) => ({ waxId: input.waxes[i].waxId, name: x.name, pricePerKg: input.waxes[i].pricePerKg, sharePct: x.sharePct, scented: x.scented, grams: x.g, cost: x.cost })),
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
    firstScented: c.waxMix?.[0]?.scented !== false,
    waxUnit: 'percent',
    moreWaxes: (c.waxMix || []).slice(1).map((x) => ({
      src: x, waxId: state.waxes.some((w) => w.id === x.waxId) ? x.waxId : KEEP,
      share: toInput(x.sharePct), scented: x.scented !== false,
    })),
    scents: c.scents.map((s) => ({
      src: s,
      scentId: s.scentId && state.scents.some((x) => x.id === s.scentId) ? s.scentId : KEEP,
      share: toInput(s[key]),
    })),
    scentPct: toInput(c.scentPct),
    totalWeight: toInput(c.totalWeightG),
    costTotal: toInput(c.costs?.total == null ? null : round2(c.costs.total)),
  };
}


// Wachsmischung aus dem Formular: erstes Wachs bekommt den Rest, die weiteren geben % oder g an.
// Gramm und Kosten je Wachs entstehen aus waxG der Kerze. Wurde die Mischung geändert, folgen
// costs.wax und (wenn der Gesamtpreis nicht von Hand geändert wurde) costs.total.
function applyWaxMix(c, raw, state, next, errors, total) {
  const rows = (raw.moreWaxes ?? []).filter((r) => r.waxId);
  if (!raw.moreWaxes) { /* Mischung unverändert */ } else if (!rows.length) {
    delete next.waxMix;
  } else if (!next.wax) {
    errors.wax = 'Wähle zuerst das erste Wachs.';
  } else {
    const byG = raw.waxUnit === 'g' && c.waxG > 0;
    const entries = [];
    let sum = 0, bad = false;
    rows.forEach((r, i) => {
      let e;
      if (r.waxId === KEEP || (r.src && r.src.waxId === r.waxId)) e = { ...r.src };
      else {
        const w = state.waxes.find((x) => x.id === r.waxId);
        e = { ...waxSnapshot(w), sharePct: null, scented: true };
      }
      const v = parseDecimal(String(r.share ?? ''));
      const share = byG ? (v / c.waxG) * 100 : v;
      if (!Number.isFinite(v) || v < 0 || share > 100) { errors[`wax-${i}`] = byG ? 'Bitte eine Menge in g eingeben.' : 'Bitte einen Anteil zwischen 0 und 100 eingeben.'; bad = true; }
      e.sharePct = share; e.scented = r.scented !== false;
      sum += Number.isFinite(share) ? share : 0;
      entries.push(e);
    });
    if (!bad && sum >= 100) { errors.waxes = byG ? 'Die weiteren Wachse wiegen zusammen so viel wie das ganze Wachs oder mehr.' : `Die Anteile ergeben zusammen ${toInput(Math.round(sum * 10) / 10)} %, das erste Wachs hätte nichts mehr.`; bad = true; }
    if (bad) return;
    const first = { waxId: next.wax.waxId, name: next.wax.name, pricePerKg: next.wax.pricePerKg, densityGml: next.wax.densityGml, sharePct: 100 - sum, scented: raw.firstScented !== false };
    next.waxMix = [first, ...entries].map((e) => ({ ...e, grams: c.waxG > 0 ? (c.waxG * e.sharePct) / 100 : null }))
      .map((e) => ({ ...e, cost: e.grams != null ? (e.grams / 1000) * (e.pricePerKg ?? 0) : null }));
  }
  // Kosten neu berechnen, wenn sich die Wachse geändert haben (anderes Wachs, Mischung, Anteile, Duftöl-Häkchen)
  const sig = (m, w) => JSON.stringify(m ? m.map((e) => [e.waxId, +e.sharePct.toFixed(4), e.scented !== false]) : [w?.waxId]);
  if (c.waxG > 0 && next.wax && sig(c.waxMix, c.wax) !== sig(next.waxMix, next.wax)) {
    if (next.waxMix) next.waxMix.forEach((e) => { e.cost = round2(e.cost); });
    const wax = next.waxMix ? round2(next.waxMix.reduce((x, e) => x + e.cost, 0)) : round2((c.waxG / 1000) * (next.wax.pricePerKg ?? 0));
    const oldWax = c.costs?.wax ?? 0;
    // Gesamtpreis nicht von Hand geändert -> mitziehen (inkl. Verkaufspreis); sonst bleibt der eigene Wert
    const untouched = total != null && Math.abs(total - (c.costs?.total ?? 0)) < 0.005;
    next.costs = { ...next.costs, wax };
    if (untouched) {
      next.costs.total = round2(total + (wax - oldWax));
      if (c.markup?.on) next.markup = { ...c.markup, price: rund05(next.costs.total * (1 + c.markup.pct / 100)) };
    }
  }
}

// raw -> { ok, errors, next }; next ist eine neue Kerze (die alte bleibt unverändert)
export function applyCandleForm(c, raw, state) {
  const errors = {};
  const next = { ...c, name: raw.name.trim() };

  const g = state.glasses.find((x) => x.id === raw.glassId);
  if (g && c.glass?.glassId !== g.id) next.glass = glassSnapshot(g); // Wechsel kopiert die Maße neu
  const w = state.waxes.find((x) => x.id === raw.waxId);
  if (w && c.wax?.waxId !== w.id) next.wax = waxSnapshot(w);

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
  applyWaxMix(c, raw, state, next, errors, total);

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
