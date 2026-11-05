import { h, field, switchInput, textInput } from '../components.js';
import { T } from '../../texts.js';
import { getState, commit } from '../../store.js';
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
    resultRow(R.wax, formatEuro(r.costs.wax), [grams(r.waxG)]),
  ];
  if (r.scents.length) {
    const subs = r.scents.length === 1
      ? [`${grams(r.scents[0].g)} · ${formatNumber(r.scents[0].ml, 1)} ml`]
      : r.scents.map((s) => `${s.name}: ${grams(s.g)} · ${formatNumber(s.ml, 1)} ml`);
    rows.push(resultRow(R.scent, formatEuro(r.costs.scent), subs));
  }
  rows.push(resultRow(R.glass, formatEuro(r.costs.glass)));
  if (input.extras.length) rows.push(resultRow(R.extras, formatEuro(r.costs.extras)));

  const mlGiven = input.mode === 'ml' ? formatNumber(input.scents.reduce((a, s) => a + s.ml, 0), 1) : null;

  const card = h('div', { class: 'result' },
    h('div', { class: 'result-head' }, R.head, r.incomplete && ` · ${R.incomplete}`),
    h('div', { class: 'result-sum' }, formatEuro(r.costs.total)),
    ...rows);

  const metrics = h('div', { class: 'metrics' },
    h('div', {}, h('div', { class: 'metric-label' }, R.weight), h('div', { class: 'metric-value' }, R.weightValue(formatNumber(input.totalWeightG, 1)))),
    h('div', {}, h('div', { class: 'metric-label' }, R.share), h('div', { class: 'metric-value' }, R.shareValue(formatPct(r.scentPct), r.scents.length ? mlGiven : null))));

  // Verkaufspreis: Zustand in settings, nur dieser Block wird aktualisiert
  const priceBox = h('div', { class: 'price-box', 'aria-live': 'polite' });
  const markupBody = h('div', {});
  const refresh = () => {
    const s = state.settings;
    markupBody.hidden = !s.markupOn;
    const pct = parseDecimal(String(s.markupPct));
    priceBox.replaceChildren(
      Number.isFinite(pct) && s.markupOn
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

  return h('section', { class: 'screen' },
    h('h1', { class: 'screen-title' }, R.title),
    h('p', { class: 'subtitle' }, `${scentNames} im ${input.glass.name}.`),
    r.warnings.length > 0 && h('div', { class: 'stack' }, warnings(r.warnings)),
    card,
    metrics,
    h('div', { class: 'markup' }, toggle, markupBody));
}
