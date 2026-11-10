import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeLegacy, isLegacy } from '../js/core/legacy-import.js';
import { newState } from '../js/core/state.js';
import { estimateVolume } from '../js/core/glass-volume.js';

const legacy = {
  vessels: [
    { name: 'Weck 140', shape: 'round', weight: '210', price: '1,80', d: '7', h: '8' },
    { name: 'Eckig', shape: 'rect', weight: '300', price: '2', l: '6', w: '5', h: '7' },
    { name: 'Nur ml', shape: 'round', weight: '', price: '1', ml: '100' },
  ],
  waxes: [
    { name: 'Rapswachs', price: '13.5', density: '0.905', pct: '8', max: '10' },
    { name: 'Neues Wachs', price: '10', density: '0,9', pct: '', max: '' },
  ],
  oils: [{ name: 'Vanille', price: '0.35' }],
};

test('Altes Zubehör wird übernommen, Volumen bleibt gleich', () => {
  assert.ok(isLegacy(legacy));
  assert.ok(!isLegacy({ schemaVersion: 1 }));
  const s = newState();
  const ids = (() => { let i = 0; return () => `id${i++}`; })();
  const r = mergeLegacy(legacy, s, ids);
  assert.deepEqual(r, { glasses: 2, waxes: 1, scents: 1, updated: 1, skipped: 1 });
  const weck = s.glasses[0];
  assert.equal(weck.emptyWeightG, 210);
  assert.equal(weck.price, 1.8);
  // alt: π·3,5²·8 cm³ = 307,9 ml
  assert.ok(Math.abs(estimateVolume(weck).ml - Math.PI * 3.5 * 3.5 * 8) < 0.5);
  assert.ok(Math.abs(estimateVolume(s.glasses[1]).ml - 6 * 5 * 7) < 0.5);
  const raps = s.waxes.find((w) => w.name === 'Rapswachs');
  assert.equal(raps.price, 13.5);
  assert.equal(raps.quantityKg, 1);
  assert.equal(s.scents[0].quantityMl, 1);
});

test('zweiter Import legt nichts doppelt an', () => {
  const s = newState();
  mergeLegacy(legacy, s);
  const again = mergeLegacy(legacy, s);
  assert.equal(again.glasses + again.waxes + again.scents + again.updated, 0);
});
