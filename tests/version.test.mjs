import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { APP_VERSION } from '../js/texts.js';

// Die angezeigte Version und der Cache-Name müssen immer zusammen hochgezählt werden.
test('APP_VERSION passt zu CACHE_VERSION in sw.js', () => {
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  const cache = sw.match(/const CACHE_VERSION = '([^']+)'/)[1];
  assert.equal(cache, `dochtwerk-${APP_VERSION}`);
});

// Unter derselben Adresse (github.io) liegen weitere Apps: nur eigene Caches löschen, Dateien frisch laden.
test('Service Worker: löscht nur eigene Caches und lädt am HTTP-Cache vorbei', () => {
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.match(sw, /k\.startsWith\(CACHE_PREFIX\) && k !== CACHE_VERSION/);
  const prefix = sw.match(/const CACHE_PREFIX = '([^']+)'/)[1];
  assert.ok(`dochtwerk-${APP_VERSION}`.startsWith(prefix));
  assert.match(sw, /cache: 'reload'/);
});
