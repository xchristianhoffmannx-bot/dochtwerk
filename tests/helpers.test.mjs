import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDecimal, formatEuro, formatPct } from '../js/core/units.js';
import { pricePerKg, pricePerMl, pricePerPiece } from '../js/core/pricing.js';
import { estimateVolume, fillVolume } from '../js/core/glass-volume.js';
import { slug, uniqueSlugs } from '../js/core/slug.js';
import { missingForExport } from '../js/core/candle.js';
import { angabenText } from '../js/core/export-text.js';
import { defaultWaxes } from '../js/core/defaults.js';

const near = (a, b, eps = 0.05) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

test('AB8 Zahlen', () => {
  assert.equal(parseDecimal('8,5'), 8.5);
  assert.equal(parseDecimal('8.5'), 8.5);
  assert.equal(parseDecimal(' 12 '), 12);
  assert.equal(parseDecimal(''), null);
  assert.ok(Number.isNaN(parseDecimal('abc')));
  assert.ok(Number.isNaN(parseDecimal('1.234,5')));
  assert.ok(Number.isNaN(parseDecimal('-3')));
  assert.equal(formatEuro(1234.5), '1.234,50 €');
  assert.equal(formatEuro(0.0318, 4), '0,0318 €');
  assert.equal(formatEuro(0.03, 4), '0,03 €');
  assert.equal(formatPct(8), '8');
  assert.equal(formatPct(7.74), '7,7');
});

test('Einheitspreise', () => {
  near(pricePerKg(13.36, 1), 13.36);
  assert.equal(pricePerKg(10, 0), null);
  assert.equal(pricePerMl(null, 10), null);
  assert.equal(pricePerPiece('pack', 2.9, 10), 0.29);
  assert.equal(pricePerPiece('pack', 2.9, 0), null);
  assert.equal(pricePerPiece('piece', 1.8, 1), 1.8);
});

test('AB5 Glasvolumen', () => {
  const round = estimateVolume({ shape: 'round', heightMm: 90, widthMm: 80 });
  near(round.ml, 374.2); assert.equal(round.rough, false);
  near(estimateVolume({ shape: 'conical', heightMm: 90, widthMm: 80, diameterTopMm: 80, diameterBottomMm: 60 }).ml, 282.2);
  const rough = estimateVolume({ shape: 'conical', heightMm: 90, widthMm: 80 });
  near(rough.ml, 374.2); assert.equal(rough.rough, true);
  near(estimateVolume({ shape: 'rect', widthMm: 70, depthMm: 70, heightMm: 80 }).ml, 315.4);
  assert.equal(estimateVolume({ shape: 'rect', widthMm: 70, heightMm: 80 }), null);
  assert.equal(estimateVolume({ shape: 'other', widthMm: 70, heightMm: 80 }), null);
  near(fillVolume(round.ml, 75), 280.6);
});

test('AB7 slug', () => {
  assert.equal(slug('Vanillewolke'), 'vanillewolke');
  assert.equal(slug('Crème Brûlée'), 'creme-brulee');
  assert.equal(slug('Äpfel & Zimt'), 'aepfel-zimt');
  assert.equal(slug('  '), 'kerze');
  assert.deepEqual(uniqueSlugs(['Vanille', 'Vanille', 'Vanille']), ['vanille', 'vanille-2', 'vanille-3']);
  assert.ok(slug('a'.repeat(60)).length <= 40);
});

const full = () => ({
  name: 'Vanillewolke', scentMode: 'percent', scentPct: 8,
  glass: { heightMm: 90, widthMm: 80 },
  scents: [{ name: 'Vanille', shareMassPct: 60, shareVolPct: 50 }, { name: 'Karamell', shareMassPct: 40, shareVolPct: 50 }],
  photos: [{ id: 'a', role: 'side' }],
});

test('AB10 Vollständigkeit', () => {
  assert.deepEqual(missingForExport(full()), []);
  assert.deepEqual(missingForExport({ ...full(), photos: [{ role: 'other' }] }), ['Seitenansicht fehlt']);
  assert.deepEqual(missingForExport({ ...full(), name: '  ' }), ['Name fehlt']);
  assert.deepEqual(missingForExport({ ...full(), glass: { heightMm: 90 } }), ['Glas fehlt']);
  assert.deepEqual(missingForExport({ ...full(), scents: [] }), ['Duft fehlt']);
  assert.deepEqual(missingForExport({ ...full(), name: '', scents: [] }), ['Name fehlt', 'Duft fehlt']);
});

test('angaben.txt', () => {
  assert.equal(
    angabenText(full()),
    'Name: Vanillewolke\nHöhe: 90 mm\nBreite: 80 mm\nDuft: Vanille 60 %, Karamell 40 %\nDuftöl: 8 % vom Wachs\n',
  );
  // ml-Modus nimmt den Volumenanteil
  assert.match(angabenText({ ...full(), scentMode: 'ml' }), /Duft: Vanille 50 %, Karamell 50 %/);
  // ein Duft: nur der Name; Maße mit Nachkommastelle
  const one = angabenText({ ...full(), scents: [{ name: 'Vanille' }], glass: { heightMm: 87.5, widthMm: 80 } });
  assert.match(one, /Höhe: 87,5 mm/);
  assert.match(one, /Duft: Vanille\n/);
});

test('Startdaten: fünf Wachse ohne Preis', () => {
  const w = defaultWaxes();
  assert.equal(w.length, 5);
  assert.ok(w.every((x) => x.price === null && x.id && x.densityGml > 0));
  assert.equal(new Set(w.map((x) => x.id)).size, 5);
});
