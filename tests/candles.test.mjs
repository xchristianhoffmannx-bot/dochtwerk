import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newState } from '../js/core/state.js';
import { calcCost } from '../js/core/calc-cost.js';
import { costInput, getDraft } from '../js/calc-forms.js';
import { fitSize } from '../js/photos.js';
import { missingForExport } from '../js/core/candle.js';
import {
  snapshotCandle, newManualCandle, candleFormValues, applyCandleForm, KEEP,
  hasSide, orderedPhotos, setSide, removePhoto, galleryOrder, slidesOf, coverPhoto,
} from '../js/candles.js';

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

function setup() {
  const s = newState();
  s.glasses.push({ id: 'g1', name: 'Dessertglas', shape: 'round', heightMm: 90, widthMm: 80, wallMm: 3, emptyWeightG: 195, priceMode: 'piece', price: 1.8, packQty: 1 });
  s.glasses.push({ id: 'g2', name: 'Klein', shape: 'rect', heightMm: 70, widthMm: 60, depthMm: 60, emptyWeightG: 150, priceMode: 'piece', price: 1.2, packQty: 1 });
  Object.assign(s.waxes[0], { price: 13.36, quantityKg: 1 });
  s.scents.push({ id: 's1', name: 'Vanille', price: 3.18, quantityMl: 100, densityGml: 0.95 });
  s.scents.push({ id: 's2', name: 'Karamell', price: 4, quantityMl: 100, densityGml: 1 });
  s.extras.push({ id: 'x1', name: 'Docht', priceMode: 'piece', price: 0.29, packQty: 1 });
  const d = getDraft(s, 'cost');
  Object.assign(d, { glassId: 'g1', waxId: s.waxes[0].id, totalWeight: '465', pct: '8' });
  d.scents[0].scentId = 's1';
  d.extras = { x1: { on: true, qty: '1' } };
  return { s, d };
}

function candleFromCost(name = 'Vanillewolke') {
  const { s, d } = setup();
  const { input } = costInput(s, d);
  const result = calcCost(input);
  return { s, c: snapshotCandle({ state: s, draft: d, input, result, name, now: new Date('2026-11-05T10:00:00Z') }) };
}

test('Snapshot: Preise, Gewichte und Maße werden kopiert', () => {
  const { s, c } = candleFromCost('  Vanillewolke ');
  assert.equal(c.name, 'Vanillewolke');
  assert.equal(c.createdAt, '2026-11-05T10:00:00.000Z');
  assert.deepEqual([c.glass.glassId, c.glass.heightMm, c.glass.widthMm, c.glass.emptyWeightG, c.glass.price], ['g1', 90, 80, 195, 1.8]);
  assert.equal(c.wax.pricePerKg, 13.36);
  assert.equal(c.scents[0].scentId, 's1');
  near(c.scents[0].grams, 20); near(c.scents[0].ml, 21.0526, 1e-4);
  assert.equal(c.extras[0].extraId, 'x1');
  near(c.costs.total, 6.099474, 1e-5); // Wachs 3,34 + Duft 0,67 + Glas 1,80 + Docht 0,29
  assert.equal(c.scentPct, 8);
  assert.deepEqual(c.photos, []);
  // spätere Preisänderung verändert die gespeicherte Kerze nicht
  s.glasses[0].price = 99; s.waxes[0].price = 99;
  assert.equal(c.glass.price, 1.8);
  assert.equal(c.wax.pricePerKg, 13.36);
  // ohne Foto: Seitenansicht fehlt, sonst vollständig
  assert.deepEqual(missingForExport(c), ['Seitenansicht fehlt']);
});

test('Verkaufspreis im Snapshot folgt den Einstellungen', () => {
  const { s, d } = setup();
  s.settings.markupOn = true;
  const { input } = costInput(s, d);
  const c = snapshotCandle({ state: s, draft: d, input, result: calcCost(input), name: '' });
  assert.deepEqual(c.markup, { on: true, pct: 150, price: 15 }); // 6,0995 × 2,5 = 15,25 -> 15,00
});

