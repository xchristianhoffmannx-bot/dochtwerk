import { h, field, switchInput, textInput, toast } from '../components.js';
import { icon } from '../icons.js';
import { T } from '../../texts.js';
import { getState, commit, save as saveNow, putPhoto, requestPersist } from '../../store.js';
import { pickImage, processFile } from '../../photos.js';
import { askName } from '../sheets.js';
import { snapshotCandle } from '../../candles.js';
import { formatEuro, formatNumber, formatPct, parseDecimal } from '../../core/units.js';
import { calcCost, rund05 } from '../../core/calc-cost.js';
import { costInput } from '../../calc-forms.js';
import { resultRow, warnings } from '../calc-parts.js';
import { toInput } from '../../materials.js';

const R = T.result;

export default function costResult() {
  const state = getState();
  const d = state.drafts.cost;
  const calc = d?.scents ? costInput(state, d) : null;
  const r = calc && !calc.errors.length ? calcCost(calc.input) : { ok: false };
  if (!r.ok) { // direkt aufgerufen ohne gültige Eingabe -> zurück zur Eingabe
    location.replace('#/kosten');
    return h('div');
  }
  const { input } = calc;

  const scentNames = input.scents.map((s) => s.name).join(', ') || R.noScent;
  const grams = (g) => `${formatNumber(g, 1)} g`;

  const rows = [
    resultRow(R.wax, formatEuro(r.costs.wax), r.waxes.length === 1 ? [grams(r.waxG)]
      : r.waxes.map((w) => `${w.name} ${formatPct(w.sharePct)} %: ${grams(w.g)} · ${formatEuro(w.cost)}${w.scented || !r.scents.length ? '' : ' · ohne Duftöl'}`)),
  ];
  if (r.scents.length) {
    const subs = input.perWax
      ? r.scents.map((s) => `${s.name} im ${s.waxName} (${formatPct(s.pct)} %): ${grams(s.g)} · ${formatNumber(s.ml, 1)} ml`)
      : r.scents.length === 1
      ? [`${grams(r.scents[0].g)} · ${formatNumber(r.scents[0].ml, 1)} ml`]
      : r.scents.map((s) => `${s.name}: ${grams(s.g)} · ${formatNumber(s.ml, 1)} ml`);
    rows.push(resultRow(R.scent, formatEuro(r.costs.scent), subs));
  }
  if (!input.noGlass) rows.push(resultRow(R.glass, formatEuro(r.costs.glass)));
  if (input.extras.length) rows.push(resultRow(R.extras, formatEuro(r.costs.extras)));

  const mlGiven = input.mode === 'ml' ? formatNumber(input.scents.reduce((a, s) => a + s.ml, 0), 1) : null;

  const card = h('div', { class: 'result' },
    h('div', { class: 'result-head' }, r.incomplete ? R.headKnown : R.head),
    // ohne jeden Preis nicht "0,00 €" groß zeigen
    h('div', { class: r.incomplete && r.costs.total === 0 ? 'result-sum result-sum-missing' : 'result-sum' },
      r.incomplete && r.costs.total === 0 ? R.priceMissing : formatEuro(r.costs.total)),
    ...rows);

  const metrics = h('div', { class: 'metrics' },
    h('div', {}, h('div', { class: 'metric-label' }, R.weight), h('div', { class: 'metric-value' }, input.noGlass ? R.contentValue(formatNumber(r.innerG, 1)) : R.weightValue(formatNumber(input.totalWeightG, 1)))),
    h('div', {}, h('div', { class: 'metric-label' }, R.share), h('div', { class: 'metric-value' }, R.shareValue(formatPct(r.scentPct), r.scents.length ? mlGiven : null))));

  // Verkaufspreis: Zustand in settings, nur dieser Block wird aktualisiert
  const priceBox = h('div', { class: 'price-box', 'aria-live': 'polite' });
  const markupBody = h('div', {});
  const refresh = () => {
    const s = state.settings;
    markupBody.hidden = !s.markupOn;
    const pct = parseDecimal(String(s.markupPct));
    priceBox.replaceChildren(
      r.incomplete && s.markupOn ? h('p', { class: 'msg msg-warn' }, R.noMarkup)
      : Number.isFinite(pct) && s.markupOn
        ? h('div', {}, h('div', { class: 'metric-label' }, R.price),
          h('div', { class: 'price-value' }, formatEuro(rund05(r.costs.total * (1 + pct / 100)))),
          h('div', { class: 'metric-label' }, R.priceHint))
        : null);
  };
  markupBody.append(
    field(R.markupPct, textInput({
      id: 'markup-pct', value: toInput(state.settings.markupPct),
      oninput: (v) => {
        const n = parseDecimal(v);
        if (Number.isFinite(n)) { commit(() => { state.settings.markupPct = n; }); refresh(); } else priceBox.replaceChildren();
      },
    })),
    priceBox);

  const toggle = switchInput({
    id: 'markup-on', label: R.markup, checked: state.settings.markupOn,
    onchange: (on) => { commit(() => { state.settings.markupOn = on; }); refresh(); },
  });
  refresh();

  // Speichern-Ablauf (Spec 6.5): Foto -> Name/Rolle -> Kerze mit Snapshot -> Galerie
  let saving = false;
  async function save(withPhoto) {
    if (saving) return;
    saving = true;
    try { await doSave(withPhoto); } finally { saving = false; }
  }
  async function doSave(withPhoto) {
    let rec = null;
    if (withPhoto) {
      const file = await pickImage(true);
      if (!file) return;
      toast(T.photo.processing);
      try { rec = await processFile(file); } catch { toast(T.photo.failed); return; }
    }
    const ask = await askName({ withPhoto });
    if (!ask) return;
    const candle = snapshotCandle({ state, draft: d, input, result: r, name: ask.name });
    if (rec) {
      const pid = crypto.randomUUID();
      try { await putPhoto(pid, rec); } catch { toast(T.photo.saveFailed); return; }
      candle.photos.push({ id: pid, role: ask.side ? 'side' : 'other', createdAt: rec.createdAt });
      requestPersist();
    }
    // erst melden und weiterspringen, wenn die Kerze wirklich geschrieben ist
    commit(() => state.candles.push(candle));
    try { await saveNow(); } catch {
      commit(() => state.candles.splice(state.candles.indexOf(candle), 1));
      toast(T.candle.saveFailed);
      return;
    }
    toast(T.candle.saved);
    location.hash = `#/galerie/${candle.id}`;
  }

  return h('section', { class: 'screen' },
    h('h1', { class: 'screen-title' }, R.title),
    h('p', { class: 'subtitle' }, input.noGlass ? `${scentNames}, ohne Glas.` : `${scentNames} im ${input.glass.name}.`),
    r.warnings.length > 0 && h('div', { class: 'stack' }, warnings(r.warnings)),
    card,
    metrics,
    h('div', { class: 'markup' }, toggle, markupBody),
    h('div', { class: 'save-actions' },
      h('button', { class: 'btn btn-primary', type: 'button', onclick: () => save(true) }, icon('camera'), R.savePhoto),
      h('button', { class: 'link', type: 'button', onclick: () => save(false) }, R.saveNoPhoto)));
}
