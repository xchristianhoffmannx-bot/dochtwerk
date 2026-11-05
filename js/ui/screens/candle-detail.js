// Kerzen-Detail (#/galerie/<id>) und manuelles Anlegen (#/galerie/neu), Spec 6.8.
import { h, field, selectInput, textInput, confirmDialog, sheet, toast } from '../components.js';
import { icon } from '../icons.js';
import { T } from '../../texts.js';
import { getState, commit, getPhoto, putPhoto, deletePhoto, requestPersist } from '../../store.js';
import { pickImage, processFile, UrlBag } from '../../photos.js';
import { pickSource } from '../sheets.js';
import { MAX_SCENTS, blankRow } from '../../calc-forms.js';
import { missingForExport } from '../../core/candle.js';
import {
  KEEP, newManualCandle, candleFormValues, applyCandleForm,
  hasSide, orderedPhotos, setSide, removePhoto,
} from '../../candles.js';

const K = T.candle, P = T.photo;

export default function candleDetail(id) {
  const state = getState();
  const isNew = id === 'neu';
  const stored = isNew ? null : state.candles.find((c) => c.id === id);
  if (!isNew && !stored) {
    location.replace('#/galerie');
    return h('div');
  }
  const work = stored ?? newManualCandle(); // neue Kerze liegt erst nach "Speichern" im State
  const raw = candleFormValues(work, state);
  const bag = new UrlBag();
  const newPhotoIds = []; // Fotos einer noch nicht gespeicherten Kerze
  let dirty = false, saved = false, gone = false;
  const persist = () => commit(() => {});

  const errEls = {};
  const errorEl = (key) => (errEls[key] = h('p', { class: 'field-error' }));
  const showErrors = (errors) => {
    for (const [k, el] of Object.entries(errEls)) el.textContent = errors[k] || '';
  };

  // --- Status und Fotos ---
  const status = h('div', { 'aria-live': 'polite' });
  function refreshStatus() {
    const missing = missingForExport(applyCandleForm(work, raw, state).next).map((m) => m.replace(' fehlt', ''));
    status.replaceChildren(missing.length
      ? h('p', { class: 'msg msg-warn' }, K.missing(missing.join(', ')))
      : h('p', { class: 'msg msg-ok' }, K.ready));
  }

  const strip = h('div', { class: 'photo-strip' });
  async function viewPhoto(p) {
    let rec;
    try { rec = await getPhoto(p.id); } catch { return; }
    if (!rec) return;
    const url = URL.createObjectURL(rec.blob);
    const choice = await sheet({
      body: h('img', { class: 'photo-big', src: url, alt: '' }),
      actions: [
        p.role !== 'side' && { label: P.markSide, value: 'side', primary: true },
        { label: P.remove, value: 'delete', danger: true },
        { label: P.close, value: null },
      ].filter(Boolean),
    });
    URL.revokeObjectURL(url);
    if (choice === 'side') {
      if (hasSide(work) && !(await confirmDialog({ title: P.replaceTitle, text: P.replaceText, ok: P.replace, cancel: P.cancel }))) return;
      commit(() => setSide(work, p.id));
    } else if (choice === 'delete') {
      if (!(await confirmDialog({ ...P.confirmRemove, danger: true }))) return;
      await deletePhoto(p.id).catch(() => {});
      commit(() => removePhoto(work, p.id));
      if (newPhotoIds.includes(p.id)) newPhotoIds.splice(newPhotoIds.indexOf(p.id), 1);
    } else return;
    renderPhotos();
    refreshStatus();
  }

  async function addPhoto() {
    const source = await pickSource();
    if (!source) return;
    const file = await pickImage(source === 'camera');
    if (!file) return;
    toast(P.processing);
    let rec;
    try { rec = await processFile(file); } catch { toast(P.failed); return; }
    let role = (await confirmDialog({ title: P.isSide, ok: P.yes, cancel: P.no })) ? 'side' : 'other';
    if (role === 'side' && hasSide(work)
      && !(await confirmDialog({ title: P.replaceTitle, text: P.replaceText, ok: P.replace, cancel: P.no }))) role = 'other';
    const pid = crypto.randomUUID();
    try { await putPhoto(pid, rec); } catch { toast(P.saveFailed); return; }
    commit(() => {
      work.photos.push({ id: pid, role, createdAt: rec.createdAt });
      if (role === 'side') setSide(work, pid); // alte Seitenansicht wird zu "other", nichts wird gelöscht
    });
    if (isNew) newPhotoIds.push(pid);
    requestPersist();
    renderPhotos();
    refreshStatus();
  }

  function renderPhotos() {
    bag.freeAll();
    strip.replaceChildren();
    for (const p of orderedPhotos(work)) {
      const img = h('img', { alt: '' });
      strip.append(h('button', { class: 'pthumb', type: 'button', onclick: () => viewPhoto(p) },
        img, p.role === 'side' && h('span', { class: 'badge' }, K.sideBadge)));
      getPhoto(p.id).then((rec) => { if (rec && !gone) img.src = bag.make(rec.thumb); }).catch(() => {});
    }
    strip.append(h('button', { class: 'pthumb pthumb-add', type: 'button', onclick: addPhoto }, icon('plus'), h('span', {}, K.addPhoto)));
  }

  // --- Felder ---
  const touch = (key, value) => { raw[key] = value; dirty = true; showErrors({}); refreshStatus(); };
  const text = (key, label, o = {}) => field(label, textInput({ id: `c-${key}`, value: raw[key], inputmode: o.inputmode, oninput: (v) => touch(key, v) }), errorEl(key));

  // Auswahl aus dem Material. Ist das Material der Kerze gelöscht, bleibt der gespeicherte Wert wählbar ('' = unverändert lassen).
  const materialOptions = (snapshot, idKey, list, noneLabel) => {
    const present = snapshot && list.some((x) => x.id === snapshot[idKey]);
    const first = present ? null : ['', snapshot ? `${snapshot.name}${K.keepSuffix}` : noneLabel];
    return [first, ...list.map((x) => [x.id, x.name])].filter(Boolean);
  };
  const glassSelect = () => selectInput({
    id: 'c-glass', value: raw.glassId, options: materialOptions(work.glass, 'glassId', state.glasses, K.noGlass),
    onchange: (v) => touch('glassId', v),
  });
  const waxSelect = () => selectInput({
    id: 'c-wax', value: raw.waxId, options: materialOptions(work.wax, 'waxId', state.waxes, K.noWax),
    onchange: (v) => touch('waxId', v),
  });

  const scentBox = h('div', { class: 'scent-block' });
  function renderScents() {
    scentBox.replaceChildren();
    raw.scents.forEach((row, i) => {
      const deleted = row.src && !state.scents.some((s) => s.id === row.src.scentId);
      const options = [['', T.cost.none], ...(deleted ? [[KEEP, `${row.src.name}${K.keepSuffix}`]] : []), ...state.scents.map((s) => [s.id, s.name])];
      scentBox.append(...[
        h('div', { class: 'scent-row' },
          field(i === 0 ? K.scents : T.cost.scentN(i + 1), selectInput({
            id: `c-scent-${i}`, options, value: row.scentId,
            onchange: (v) => { row.scentId = v; touch('scents', raw.scents); renderScents(); },
          })),
          h('button', {
            class: 'icon-btn', type: 'button', 'aria-label': T.cost.removeScent,
            onclick: () => { raw.scents.splice(i, 1); touch('scents', raw.scents); renderScents(); },
          }, icon('x'))),
        row.scentId && field(K.share, textInput({ id: `c-share-${i}`, value: row.share, oninput: (v) => { row.share = v; touch('scents', raw.scents); } }), errorEl(`scent-${i}`)),
      ].filter(Boolean));
    });
    if (raw.scents.length < MAX_SCENTS) {
      scentBox.append(h('button', {
        class: 'link', type: 'button',
        onclick: () => { raw.scents.push({ ...blankRow(), src: null, scentId: '', share: '' }); touch('scents', raw.scents); renderScents(); },
      }, T.cost.addScent));
    }
    scentBox.append(errorEl('scents'));
  }

  const form = h('form', { class: 'form', novalidate: true });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const r = applyCandleForm(work, raw, state);
    showErrors(r.errors);
    if (!r.ok) { form.querySelector('.field-error:not(:empty)')?.scrollIntoView({ block: 'center' }); return; }
    commit(() => (stored ? Object.assign(stored, r.next) : state.candles.push(r.next)));
    saved = true;
    dirty = false;
    toast(T.material.saved);
    location.hash = '#/galerie';
  });

  renderScents();
  form.append(
    text('name', K.name.replace(' (optional)', ''), { inputmode: 'text' }),
    field(K.glass, glassSelect()),
    field(K.wax, waxSelect()),
    scentBox,
    text('scentPct', K.scentPct),
    text('totalWeight', K.weight),
    text('costTotal', K.cost),
    h('p', { class: 'hint' }, isNew
      ? K.manualHint
      : `${K.created}: ${new Date(work.createdAt).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })}`),
    h('button', { class: 'btn btn-primary', type: 'submit' }, T.material.save));

  if (stored) {
    form.append(h('button', {
      class: 'link-danger', type: 'button',
      onclick: async () => {
        if (!(await confirmDialog({ ...K.confirmRemove(stored.name || T.gallery.unnamed), danger: true }))) return;
        await Promise.all(stored.photos.map((p) => deletePhoto(p.id).catch(() => {})));
        commit(() => state.candles.splice(state.candles.indexOf(stored), 1));
        dirty = false;
        toast(K.removed);
        location.hash = '#/galerie';
      },
    }, K.remove));
  }

  renderPhotos();
  refreshStatus();
  const screen = h('section', { class: 'screen' },
    h('h1', { class: 'screen-title' }, isNew ? K.newTitle : (work.name || T.gallery.unnamed)),
    h('div', { class: 'stack' }, status, h('h2', { class: 'field-label' }, K.photos), strip),
    form);

  screen.guard = () => !saved && (dirty || (isNew && newPhotoIds.length > 0));
  screen.destroy = () => {
    gone = true;
    bag.freeAll();
    // Verlassen ohne Speichern: Fotos einer neuen Kerze wieder entfernen
    if (isNew && !saved) newPhotoIds.forEach((pid) => deletePhoto(pid).catch(() => {}));
  };
  return screen;
}
