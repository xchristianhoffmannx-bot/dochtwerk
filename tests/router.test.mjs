import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parentOf } from '../js/router.js';

test('Zurück führt zum logischen Elternscreen', () => {
  assert.equal(parentOf('/kosten/ergebnis'), '/kosten');
  assert.equal(parentOf('/kosten'), '/');
  assert.equal(parentOf('/material/glaeser'), '/');
  assert.equal(parentOf('/material/waechse/neu'), '/material/waechse');
  assert.equal(parentOf('/material/duefte/abc-123'), '/material/duefte');
  assert.equal(parentOf('/galerie/neu'), '/galerie');
  assert.equal(parentOf('/galerie/diashow'), '/galerie');
  assert.equal(parentOf('/galerie/abc'), '/galerie');
  assert.equal(parentOf('/galerie'), '/');
  assert.equal(parentOf('/export'), '/');
});