test('Formular: unveränderte Werte ändern nichts, Glaswechsel kopiert Maße neu', () => {
  const { s, c } = candleFromCost();
  const raw = candleFormValues(c, s);
  const same = applyCandleForm(c, raw, s);
  assert.ok(same.ok);
  assert.deepEqual(same.next.glass, c.glass);
  assert.equal(same.next.scents[0].ml, c.scents[0].ml); // ml/Gramm bleiben erhalten
  const sw = applyCandleForm(c, { ...raw, glassId: 'g2', name: 'Neu', costTotal: '7,5' }, s);
  assert.equal(sw.next.glass.glassId, 'g2');
  assert.equal(sw.next.glass.depthMm, 60);
  assert.equal(sw.next.costs.total, 7.5);
  assert.equal(sw.next.costs.wax, c.costs.wax); // Aufschlüsselung bleibt Snapshot
  assert.equal(c.glass.glassId, 'g1'); // Original unverändert
});

test('Formular: gelöschtes Material bleibt als gespeicherter Wert erhalten', () => {
  const { s, c } = candleFromCost();
  s.scents = []; s.glasses = [];
  const raw = candleFormValues(c, s);
  assert.equal(raw.scents[0].scentId, KEEP);
  const r = applyCandleForm(c, raw, s);
  assert.ok(r.ok);
  assert.equal(r.next.scents[0].name, 'Vanille');
  assert.equal(r.next.glass.name, 'Dessertglas');
});

test('Formular: mehrere Düfte brauchen Anteile, Summe 100', () => {
  const { s } = setup();
  const c = newManualCandle();
  const base = { name: 'X', glassId: 'g1', waxId: '', scentPct: '8', totalWeight: '', costTotal: '' };
  const two = (a, b) => ({ ...base, scents: [{ src: null, scentId: 's1', share: a }, { src: null, scentId: 's2', share: b }] });
  assert.match(applyCandleForm(c, two('', '40'), s).errors['scent-0'], /Pflicht/);
  assert.match(applyCandleForm(c, two('50', '40'), s).errors.scents, /nicht 100/);
  const ok = applyCandleForm(c, two('60', '40'), s);
  assert.ok(ok.ok);
  assert.deepEqual(ok.next.scents.map((e) => [e.name, e.shareMassPct, e.shareVolPct]), [['Vanille', 60, 60], ['Karamell', 40, 40]]);
  // ein Duft ohne Anteil: 100
  const one = applyCandleForm(c, { ...base, scents: [{ src: null, scentId: 's1', share: '' }] }, s);
  assert.equal(one.next.scents[0].shareMassPct, 100);
  assert.match(applyCandleForm(c, { ...base, scentPct: 'abc', scents: [] }, s).errors.scentPct, /Zahl/);
});

test('Manuelle Kerze wird exportierbar, wenn Name, Glas, Duft und Seitenansicht da sind', () => {
  const { s } = setup();
  let c = newManualCandle();
  assert.deepEqual(missingForExport(c), ['Seitenansicht fehlt', 'Name fehlt', 'Glas fehlt', 'Duft fehlt']);
  c = applyCandleForm(c, { name: 'Test', glassId: 'g1', waxId: '', scents: [{ src: null, scentId: 's1', share: '' }], scentPct: '8', totalWeight: '', costTotal: '' }, s).next;
  c.photos.push({ id: 'p1', role: 'side', createdAt: 'a' });
  assert.deepEqual(missingForExport(c), []);
});

test('Foto-Rollen: neue Seitenansicht macht die alte zu other, nichts geht verloren', () => {
  const c = newManualCandle();
  c.photos.push({ id: 'a', role: 'other', createdAt: '1' }, { id: 'b', role: 'side', createdAt: '2' }, { id: 'c', role: 'other', createdAt: '3' });
  assert.deepEqual(orderedPhotos(c).map((p) => p.id), ['b', 'a', 'c']);
  assert.ok(hasSide(c));
  setSide(c, 'c');
  assert.deepEqual(orderedPhotos(c).map((p) => `${p.id}:${p.role}`), ['c:side', 'a:other', 'b:other']);
  assert.equal(coverPhoto(c).id, 'c');
  removePhoto(c, 'c');
  assert.equal(hasSide(c), false);
  assert.equal(coverPhoto(c).id, 'a'); // ohne Seitenansicht: erstes Foto
});

