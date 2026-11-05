import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crc32 } from '../js/core/crc32.js';
import { writeZip, readZip } from '../js/core/zip.js';

const enc = new TextEncoder();

test('crc32 Prüfwert', () => {
  assert.equal(crc32(enc.encode('123456789')), 0xcbf43926);
});

test('AB9 ZIP: Rundlauf mit UTF-8-Namen und Reihenfolge', () => {
  const files = [
    { name: 'crème-brûlée/angaben.txt', data: enc.encode('Höhe: 90 mm\n') },
    { name: 'a/seite.jpg', data: Uint8Array.from([0, 255, 1, 254, 2]) },
    { name: 'leer.txt', data: new Uint8Array(0) },
  ];
  const back = readZip(writeZip(files));
  assert.deepEqual(back.map((f) => f.name), files.map((f) => f.name));
  back.forEach((f, i) => assert.deepEqual([...f.data], [...files[i].data]));
});

test('ZIP: defekte Daten werden erkannt', () => {
  const zip = writeZip([{ name: 'x.txt', data: enc.encode('hallo') }]);
  assert.throws(() => readZip(enc.encode('kein zip')), /Kein ZIP/);
  const bad = zip.slice();
  bad[30 + 'x.txt'.length] ^= 1; // erstes Datenbyte kippen
  assert.throws(() => readZip(bad), /CRC/);
});
