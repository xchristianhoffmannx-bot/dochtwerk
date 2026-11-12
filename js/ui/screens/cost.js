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
    const none = h('input', { type: 'checkbox', id: 'no-glass', class: 'check' });
    none.checked = !!draft.noGlass;
    none.addEventListener('change', () => { draft.noGlass = none.checked; save(); build(); });
    const toggle = h('div', { class: 'extra-row' }, h('label', { for: 'no-glass' }, none, h('span', {}, C.noGlass)));
    if (draft.noGlass) return toggle;
    const select = selectInput({
      id: 'glass', value: draft.glassId,
      options: [['', C.pick], ...state.glasses.map((g) => [g.id, C.glassOpt(g.name, g.emptyWeightG > 0 ? formatNumber(g.emptyWeightG, 1) : null)])],
      onchange: (v) => { draft.glassId = v; save(); },
    });
    return h('div', {}, field(C.glass, select,
      !state.glasses.length && h('p', { class: 'hint' }, h('a', { href: '#/material/glaeser/neu' }, C.createGlass))), toggle);
  }

  // Duftöl-Bereich nur bei Bedarf: "Ohne Duftöl" blendet Duftauswahl und Menge aus
  function scentToggle() {
    const opt = (noScent, label) => {
      const r = h('input', { type: 'radio', name: 'scent-use', value: noScent ? 'no' : 'yes' });
      r.checked = !!draft.noScent === noScent;
      r.addEventListener('change', () => { draft.noScent = noScent; save(); build(); });
      return h('label', {}, r, h('span', {}, label));
    };
    return h('div', { class: 'field' }, h('div', { class: 'field-label' }, C.scentUse),
      h('div', { class: 'seg', role: 'radiogroup', 'aria-label': C.scentUse }, opt(false, C.withScent), opt(true, C.withoutScent)));
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

  // Fehler dem Feld zuordnen: markieren und zum ersten fehlerhaften Feld springen
  const FIELD_OF = [[/Gesamtgewicht/, 'weight'], [/Glas|Leergewicht/, 'glass'], [/Wachsmenge/, 'wax-amount'],
    [/Wähle ein Wachs/, 'wax'], [/Duftölmenge/, 'pct'], [/Anteil für|Menge in g für/, null]];
  function markInvalid(list) {
    let first = null;
    for (const msg of list) {
      const hit = FIELD_OF.find(([re]) => re.test(msg));
      const id = hit?.[1];
      const el = id && document.getElementById(id);
      if (!el) continue;
      el.classList.add('invalid'); el.setAttribute('aria-invalid', 'true');
      first ||= el;
    }
    if (first) { first.scrollIntoView({ block: 'center' }); first.focus({ preventScroll: true }); }
  }

  function calculate(box) {
    const { input, errors } = costInput(state, draft);
    const r = errors.length ? { ok: false, errors } : calcCost(input);
    box.replaceChildren();
    form.querySelectorAll('[aria-invalid]').forEach((el) => { el.removeAttribute('aria-invalid'); el.classList.remove('invalid'); });
    if (!r.ok) {
      markInvalid(r.errors);
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
      h('h2', { class: 'section-title' }, C.basics),
      glassField(),
      waxSection(ctx, C.wax),
      draft.noGlass
        ? field(C.waxAmount, textInput({ id: 'wax-amount', value: draft.waxAmount, oninput: (v) => { draft.waxAmount = v; save(); } }), h('p', { class: 'hint' }, C.waxAmountHint))
        : field(C.weight, textInput({ id: 'weight', value: draft.totalWeight, oninput: (v) => { draft.totalWeight = v; save(); } })),
      h('h2', { class: 'section-title' }, C.scentAndExtras),
      scentToggle(),
      ...(draft.noScent ? [] : [scentSection(ctx), amountRow(ctx)]),
      extrasBlock(),
      msgs,
      h('button', { class: 'btn btn-primary sticky-action', type: 'button', onclick: () => calculate(msgs) }, icon('calculator'), C.calc),
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
