import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildExportZip, buildBackupZip, parseBackup, dateStamp } from '../js/core/backup.js';
import { readZip } from '../js/core/zip.js';
import { newState } from '../js/core/state.js';

const candle = (id, name, photoIds) => ({
  id, name, scentMode: 'percent', scentPct: 8,
  glass: { heightMm: 90, widthMm: 80 },
  scents: [{ name: 'Vanille', shareMassPct: 100 }],
  photos: photoIds.map((p, i) => ({ id: p, role: i === 0 ? 'side' : 'other' })),
});
const bytes = (id) => new TextEncoder().encode(`jpg-${id}`);

test('Export-ZIP: Ordner pro Kerze, doppelte Namen nummeriert', async () => {
  const zip = await buildExportZip([candle('a', 'Vanille', ['p1', 'p2']), candle('b', 'Vanille', ['p3'])], async (id) => bytes(id));
  const names = readZip(zip).map((f) => f.name);
  assert.deepEqual(names, ['vanille/seite.jpg', 'vanille/angaben.txt', 'vanille-2/seite.jpg', 'vanille-2/angaben.txt']);
  assert.equal(new TextDecoder().decode(readZip(zip)[0].data), 'jpg-p1');
});

test('Sicherung: Rundlauf, fehlendes Foto und fremde Datei werden abgelehnt', async () => {
  const s = newState();
  s.candles.push(candle('a', 'Ä', ['p1', 'p2']));
  const zip = await buildBackupZip(s, async (id) => bytes(id));
  const r = parseBackup(zip);
  assert.deepEqual(r.state, s);
  assert.deepEqual(r.photos.map((p) => p.id), ['p1', 'p2']);

  s.candles[0].photos.push({ id: 'ohne', role: 'other' });
  const bad = await buildBackupZip(s, async (id) => bytes(id));
  assert.ok(parseBackup(bad)); // Foto liegt vor (bytes liefert immer etwas)
  const noPhoto = (await import('../js/core/zip.js')).writeZip([{ name: 'state.json', data: new TextEncoder().encode(JSON.stringify(s)) }]);
  assert.throws(() => parseBackup(noPhoto), /fehlt/);
  assert.throws(() => parseBackup(new TextEncoder().encode('kein zip')));
});

test('Sicherung: fehlendes Foto wird gemeldet und ausgelassen, Rest bleibt wiederherstellbar', async () => {
  const s = newState();
  s.candles.push(candle('a', 'Rose', ['p1', 'weg']), candle('b', 'Zimt', ['p3']));
  const missing = [];
  const zip = await buildBackupZip(s, async (id) => (id === 'weg' ? null : bytes(id)), new Date(), (c, p) => missing.push(`${c.name}:${p.id}`));
  assert.deepEqual(missing, ['Rose:weg']);
  const r = parseBackup(zip); // wirft nicht: state.json verweist nicht mehr auf das fehlende Foto
  assert.deepEqual(r.photos.map((p) => p.id), ['p1', 'p3']);
  assert.deepEqual(r.state.candles[0].photos.map((p) => p.id), ['p1']);
  assert.deepEqual(s.candles[0].photos.map((p) => p.id), ['p1', 'weg']); // der laufende Zustand bleibt unverändert
});

test('Export-ZIP: Kerze ohne lesbares Seitenfoto wird ausgelassen und gemeldet', async () => {
  const skipped = [];
  const zip = await buildExportZip(
    [candle('a', 'Vanille', ['weg']), candle('b', 'Vanille', ['p3'])],
    async (id) => (id === 'weg' ? null : bytes(id)), new Date(), (c) => skipped.push(c.id));
  assert.deepEqual(skipped, ['a']);
  assert.deepEqual(readZip(zip).map((f) => f.name), ['vanille/seite.jpg', 'vanille/angaben.txt']);
});

test('dateStamp', () => assert.equal(dateStamp(new Date(2026, 10, 5)), '2026-11-05'));