test('Galerie neueste zuerst, Diashow mit Seitenansicht zuerst', () => {
  const mk = (id, createdAt, photos) => ({ ...newManualCandle(), id, createdAt, name: id, photos });
  const a = mk('alt', '2026-01-01', [{ id: 'a1', role: 'other' }, { id: 'a2', role: 'side' }]);
  const b = mk('neu', '2026-06-01', [{ id: 'b1', role: 'side' }]);
  const c = mk('leer', '2026-03-01', []);
  assert.deepEqual(galleryOrder([a, b, c]).map((x) => x.id), ['neu', 'leer', 'alt']);
  assert.deepEqual(slidesOf([a, b, c]).map((x) => x.photoId), ['b1', 'a2', 'a1']);
  assert.equal(coverPhoto(c), null);
});

test('Foto-Größe: nie hochskalieren, lange Kante begrenzt', () => {
  assert.deepEqual(fitSize(4000, 3000, 2000), { w: 2000, h: 1500 });
  assert.deepEqual(fitSize(3000, 4000, 400), { w: 300, h: 400 });
  assert.deepEqual(fitSize(800, 600, 2000), { w: 800, h: 600 });
});

test('Formular: Wachs nachträglich hinzufügen, Mischung ändern, wieder entfernen', () => {
  const { s, c } = candleFromCost();
  s.waxes.push({ id: 'w2', name: 'Raps', price: 20, quantityKg: 1, densityGml: 0.9 });
  const raw = candleFormValues(c, s);
  assert.deepEqual(raw.moreWaxes, []);
  const r = applyCandleForm(c, { ...raw, moreWaxes: [{ src: null, waxId: 'w2', share: '40', scented: false }] }, s);
  assert.ok(r.ok, JSON.stringify(r.errors));
  const mix = r.next.waxMix;
  assert.deepEqual(mix.map((x) => [x.name, x.sharePct, x.scented]), [[c.wax.name, 60, true], ['Raps', 40, false]]);
  near(mix[0].grams + mix[1].grams, c.waxG);
  near(r.next.costs.wax, mix[0].cost + mix[1].cost, 0.006);
  near(r.next.costs.total, c.costs.total + (r.next.costs.wax - c.costs.wax), 0.011); // Gesamtpreis zieht mit
  assert.equal(r.next.costs.total, Math.round(r.next.costs.total * 100) / 100); // Cent
  // erneut öffnen: Zeilen kommen zurück; in Gramm eingeben
  const again = candleFormValues(r.next, s);
  assert.equal(again.moreWaxes[0].share, '40');
  const g = applyCandleForm(r.next, { ...again, waxUnit: 'g', moreWaxes: [{ ...again.moreWaxes[0], share: String(c.waxG / 4) }] }, s);
  near(g.next.waxMix[1].sharePct, 25);
  // Summe >= 100 -> Fehler; Zeile entfernen -> wieder einzelnes Wachs
  assert.match(applyCandleForm(c, { ...raw, moreWaxes: [{ src: null, waxId: 'w2', share: '100', scented: true }] }, s).errors.waxes, /Anteile/);
  const back = applyCandleForm(r.next, { ...again, moreWaxes: [] }, s);
  assert.equal(back.next.waxMix, undefined);
  near(back.next.costs.wax, c.costs.wax, 0.006);
});

test('Wachs in der Kerze wechseln rechnet Wachs- und Gesamtkosten neu, eigener Gesamtpreis bleibt', () => {
  const { s, c } = candleFromCost();
  s.waxes.push({ id: 'w2', name: 'Raps', price: 30, quantityKg: 1, densityGml: 0.9 });
  const raw = candleFormValues(c, s);
  const sw = applyCandleForm(c, { ...raw, waxId: 'w2' }, s).next;
  near(sw.costs.wax, (c.waxG / 1000) * 30, 0.006);
  near(sw.costs.total, c.costs.total + sw.costs.wax - c.costs.wax, 0.011);
  const own = applyCandleForm(c, { ...raw, waxId: 'w2', costTotal: '9' }, s).next;
  assert.equal(own.costs.total, 9);
  // nichts geändert -> nichts verschoben
  assert.equal(applyCandleForm(c, raw, s).next.costs.wax, c.costs.wax);
});
