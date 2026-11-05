import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newState } from '../js/core/state.js';
import { calcCost } from '../js/core/calc-cost.js';
import { calcPlan } from '../js/core/calc-plan.js';
import { costInput, planInput, getDraft, blankRow } from '../js/calc-forms.js';

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

// Mockup-Fall AB1 aus Materialien und Eingabetexten im Zustand
function setup() {
  const s = newState();
  s.glasses.push({ id: 'g1', name: 'Dessertglas 250', shape: 'round', heightMm: 90, widthMm: 80, wallMm: 3, emptyWeightG: 195, priceMode: 'piece', price: 1.8, packQty: 1 });
  Object.assign(s.waxes[0], { price: 13.36, quantityKg: 1 });
  s.scents.push({ id: 's1', name: 'Vanille', price: 3.18, quantityMl: 100, densityGml: 0.95 });
  s.scents.push({ id: 's2', name: 'Karamell', price: 4, quantityMl: 100, densityGml: 1 });
  s.extras.push({ id: 'x1', name: 'Docht', priceMode: 'pack', price: 2.9, packQty: 10 });
  s.extras.push({ id: 'x2', name: 'Etikett', priceMode: 'piece', price: 0.3, packQty: 1 });
  return s;
}

test('AB1 über Entwurf: Kostenrechner percent', () => {
  const s = setup();
  const d = getDraft(s, 'cost');
  Object.assign(d, { glassId: 'g1', waxId: s.waxes[0].id, totalWeight: '465', pct: '8' });
  d.scents[0].scentId = 's1';
  d.extras = { x1: { on: true, qty: '1' }, x2: { on: true, qty: '1' } };
  const { input, errors } = costInput(s, d);
  assert.deepEqual(errors, []);
  const r = calcCost(input);
  assert.ok(r.ok);
  near(r.costs.total, 6.399474, 1e-5);
  assert.deepEqual(input.extras.map((e) => e.extraId), ['x1', 'x2']);
});

test('AB2 über Entwurf: ml-Modus mit zwei Düften', () => {
  const s = setup();
  const d = getDraft(s, 'cost');
  Object.assign(d, { glassId: 'g1', waxId: s.waxes[0].id, totalWeight: '465', mode: 'ml' });
  d.scents = [{ ...blankRow(), scentId: 's1', ml: '12' }, { ...blankRow(), scentId: 's2', ml: '8' }];
  const r = calcCost(costInput(s, d).input);
  near(r.scentG, 19.4); near(r.waxG, 250.6);
});

test('Zubehör-Vorauswahl aus der letzten Rechnung, gelöschtes Zubehör fällt weg', () => {
  const s = setup();
  s.drafts.lastExtras = [{ extraId: 'x1', qty: 2 }, { extraId: 'weg', qty: 1 }];
  const d = getDraft(s, 'cost');
  assert.deepEqual(d.extras, { x1: { on: true, qty: '2' } });
});

test('Unlesbare Eingaben werden gemeldet, Komma funktioniert', () => {
  const s = setup();
  const d = getDraft(s, 'cost');
  Object.assign(d, { glassId: 'g1', waxId: s.waxes[0].id, totalWeight: '46x', pct: '8,5' });
  const r = costInput(s, d);
  assert.ok(r.errors.some((e) => /Gesamtgewicht/.test(e)));
  near(r.input.pct, 8.5);
});

test('Gelöschter Duft und leere Auswahl werden übersprungen', () => {
  const s = setup();
  const d = getDraft(s, 'cost');
  d.scents = [{ ...blankRow(), scentId: 'weg' }, blankRow(), { ...blankRow(), scentId: 's1' }];
  assert.equal(costInput(s, d).input.scents.length, 1);
});

test('AB3/AB4 über Entwurf: Wachs & Duftrechner', () => {
  const s = setup();
  const d = getDraft(s, 'plan');
  Object.assign(d, { waxId: s.waxes[0].id, pct: '8', volume: '250' });
  d.scents[0].scentId = 's1';
  const r = calcPlan(planInput(s, d).input);
  near(r.waxG, 209.15, 5e-3);

  Object.assign(d, { mode: 'ml' });
  d.scents[0].ml = '18';
  const m = calcPlan(planInput(s, d).input);
  near(m.waxG, 208.8, 5e-3); near(m.scentPct, 8.19, 5e-3);
});

test('Ohne Auswahl: Rechner melden fehlende Angaben statt zu rechnen', () => {
  const s = setup();
  const c = calcCost(costInput(s, getDraft(s, 'cost')).input);
  assert.equal(c.ok, false);
  assert.match(c.errors[0], /Wähle ein Glas/);
  const p = calcPlan(planInput(s, getDraft(s, 'plan')).input);
  assert.equal(p.ok, false);
});
