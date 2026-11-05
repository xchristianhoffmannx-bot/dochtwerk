// ZIP schreiben und lesen, nur Methode 0 (stored), UTF-8-Namen, kein ZIP64.
import { crc32 } from './crc32.js';

const enc = new TextEncoder();
const dec = new TextDecoder('utf-8', { fatal: true });
const SIG_LOCAL = 0x04034b50, SIG_CENTRAL = 0x02014b50, SIG_END = 0x06054b50;

function dosDateTime(d) {
  return {
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
    date: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
}

// files: [{ name: string, data: Uint8Array }] -> Uint8Array
export function writeZip(files, now = new Date()) {
  if (files.length > 0xffff) throw new Error('Zu viele Dateien für ein ZIP ohne ZIP64');
  const { time, date } = dosDateTime(now);
  const chunks = [], central = [];
  let offset = 0;

  for (const f of files) {
    const name = enc.encode(f.name), crc = crc32(f.data), size = f.data.length;
    const lh = new Uint8Array(30 + name.length), v = new DataView(lh.buffer);
    v.setUint32(0, SIG_LOCAL, true); v.setUint16(4, 20, true); v.setUint16(6, 0x0800, true);
    v.setUint16(10, time, true); v.setUint16(12, date, true);
    v.setUint32(14, crc, true); v.setUint32(18, size, true); v.setUint32(22, size, true);
    v.setUint16(26, name.length, true);
    lh.set(name, 30);
    chunks.push(lh, f.data);

    const ch = new Uint8Array(46 + name.length), c = new DataView(ch.buffer);
    c.setUint32(0, SIG_CENTRAL, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true);
    c.setUint16(12, time, true); c.setUint16(14, date, true);
    c.setUint32(16, crc, true); c.setUint32(20, size, true); c.setUint32(24, size, true);
    c.setUint16(28, name.length, true); c.setUint32(42, offset, true);
    ch.set(name, 46);
    central.push(ch);
    offset += lh.length + size;
  }
  if (offset > 0xffffffff) throw new Error('ZIP zu groß (kein ZIP64)');

  const cdSize = central.reduce((n, c) => n + c.length, 0);
  const end = new Uint8Array(22), e = new DataView(end.buffer);
  e.setUint32(0, SIG_END, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true);
  e.setUint32(12, cdSize, true); e.setUint32(16, offset, true);

  const parts = [...chunks, ...central, end];
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let p = 0;
  for (const part of parts) { out.set(part, p); p += part.length; }
  return out;
}

// Uint8Array -> [{ name, data }]; wirft bei fremdem Format, Kompression oder falschem CRC.
export function readZip(bytes) {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let e = bytes.length - 22;
  while (e >= 0 && v.getUint32(e, true) !== SIG_END) e--;
  if (e < 0) throw new Error('Kein ZIP');

  const n = v.getUint16(e + 10, true);
  let p = v.getUint32(e + 16, true);
  const files = [];
  for (let i = 0; i < n; i++) {
    if (v.getUint32(p, true) !== SIG_CENTRAL) throw new Error('ZIP-Verzeichnis defekt');
    if (v.getUint16(p + 10, true) !== 0) throw new Error('Nur unkomprimierte ZIPs (stored) werden gelesen');
    const crc = v.getUint32(p + 16, true), size = v.getUint32(p + 20, true);
    const nameLen = v.getUint16(p + 28, true), extraLen = v.getUint16(p + 30, true), commentLen = v.getUint16(p + 32, true);
    const local = v.getUint32(p + 42, true);
    const name = dec.decode(bytes.subarray(p + 46, p + 46 + nameLen));
    const start = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true);
    const data = bytes.slice(start, start + size);
    if (crc32(data) !== crc) throw new Error(`CRC-Fehler in ${name}`);
    files.push({ name, data });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}
