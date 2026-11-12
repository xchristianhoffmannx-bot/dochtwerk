// Brücke zwischen Formular-Entwurf (Eingabetexte, IDs) und den Rechnern in core/. Rein, ohne DOM.
import { parseDecimal } from './core/units.js';
import { pricePerKg, pricePerMl, pricePerPiece } from './core/pricing.js';

export const MAX_SCENTS = 4;
export const MAX_WAXES = 3;
// Duftöl je Wachs: gilt nur mit mindestens zwei gewählten Wachsen
export const perWaxOn = (d) => !!d.scentPerWax && !d.noScent && !!d.waxId && (d.moreWaxes || []).some((r) => r.waxId);
export const blankRow = () => ({ scentId: '', share: '', ml: '' });

// Zubehör-Vorauswahl = Auswahl der letzten Rechnung (Spec A2)
export const emptyCostDraft = (state) => ({
  glassId: '', noGlass: false, noScent: false, waxAmount: '', waxId: '', moreWaxes: [], firstScented: true, waxUnit: 'percent', mode: 'percent', totalWeight: '', pct: '', pctTouched: false,
  scents: [blankRow()],
  extras: Object.fromEntries(
    (state.drafts.lastExtras || [])
      .filter((e) => state.extras.some((x) => x.id === e.extraId))
      .map((e) => [e.extraId, { on: true, qty: String(e.qty) }])),
});

export const emptyPlanDraft = () => ({
  waxId: '', glassId: '', mode: 'percent', pct: '', pctTouched: false,
  scents: [blankRow()], volume: '', volumeIsEstimate: false,
});

// kind: 'cost' | 'plan'. Legt den Entwurf an, falls er fehlt.
export function getDraft(state, kind) {
  if (!state.drafts[kind]?.scents) state.drafts[kind] = kind === 'cost' ? emptyCostDraft(state) : emptyPlanDraft();
  if (kind === 'cost' && !state.drafts.cost.moreWaxes) state.drafts.cost.moreWaxes = []; // Entwürfe aus älteren Versionen
  return state.drafts[kind];
}

const perPiece = (i) => pricePerPiece(i.priceMode, i.price, i.packQty);

// Zahl aus Eingabetext; Unsinn wird als Fehler gemerkt und zu null
function read(text, label, errors) {
  const v = parseDecimal(text);
  if (Number.isNaN(v)) { errors.push(`Ungültige Zahl: ${label}`); return null; }
  return v;
}

function scentsOf(state, d, errors) {
  return d.scents.filter((r) => r.scentId).flatMap((r) => {
    const s = state.scents.find((x) => x.id === r.scentId);
    if (!s) return []; // Duft inzwischen gelöscht
    return [{
      scentId: s.id, name: s.name, pricePerMl: pricePerMl(s.price, s.quantityMl), densityGml: s.densityGml,
      sharePct: d.mode === 'ml' ? null : read(r.share, `Anteil ${s.name}`, errors),
      ml: d.mode === 'ml' ? read(r.ml, `Menge ${s.name}`, errors) : null,
    }];
  });
}

// -> { input, errors }; input geht an calcCost, errors sind nicht lesbare Eingaben
export function costInput(state, d) {
  const errors = [];
  const g = state.glasses.find((x) => x.id === d.glassId);
  const w = state.waxes.find((x) => x.id === d.waxId);
  const extras = [];
  for (const x of state.extras) {
    const e = d.extras[x.id];
    if (!e?.on) continue;
    const qty = read(e.qty, `Menge ${x.name}`, errors) ?? 1;
    if (qty <= 0) errors.push(`Die Menge für ${x.name} muss größer als 0 sein.`);
    extras.push({ extraId: x.id, name: x.name, qty, pricePerPiece: perPiece(x) });
  }
  const byG = d.waxUnit === 'g';
  const perWax = perWaxOn(d);
  // Duft eines Wachses (nur im Modus "je Wachs")
  const scentOf = (scentId, pctText) => {
    const s = perWax && state.scents.find((y) => y.id === scentId);
    return s ? { scentId: s.id, name: s.name, pricePerMl: pricePerMl(s.price, s.quantityMl), densityGml: s.densityGml, pct: read(pctText, `Duftölmenge ${s.name}`, errors) } : null;
  };
  const waxOf = (x, v, scented = true, scent = null) => ({ scented, scent, waxId: x.id, name: x.name, pricePerKg: pricePerKg(x.price, x.quantityKg), densityGml: x.densityGml, fragranceMaxPct: x.fragranceMaxPct, sharePct: byG ? null : v, grams: byG ? v : null });
  const more = w ? (d.moreWaxes || []).filter((r) => r.waxId).flatMap((r) => {
    const x = state.waxes.find((y) => y.id === r.waxId);
    return x ? [waxOf(x, read(r.share, `${byG ? 'Menge' : 'Anteil'} ${x.name}`, errors), r.scented !== false, scentOf(r.scentId, r.pct))] : []; // gelöschtes Wachs entfällt
  }) : [];
  const input = {
    noGlass: !!d.noGlass,
    waxAmountG: d.noGlass ? read(d.waxAmount, 'Wachsmenge', errors) : null,
    glass: g && !d.noGlass ? { name: g.name, emptyWeightG: g.emptyWeightG, price: perPiece(g) } : null,
    wax: w ? waxOf(w, null) : null,
    waxes: w ? [waxOf(w, null, d.firstScented !== false, scentOf(d.firstScentId, d.firstPct)), ...more] : [],
    perWax,
    waxUnit: byG ? 'g' : 'percent',
    mode: perWax ? 'percent' : d.mode,
    totalWeightG: d.noGlass ? null : read(d.totalWeight, 'Gesamtgewicht', errors),
    pct: d.mode === 'ml' || d.noScent || perWax ? null : read(d.pct, 'Duftölmenge', errors),
    scents: d.noScent ? [] : perWax ? [] : scentsOf(state, d, errors), // "Ohne Duftöl"; je Wachs: unten aus den Wachsen
    extras,
    markup: { on: state.settings.markupOn, pct: state.settings.markupPct },
  };
  if (perWax) input.scents = input.waxes.filter((x) => x.scent).map((x) => ({ scentId: x.scent.scentId, name: x.scent.name, pricePerMl: x.scent.pricePerMl, densityGml: x.scent.densityGml, sharePct: null, ml: null }));
  return { input, errors };
}

export function planInput(state, d) {
  const errors = [];
  const w = state.waxes.find((x) => x.id === d.waxId);
  const input = {
    wax: w ? { name: w.name, densityGml: w.densityGml, fragranceMaxPct: w.fragranceMaxPct } : null,
    mode: d.mode,
    pct: d.mode === 'ml' ? null : read(d.pct, 'Duftölmenge', errors),
    scents: scentsOf(state, d, errors),
    volumeMl: read(d.volume, 'Zielvolumen', errors),
  };
  return { input, errors };
}
