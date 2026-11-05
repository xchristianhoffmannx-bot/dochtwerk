// Material-Logik: Felder je Art, Validierung, Unterzeilen, abgeleitete Anzeigen. Rein, ohne DOM.
import { parseDecimal, formatEuro, formatNumber } from './core/units.js';
import { pricePerKg, pricePerMl, pricePerPiece } from './core/pricing.js';
import { estimateVolume } from './core/glass-volume.js';

export const COLLECTION = { glaeser: 'glasses', waechse: 'waxes', duefte: 'scents', sonstiges: 'extras' };

const txt = (key, label, o = {}) => ({ key, label, type: 'text', ...o });
const num = (key, label, o = {}) => ({ key, label, type: 'num', ...o });
const mode = { key: 'priceMode', type: 'mode', def: 'piece', options: [['piece', 'pro Stück'], ['pack', 'pro Packung']] };
const pack = num('packQty', 'Stück pro Packung', { required: true, pos: true, int: true, showIf: (v) => v.priceMode === 'pack' });
const NAME = txt('name', 'Name', { required: true });
const MAKER = txt('manufacturer', 'Hersteller (optional)');

export const FIELDS = {
  glaeser: [
    NAME, MAKER,
    { key: 'shape', label: 'Form', type: 'select', required: true, def: 'round',
      options: [['round', 'rund'], ['conical', 'konisch'], ['rect', 'rechteckig'], ['other', 'andere']] },
    num('heightMm', 'Höhe (mm)', { required: true, pos: true }),
    num('widthMm', 'Breite (mm)', { required: true, pos: true }),
    num('diameterTopMm', 'Ø oben (mm, optional)', { pos: true, showIf: (v) => v.shape === 'conical' }),
    num('diameterBottomMm', 'Ø unten (mm, optional)', { pos: true, showIf: (v) => v.shape === 'conical' }),
    num('depthMm', 'Tiefe (mm, optional)', { pos: true, showIf: (v) => v.shape === 'rect' }),
    num('wallMm', 'Wandstärke (mm)', { pos: true, def: 3 }),
    num('emptyWeightG', 'Leergewicht (g)', { required: true, pos: true }),
    mode, num('price', 'Preis (€)', { required: true }), pack,
  ],
  waechse: [
    NAME, MAKER,
    num('price', 'Preis (€)', { required: true }),
    num('quantityKg', 'Gekaufte Menge (kg)', { required: true, pos: true }),
    num('densityGml', 'Dichte (g/ml)', { pos: true, def: 0.9 }),
    num('fragranceStdPct', 'Duftöl Standard (%)', { max: 100 }),
    num('fragranceMaxPct', 'Duftöl Maximum (%)', { max: 100 }),
  ],
  duefte: [
    NAME, MAKER,
    num('price', 'Preis (€)', { required: true }),
    num('quantityMl', 'Gekaufte Menge (ml)', { required: true, pos: true }),
    num('densityGml', 'Dichte (g/ml)', { pos: true, def: 0.95 }),
  ],
  sonstiges: [NAME, MAKER, mode, num('price', 'Preis (€)', { required: true }), pack],
};

const E = {
  required: 'Pflichtfeld.',
  nan: 'Bitte eine Zahl eingeben (z. B. 8,5).',
  pos: 'Muss größer als 0 sein.',
  int: 'Bitte eine ganze Zahl eingeben.',
  max: (m) => `Höchstens ${m}.`,
  maxLtStd: 'Das Maximum darf nicht unter dem Standardwert liegen.',
};

// Zahl -> Eingabetext mit Komma
export const toInput = (v) => (v == null ? '' : String(v).replace('.', ','));

// Startwerte für das Formular: neues Material oder vorhandenes
export function formValues(art, item) {
  const out = {};
  for (const f of FIELDS[art]) out[f.key] = item ? toInput(item[f.key]) : f.def != null ? toInput(f.def) : '';
  return out;
}

// raw: { feld: Eingabetext }. Ergebnis: { ok, errors: {feld: Text}, item } (item enthält nur gültige Werte)
export function validate(art, raw) {
  const errors = {}, item = {};
  for (const f of FIELDS[art]) {
    if (f.showIf && !f.showIf(raw)) { item[f.key] = f.key === 'packQty' ? 1 : null; continue; }
    const s = String(raw[f.key] ?? '').trim();
    if (f.type === 'text') {
      if (f.required && !s) errors[f.key] = E.required;
      item[f.key] = s || null;
    } else if (f.type === 'select' || f.type === 'mode') {
      item[f.key] = s || f.def;
    } else {
      const v = parseDecimal(s);
      if (v === null) {
        if (f.required) errors[f.key] = E.required;
        item[f.key] = f.def ?? null;
      } else if (Number.isNaN(v)) errors[f.key] = E.nan;
      else if (f.pos && v <= 0) errors[f.key] = E.pos;
      else if (f.int && !Number.isInteger(v)) errors[f.key] = E.int;
      else if (f.max != null && v > f.max) errors[f.key] = E.max(f.max);
      else item[f.key] = v;
    }
  }
  const { fragranceStdPct: lo, fragranceMaxPct: hi } = item;
  if (art === 'waechse' && lo != null && hi != null && hi < lo && !errors.fragranceMaxPct) errors.fragranceMaxPct = E.maxLtStd;
  return { ok: Object.keys(errors).length === 0, errors, item };
}

const perPiece = (i) => pricePerPiece(i.priceMode, i.price, i.packQty);

// Unterzeile der Liste: { parts: [Text], priceMissing }
export function subline(art, i) {
  const parts = [];
  let price = null, unit = '', digits = 2;
  if (art === 'glaeser') {
    const w = formatNumber(i.widthMm, 1), h = formatNumber(i.heightMm, 1);
    if (i.shape === 'rect' && i.depthMm) parts.push(`${w} × ${formatNumber(i.depthMm, 1)} × ${h} mm`);
    else parts.push(`${i.shape === 'round' || i.shape === 'conical' ? 'Ø ' : ''}${w} × ${h} mm`);
    price = perPiece(i); unit = 'Stück';
  } else if (art === 'waechse') { price = pricePerKg(i.price, i.quantityKg); unit = 'kg'; }
  else if (art === 'duefte') { price = pricePerMl(i.price, i.quantityMl); unit = 'ml'; digits = 4; }
  else { price = perPiece(i); unit = 'Stück'; }
  if (price != null) parts.push(`${formatEuro(price, digits)} / ${unit}`);
  return { parts, priceMissing: price == null };
}

// Zeilen unter dem Formular ("= 13,36 € pro kg", Volumenschätzung)
export function derivedLines(art, i) {
  const out = [];
  if (art === 'glaeser') {
    const v = estimateVolume(i);
    out.push(v ? `Volumen: ca. ${formatNumber(v.ml, 0)} ml (${v.rough ? 'grobe Schätzung' : 'Schätzung'})` : 'Keine Schätzung möglich');
    if (i.priceMode === 'pack' && perPiece(i) != null) out.push(`= ${formatEuro(perPiece(i))} pro Stück`);
  } else if (art === 'waechse') {
    const p = pricePerKg(i.price, i.quantityKg);
    if (p != null) out.push(`= ${formatEuro(p)} pro kg`);
  } else if (art === 'duefte') {
    const p = pricePerMl(i.price, i.quantityMl);
    if (p != null) out.push(`= ${formatEuro(p, 4)} pro ml`);
  } else if (perPiece(i) != null) out.push(`= ${formatEuro(perPiece(i))} pro Stück`);
  return out;
}
