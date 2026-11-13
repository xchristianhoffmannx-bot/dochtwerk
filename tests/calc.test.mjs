import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcCost } from '../js/core/calc-cost.js';
import { calcPlan } from '../js/core/calc-plan.js';

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);
const cent = (a, b) => assert.equal(Math.round(a * 100) / 100, b);

const glass = { name: 'Dessertglas', emptyWeightG: 195, price: 1.8 };
const wax = { name: 'Soja', pricePerKg: 13.36, densityGml: 0.9, fragranceMaxPct: 12 };
const vanille = { name: 'Vanille', pricePerMl: 0.0318, densityGml: 0.95 };
const karamell = { name: 'Karamell', pricePerMl: 0.04, densityGml: 1.0 };
const extras = [
  { name: 'Docht', qty: 1, pricePerPiece: 0.29 },
  { name: 'Etikett', qty: 1, pricePerPiece: 0.3 },
];
const base = { glass, wax, totalWeightG: 465, extras };

test('AB1 Mockup-Fall, Kostenrechner percent', () => {
  const r = calcCost({ ...base, mode: 'percent', pct: 8, scents: [vanille], markup: { on: true, pct: 150 } });
  assert.ok(r.ok);
  near(r.innerG, 270);
  near(r.waxG, 250);
  near(r.scentG, 20);
  near(r.scents[0].ml, 21.0526, 1e-4);
  cent(r.costs.wax, 3.34); cent(r.costs.scent, 0.67); cent(r.costs.glass, 1.8); cent(r.costs.extras, 0.59);
  near(r.costs.total, 6.399474, 1e-5);
  assert.equal(r.price, 16);
  assert.deepEqual(r.warnings, []);
  assert.equal(r.incomplete, false);
});

test('AB2 Kostenrechner ml, zwei Düfte', () => {
  const r = calcCost({ ...base, mode: 'ml', scents: [{ ...vanille, ml: 12 }, { ...karamell, ml: 8 }] });
  assert.ok(r.ok);
  near(r.scentG, 19.4); near(r.waxG, 250.6);
  near(r.scentPct, 7.74, 5e-3);
  near(r.scents[0].shareMassPct, 58.76, 5e-3); near(r.scents[1].shareMassPct, 41.24, 5e-3);
  near(r.scents[0].shareVolPct, 60); near(r.scents[1].shareVolPct, 40);
  cent(r.costs.wax, 3.35); cent(r.costs.scent, 0.7); cent(r.costs.total, 6.44);
  assert.equal(r.price, null);
});

test('AB2b Kostenrechner percent, Mischung 60/40, 8 %', () => {
  const r = calcCost({ ...base, mode: 'percent', pct: 8, scents: [vanille, { ...karamell, sharePct: 40 }] });
  near(r.waxG, 250); near(r.scentG, 20);
  near(r.scents[0].g, 12); near(r.scents[0].ml, 12.63, 5e-3);
  near(r.scents[1].g, 8); near(r.scents[1].ml, 8);
  cent(r.costs.scent, 0.72); cent(r.costs.total, 6.45);
});

test('Anteile der weiteren Düfte über 100 % werden normiert', () => {
  const r = calcCost({ ...base, mode: 'percent', pct: 8, scents: [vanille, { ...karamell, sharePct: 80 }, { ...karamell, sharePct: 80 }] });
  near(r.scents[0].shareMassPct, 0); near(r.scents[1].shareMassPct, 50);
  assert.equal(r.warnings.length, 1);
});

test('AB3 Wachs & Duftrechner percent', () => {
  const r = calcPlan({ wax, mode: 'percent', pct: 8, scents: [vanille], volumeMl: 250 });
  near(r.waxG, 209.15, 5e-3); near(r.scentG, 16.73, 5e-3); near(r.scents[0].ml, 17.61, 5e-3);
  near(r.waxG / 0.9 + r.scents[0].ml, 250, 5e-4); // Volumenprobe
});

test('AB3b percent, Mischung 60/40', () => {
  const r = calcPlan({ wax, mode: 'percent', pct: 8, scents: [vanille, { ...karamell, sharePct: 40 }], volumeMl: 250 });
  near(r.waxG, 209.44, 5e-3); near(r.scentG, 16.76, 5e-3);
  near(r.scents[0].g, 10.05, 5e-3); near(r.scents[0].ml, 10.58, 5e-3);
  near(r.scents[1].g, 6.7, 5e-3); near(r.scents[1].ml, 6.7, 5e-3);
});

test('AB4 Wachs & Duftrechner ml', () => {
  const r = calcPlan({ wax, mode: 'ml', scents: [{ ...vanille, ml: 18 }], volumeMl: 250 });
  near(r.waxG, 208.8, 5e-3); near(r.scentG, 17.1, 5e-3); near(r.scentPct, 8.19, 5e-3);
});

