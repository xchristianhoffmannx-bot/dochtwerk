// Export (#/export): Seitenfotos + angaben.txt als ZIP (Spec 6.10).
import { h, toast } from '../components.js';
import { icon } from '../icons.js';
import { T } from '../../texts.js';
import { getState, photoBytes } from '../../store.js';
import { download } from '../../photos.js';
import { missingForExport } from '../../core/candle.js';
import { buildExportZip, sideId, dateStamp } from '../../core/backup.js';
import { galleryOrder } from '../../candles.js';

const E = T.export;

export default function exportScreen() {
  const candles = galleryOrder(getState().candles);
  const ready = candles.filter((c) => !missingForExport(c).length);
  const open = candles.filter((c) => missingForExport(c).length);
  const picked = new Set(ready.map((c) => c.id));

  const screen = h('section', { class: 'screen' },
    h('h1', { class: 'screen-title' }, E.title),
    h('p', { class: 'subtitle' }, E.sub));

  if (!candles.length) {
    screen.append(h('p', { class: 'empty' }, E.empty), h('a', { class: 'btn btn-secondary', href: '#/galerie' }, E.emptyLink));
    return screen;
  }

  const button = h('button', { class: 'btn btn-primary', type: 'button' }, icon('folder-down'), E.button);
  const toggle = h('button', { class: 'link', type: 'button' });
  const boxes = [];
  const sync = () => {
    button.disabled = picked.size === 0;
    toggle.textContent = picked.size === ready.length ? E.selectNone : E.selectAll;
  };
  toggle.addEventListener('click', () => {
    const all = picked.size !== ready.length;
    picked.clear();
    if (all) ready.forEach((c) => picked.add(c.id));
    boxes.forEach((b, i) => { b.checked = all && !!ready[i]; });
    sync();
  });

  if (ready.length) {
    screen.append(
      h('h2', { class: 'field-label' }, E.ready),
      h('div', { class: 'list' }, ready.map((c) => {
        const box = h('input', { type: 'checkbox', id: `x-${c.id}`, class: 'check' });
        box.checked = true;
        box.addEventListener('change', () => { box.checked ? picked.add(c.id) : picked.delete(c.id); sync(); });
        boxes.push(box);
        return h('label', { class: 'list-row', for: box.id }, box,
          h('div', {}, h('div', { class: 'list-row-title' }, c.name), h('div', { class: 'list-row-sub' }, E.readySub)));
      })),
      toggle);
  }

  if (open.length) {
    screen.append(
      h('h2', { class: 'field-label' }, E.incomplete),
      h('div', { class: 'stack' }, open.map((c) => h('div', { class: 'card card-row' },
        h('div', {}, h('div', { class: 'list-row-title' }, c.name || T.gallery.unnamed),
          h('div', { class: 'list-row-sub' }, missingForExport(c).join(', '))),
        h('a', { class: 'link', href: `#/galerie/${c.id}` }, E.complete)))));
  }

  button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      const chosen = ready.filter((c) => picked.has(c.id));
      const skipped = []; // Kerzen, deren Seitenfoto im Speicher fehlt
      const zip = await buildExportZip(chosen, photoBytes, new Date(), (c) => skipped.push(c.name));
      const name = `dochtwerk-export-${dateStamp()}.zip`;
      if (skipped.length === chosen.length) toast(E.photoMissing(skipped));
      else {
        download(zip, name);
        toast(skipped.length ? E.donePartial(name, skipped) : E.done(name));
      }
    } catch { toast(E.failed); }
    sync();
  });

  screen.append(h('p', { class: 'hint' }, E.note), button);
  sync();
  return screen;
}
