import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate, subline, derivedLines, formValues, FIELDS } from '../js/materials.js';
import { newState, migrate } from '../js/core/state.js';

const near = (a, b, eps = 0.5) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);
const glassRaw = { name: 'Dessertglas 250', shape: 'round', heightMm: '90', widthMm: '80', wallMm: '3', emptyWeightG: '195', priceMode: 'piece', price: '1,80', packQty: '' };

test('Glas: gültige Eingabe (Komma) wird zum Item', () => {
  const r = validate('glaeser', glassRaw);
  assert.ok(r.ok, JSON.stringify(r.errors));
  assert.equal(r.item.price, 1.8);
  assert.equal(r.item.emptyWeightG, 195);
  assert.equal(r.item.packQty, 1);
  assert.equal(r.item.diameterTopMm, null); // nur bei konisch sichtbar
  assert.equal(r.item.manufacturer, null);
});

test('Glas: Pflichtfelder und Zahlenfehler', () => {
  const r = validate('glaeser', { ...glassRaw, name: ' ', heightMm: '', widthMm: 'abc', emptyWeightG: '0', price: '-2' });
  assert.equal(r.ok, false);
  assert.match(r.errors.name, /Pflicht/);
  assert.match(r.errors.heightMm, /Pflicht/);
  assert.match(r.errors.widthMm, /Zahl/);
  assert.match(r.errors.emptyWeightG, /größer als 0/);
  assert.match(r.errors.price, /Zahl/);
});

test('Packungspreis: Stückzahl Pflicht und ganzzahlig, Stückpreis abgeleitet', () => {
  const raw = { ...glassRaw, priceMode: 'pack', price: '29', packQty: '' };
  assert.match(validate('glaeser', raw).errors.packQty, /Pflicht/);
  assert.match(validate('glaeser', { ...raw, packQty: '2,5' }).errors.packQty, /ganze Zahl/);
  const ok = validate('glaeser', { ...raw, packQty: '100' });
  assert.ok(ok.ok);
  assert.ok(derivedLines('glaeser', ok.item).includes('= 0,29 € pro Stück'));
});

test('Wachs: Dichte-Vorgabe, Maximum nicht unter Standard', () => {
  const raw = { name: 'Soja', price: '13,36', quantityKg: '1', densityGml: '', fragranceStdPct: '8', fragranceMaxPct: '6' };
  const r = validate('waechse', raw);
  assert.match(r.errors.fragranceMaxPct, /nicht unter/);
  const ok = validate('waechse', { ...raw, fragranceMaxPct: '12' });
  assert.ok(ok.ok);
  assert.equal(ok.item.densityGml, 0.9);
  assert.deepEqual(derivedLines('waechse', ok.item), ['= 13,36 € pro kg']);
});

test('Duft: Preis pro ml mit vier Nachkommastellen', () => {
  const r = validate('duefte', { name: 'Vanille', price: '3,18', quantityMl: '100', densityGml: '' });
  assert.ok(r.ok);
  assert.equal(r.item.densityGml, 0.95);
  assert.deepEqual(derivedLines('duefte', r.item), ['= 0,0318 € pro ml']);
});

test('Unterzeilen wie in der Spec', () => {
  const glass = validate('glaeser', glassRaw).item;
  assert.deepEqual(subline('glaeser', glass), { parts: ['Ø 80 × 90 mm', '1,80 € / Stück'], priceMissing: false });
  const rect = { ...glass, shape: 'rect', depthMm: 70 };
  assert.equal(subline('glaeser', rect).parts[0], '80 × 70 × 90 mm');
  assert.equal(subline('glaeser', { ...rect, depthMm: null }).parts[0], '80 × 90 mm');
  assert.equal(subline('glaeser', { ...glass, shape: 'other' }).parts[0], '80 × 90 mm');
  assert.deepEqual(subline('waechse', { price: 13.36, quantityKg: 1 }).parts, ['13,36 € / kg']);
  assert.deepEqual(subline('duefte', { price: 3.18, quantityMl: 100 }).parts, ['0,0318 € / ml']);
  assert.deepEqual(subline('sonstiges', { priceMode: 'pack', price: 2.9, packQty: 10 }).parts, ['0,29 € / Stück']);
  assert.equal(subline('waechse', { price: null, quantityKg: null }).priceMissing, true);
});

test('Glasvolumen-Zeile', () => {
  const glass = validate('glaeser', glassRaw).item;
  assert.equal(derivedLines('glaeser', glass)[0], 'Volumen: ca. 374 ml (Schätzung)');
  assert.equal(derivedLines('glaeser', { ...glass, shape: 'other' })[0], 'Keine Schätzung möglich');
  assert.match(derivedLines('glaeser', { ...glass, shape: 'conical' })[0], /grobe Schätzung/);
});

test('Formularwerte: Vorgaben und Bearbeiten mit Komma', () => {
  const blank = formValues('waechse', null);
  assert.equal(blank.densityGml, '0,9');
  assert.equal(formValues('glaeser', null).wallMm, '3');
  assert.equal(formValues('duefte', { name: 'X', price: 3.5, quantityMl: 100, densityGml: 0.95 }).price, '3,5');
  assert.ok(Object.keys(FIELDS).length === 4);
});

test('State: Startzustand und migrate', () => {
  const s = newState();
  assert.equal(s.schemaVersion, 1);
  assert.equal(s.waxes.length, 5);
  assert.deepEqual([s.glasses, s.scents, s.extras, s.candles], [[], [], [], []]);
  assert.equal(migrate(s), s);
  assert.throws(() => migrate({ schemaVersion: 99 }), /neueren/);
  assert.throws(() => migrate(null));
});

// Offline-Schutz: jedes von js/main.js erreichbare Modul muss im Service-Worker-Cache stehen
test('Service Worker kennt alle importierten Module', () => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const sw = readFileSync(join(root, 'sw.js'), 'utf8');
  const listed = new Set([...sw.match(/const FILES = \[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map((m) => m[1]));
  const seen = new Set();
  const walk = (file) => {
    if (seen.has(file)) return;
    seen.add(file);
    const src = readFileSync(join(root, file), 'utf8');
    for (const m of src.matchAll(/from\s+'(\.[^']+)'/g)) walk(relative(root, resolve(root, dirname(file), m[1])).replaceAll('\\', '/'));
  };
  walk('js/main.js');
  const missing = [...seen].filter((f) => !listed.has(f));
  assert.deepEqual(missing, []);
});
