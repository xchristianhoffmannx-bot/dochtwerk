import { h, field, selectInput, textInput } from '../components.js';
import { icon } from '../icons.js';
import { T } from '../../texts.js';
import { getState, commit } from '../../store.js';
import { formatNumber } from '../../core/units.js';
import { calcCost } from '../../core/calc-cost.js';
import { getDraft, emptyCostDraft, costInput } from '../../calc-forms.js';
import { waxSection, scentSection, amountRow, keepScroll } from '../calc-parts.js';

const C = T.cost;

export default function cost() {
  const state = getState();
  const draft = getDraft(state, 'cost');
  const save = () => commit(() => {});
  const form = h('div', { class: 'form' });
  const ctx = { state, draft, save, rebuild: () => keepScroll(build), onInput: () => {} };

  function glassField() {
    const select = selectInput({
      id: 'glass', value: draft.glassId,
      options: [['', C.pick], ...state.glasses.map((g) => [g.id, C.glassOpt(g.name, g.emptyWeightG > 0 ? formatNumber(g.emptyWeightG, 1) : null)])],
      onchange: (v) => { draft.glassId = v; save(); },
    });
    return field(C.glass, select,
      !state.glasses.length && h('p', { class: 'hint' }, h('a', { href: '#/material/glaeser/neu' }, C.createGlass)));
  }

  function extrasBlock() {
    const wrap = h('div', { class: 'field' }, h('div', { class: 'field-label' }, C.extras));
    if (!state.extras.length) {
      wrap.append(h('p', { class: 'hint' }, `${C.extrasEmpty} `, h('a', { href: '#/material/sonstiges' }, C.extrasLink)));
      return wrap;
    }
    for (const x of state.extras) {
      const e = draft.extras[x.id] || (draft.extras[x.id] = { on: false, qty: '1' });
      const qty = textInput({ id: `qty-${x.id}`, value: e.qty, oninput: (v) => { e.qty = v; save(); } });
      qty.disabled = !e.on;
      qty.setAttribute('aria-label', `${C.qty} ${x.name}`);
      const box = h('input', { type: 'checkbox', id: `x-${x.id}`, class: 'check' });
      box.checked = e.on;
      box.addEventListener('change', () => { e.on = box.checked; qty.disabled = !e.on; save(); });
      wrap.append(h('div', { class: 'extra-row' }, h('label', { for: `x-${x.id}` }, box, h('span', {}, x.name)), qty));
    }
    return wrap;
  }

  function calculate(box) {
    const { input, errors } = costInput(state, draft);
    const r = errors.length ? { ok: false, errors } : calcCost(input);
    box.replaceChildren();
    if (!r.ok) {
      r.errors.forEach((msg) => box.append(h('p', { class: 'msg msg-error' }, msg, ' ',
        /Leergewicht/.test(msg) && draft.glassId && h('a', { href: `#/material/glaeser/${draft.glassId}` }, C.editGlass))));
      return;
    }
    commit(() => { state.drafts.lastExtras = input.extras.map((e) => ({ extraId: e.extraId, qty: e.qty })); });
    location.hash = '#/kosten/ergebnis';
  }

  function build() {
    const msgs = h('div', { 'aria-live': 'polite' });
    form.replaceChildren(
      glassField(),
      waxSection(ctx, C.wax),
      scentSection(ctx),
      field(C.weight, textInput({ id: 'weight', value: draft.totalWeight, oninput: (v) => { draft.totalWeight = v; save(); } })),
      amountRow(ctx),
      extrasBlock(),
      msgs,
      h('button', { class: 'btn btn-primary', type: 'button', onclick: () => calculate(msgs) }, icon('calculator'), C.calc),
      h('button', {
        class: 'link', type: 'button',
        // in place zurücksetzen: draft bleibt dasselbe Objekt wie in state.drafts.cost
        onclick: () => {
          Object.keys(draft).forEach((k) => delete draft[k]);
          Object.assign(draft, emptyCostDraft(state));
          save();
          build();
        },
      }, C.reset));
  }

  build();
  return h('section', { class: 'screen' },
    h('h1', { class: 'screen-title' }, C.title),
    h('p', { class: 'subtitle' }, C.sub),
    form);
}