test('AB4b ml, zwei Düfte', () => {
  const r = calcPlan({ wax, mode: 'ml', scents: [{ ...vanille, ml: 12 }, { ...karamell, ml: 8 }], volumeMl: 250 });
  near(r.waxG, 207, 5e-3); near(r.scentG, 19.4, 5e-3); near(r.scentPct, 9.37, 5e-3);
});

test('AB6 Fehlerfälle Kostenrechner', () => {
  const run = (o) => calcCost({ ...base, mode: 'percent', pct: 8, scents: [vanille], ...o });
  assert.match(run({ totalWeightG: 195 }).errors[0], /nicht größer als das leere Glas \(195 g\)/);
  assert.match(run({ totalWeightG: 100 }).errors[0], /nicht größer/);
  assert.match(run({ glass: { ...glass, emptyWeightG: null } }).errors[0], /Leergewicht/);
  assert.match(run({ glass: null }).errors[0], /Wähle ein Glas/);
  assert.match(run({ wax: null }).errors[0], /Wähle ein Wachs/);
  const ml = run({ mode: 'ml', scents: [{ ...vanille, ml: 300 }] });
  assert.equal(ml.ok, false);
  assert.match(ml.errors[0], /Duftöl wiegt mehr/);
});

test('AB6 Fehlender Preis: Ergebnis mit Warnung, Summe unvollständig', () => {
  const r = calcCost({ ...base, wax: { ...wax, pricePerKg: null }, mode: 'percent', pct: 8, scents: [vanille] });
  assert.ok(r.ok);
  assert.equal(r.incomplete, true);
  assert.ok(r.warnings.includes('Preis fehlt: Soja'));
  cent(r.costs.wax, 0);
});

test('AB6 Duft-% über Maximum: Warnung (auch abgeleitet im ml-Modus)', () => {
  const r = calcCost({ ...base, mode: 'percent', pct: 13, scents: [vanille] });
  assert.ok(r.ok);
  assert.match(r.warnings[0], /Duftöl 13 % liegt über dem Maximum von 12 % für Soja/);
  const m = calcCost({ ...base, mode: 'ml', scents: [{ ...vanille, ml: 40 }] });
  assert.match(m.warnings[0], /über dem Maximum/);
});

test('AB6 V_Öl >= V im Wachs & Duftrechner: Fehler', () => {
  const r = calcPlan({ wax, mode: 'ml', scents: [{ ...vanille, ml: 250 }], volumeMl: 250 });
  assert.equal(r.ok, false);
  assert.match(r.errors[0], /größer als das Zielvolumen/);
});

test('Kein Duft: erlaubt, Duftkosten 0', () => {
  const r = calcCost({ ...base, mode: 'percent', pct: 8, scents: [] });
  assert.ok(r.ok);
  near(r.waxG, 270); near(r.costs.scent, 0);
});

test('Wachsmischung: erstes Wachs bekommt den Rest, Kosten und Grenzwert', () => {
  const raps = { name: 'Raps', pricePerKg: 10, fragranceMaxPct: 8 };
  const r = calcCost({ ...base, wax: undefined, waxes: [wax, { ...raps, sharePct: 40 }], mode: 'percent', pct: 10, scents: [vanille] });
  assert.ok(r.ok);
  near(r.waxes[0].sharePct, 60); near(r.waxes[1].sharePct, 40);
  near(r.waxes[0].g + r.waxes[1].g, r.waxG);
  near(r.costs.wax, (r.waxes[0].g * 13.36 + r.waxes[1].g * 10) / 1000);
  assert.match(r.warnings.join(' '), /Maximum von 8 % für Raps/);
});

test('Wachsmischung: Anteil fehlt -> Fehler, über 100 % -> normiert', () => {
  const raps = { name: 'Raps', pricePerKg: 10 };
  assert.match(calcCost({ ...base, waxes: [wax, raps], scents: [] }).errors[0], /Anteil für Raps/);
  const r = calcCost({ ...base, waxes: [wax, { ...raps, sharePct: 70 }, { name: 'X', pricePerKg: 5, sharePct: 70 }], scents: [] });
  near(r.waxes[0].sharePct, 0); near(r.waxes[1].sharePct + r.waxes[2].sharePct, 100);
  assert.match(r.warnings.join(' '), /weiteren Wachse/);
});

test('Wachsmischung in Gramm: erstes Wachs bekommt den Rest', () => {
  const raps = { name: 'Raps', pricePerKg: 10, grams: 100 };
  const r = calcCost({ ...base, waxes: [wax, raps], waxUnit: 'g', scents: [] });
  near(r.waxes[1].g, 100); near(r.waxes[0].g, r.waxG - 100);
  near(r.costs.wax, ((r.waxG - 100) * 13.36 + 100 * 10) / 1000);
  assert.match(calcCost({ ...base, waxes: [wax, { ...raps, grams: 999 }], waxUnit: 'g', scents: [] }).errors[0], /nur/);
  assert.match(calcCost({ ...base, waxes: [wax, { ...raps, grams: null }], waxUnit: 'g', scents: [] }).errors[0], /Menge in g/);
});

test('Wachsmischung: Wachs ohne Duftöl, Prozent bezieht sich nur auf das beduftete Wachs', () => {
  const raps = { name: 'Raps', pricePerKg: 10, sharePct: 50, scented: false };
  const r = calcCost({ ...base, waxes: [wax, raps], mode: 'percent', pct: 10, scents: [vanille] });
  // Inhalt 270 g = Wachs + 10 % von der Hälfte des Wachses -> waxG = 270 / 1,05
  near(r.waxG, 270 / 1.05); near(r.scentG, r.waxG * 0.5 * 0.1);
  near(r.waxes[0].g * 0.1, r.scentG);
  assert.equal(r.waxes[1].scented, false);
  // ml-Modus: gleicher Prozentwert wird zurückgerechnet
  const m = calcCost({ ...base, waxes: [wax, raps], mode: 'ml', scents: [{ ...vanille, ml: r.scents[0].ml }] });
  near(m.scentPct, 10, 1e-6); near(m.waxG, r.waxG);
  // Gramm-Modus
  const g = calcCost({ ...base, waxes: [wax, { ...raps, sharePct: null, grams: 100 }], waxUnit: 'g', mode: 'percent', pct: 10, scents: [vanille] });
  near(g.waxes[1].g, 100); near(g.waxes[0].g * 0.1, g.scentG); near(g.waxG + g.scentG, 270);
  assert.match(calcCost({ ...base, waxes: [{ ...wax, scented: false }, { ...raps, scented: false }], mode: 'percent', pct: 10, scents: [vanille] }).errors[0], /Duftöl bekommen/);
});

test('Figur ohne Glas: Gewicht enthält schon das Duftöl, keine Glaskosten', () => {
  const r = calcCost({ noGlass: true, waxAmountG: 108, wax, mode: 'percent', pct: 8, scents: [vanille], extras: [] });
  assert.ok(r.ok);
  near(r.waxG, 100); near(r.scentG, 8); near(r.innerG, 108); near(r.costs.glass, 0);
  near(r.costs.total, r.costs.wax + r.costs.scent);
  assert.match(calcCost({ noGlass: true, wax, mode: 'percent', pct: 0, scents: [] }).errors[0], /Gewicht der Figur/);
  const m = calcCost({ noGlass: true, waxAmountG: 108, wax, mode: 'ml', scents: [{ ...vanille, ml: 8 / 0.95 }] });
  near(m.waxG, 100); near(m.scentPct, 8);
});

test('Duftöl je Wachs: jedes Wachs mit eigenem Duft und eigener Konzentration', () => {
  const soja = { ...wax, scent: { name: 'Vanille', densityGml: 0.95, pricePerMl: 0.1, pct: 10 } };
  const raps = { name: 'Raps', pricePerKg: 10, sharePct: 40, scent: { name: 'Karamell', densityGml: 1, pricePerMl: 0.2, pct: 5 } };
  const sc = [{ name: 'Vanille', densityGml: 0.95, pricePerMl: 0.1 }, { name: 'Karamell', densityGml: 1, pricePerMl: 0.2 }];
  const r = calcCost({ ...base, waxes: [soja, raps], perWax: true, scents: sc, mode: 'percent' });
  assert.ok(r.ok, JSON.stringify(r.errors));
  near(r.waxG + r.scentG, 270);
  near(r.waxes[0].g, r.waxG * 0.6); near(r.waxes[1].g, r.waxG * 0.4);
  near(r.scents[0].g, r.waxes[0].g * 0.10); near(r.scents[1].g, r.waxes[1].g * 0.05);
  assert.equal(r.scents[1].waxName, 'Raps');
  // Gramm-Modus, nur das zweite Wachs hat Duft
  const g = calcCost({ ...base, waxes: [{ ...wax }, { ...raps, sharePct: null, grams: 100 }], waxUnit: 'g', perWax: true, scents: [sc[1]], mode: 'percent' });
  near(g.waxes[1].g, 100); near(g.scents[0].g, 5); near(g.waxG + g.scentG, 270);
  // Figur ohne Glas
  const f = calcCost({ noGlass: true, waxAmountG: 100, waxes: [soja, raps], perWax: true, scents: sc, mode: 'percent' });
  near(f.waxG + f.scentG, 100); near(f.scentG, f.waxG * 0.6 * 0.1 + f.waxG * 0.4 * 0.05);
  assert.match(calcCost({ ...base, waxes: [{ ...soja, scent: { ...soja.scent, pct: null } }, raps], perWax: true, scents: sc }).errors[0], /Duftölmenge für Vanille/);
});
