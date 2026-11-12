// Gemeinsame Teile von Kostenrechner und Wachs & Duftrechner (Spec 6.4 / 6.6).
// ctx = { state, draft, save, rebuild, onInput }
//   rebuild: Formular neu aufbauen (nur bei Auswahlfeldern), onInput: nach Texteingabe (nur Ergebnis aktualisieren)
import { h, field, fieldRow, selectInput, textInput } from './components.js';
import { icon } from './icons.js';
import { T } from '../texts.js';
import { parseDecimal, formatPct } from '../core/units.js';
import { MAX_SCENTS, MAX_WAXES, blankRow } from '../calc-forms.js';
import { toInput } from '../materials.js';

const C = T.cost;

export function waxField(ctx, label) {
  const { state, draft, save, rebuild } = ctx;
  const select = selectInput({
    id: 'wax', value: draft.waxId,
    options: [['', C.pick], ...state.waxes.map((w) => [w.id, w.name])],
    onchange: (v) => {
      draft.waxId = v;
      const w = state.waxes.find((x) => x.id === v);
      // Standard-Duftöl-% vorbelegen, solange der Nutzer nichts eigenes eingetragen hat
      if (w && !draft.pctTouched && w.fragranceStdPct != null) draft.pct = toInput(w.fragranceStdPct);
      save();
      rebuild();
    },
  });
  return field(label, select);
}

// Kostenrechner: bis zu drei Wachse. Das erste bekommt den Rest, die weiteren geben ihren Anteil an.
export function waxSection(ctx, label) {
  const { state, draft, save, rebuild } = ctx;
  const wrap = h('div', { class: 'scent-block' }, waxField(ctx, label));
  const more = draft.moreWaxes;
  const chosen = more.filter((r) => r.waxId);
  let restEl = null;
  const byG = draft.waxUnit === 'g';
  const updateRest = () => {
    if (!restEl) return;
    if (byG) { restEl.textContent = C.waxRestG; return; }
    const others = chosen.reduce((a, r) => {
      const v = parseDecimal(r.share);
      return a + (Number.isFinite(v) && v > 0 ? v : 0);
    }, 0);
    restEl.textContent = C.rest(formatPct(Math.max(0, 100 - others)));
  };
  if (chosen.length) { restEl = h('p', { class: 'rest' }); wrap.append(restEl); }

  more.forEach((row, i) => {
    wrap.append(h('div', { class: 'scent-row' },
      field(C.waxN(i + 2), selectInput({
        id: `wax-${i + 2}`, value: row.waxId,
        options: [['', C.none], ...state.waxes.map((w) => [w.id, w.name])],
        onchange: (v) => { row.waxId = v; save(); rebuild(); },
      })),
      h('button', {
        class: 'icon-btn', type: 'button', 'aria-label': C.removeWax,
        onclick: () => { more.splice(i, 1); save(); rebuild(); },
      }, icon('x'))));
    if (row.waxId) {
      wrap.append(field(byG ? C.mlGramField : C.share, textInput({
        id: `wax-share-${i + 2}`, value: row.share,
        oninput: (v) => { row.share = v; save(); updateRest(); },
      })));
    }
  });
  updateRest();
  if (more.length) {
    wrap.append(field(C.waxUnit, selectInput({
      id: 'wax-unit', value: byG ? 'g' : 'percent', options: [['percent', C.unitPct.replace(' vom Wachs', '')], ['g', 'g']],
      onchange: (v) => { draft.waxUnit = v; save(); rebuild(); },
    })));
  }
  if (draft.waxId && more.length < MAX_WAXES - 1) {
    wrap.append(h('button', {
      class: 'link', type: 'button',
      onclick: () => { more.push({ waxId: '', share: '' }); save(); rebuild(); },
    }, C.addWax));
  }
  return wrap;
}

// Duft-Zeilen, je nach Modus mit ml-Feld, Anteil-Feld oder "Rest x %"
export function scentSection(ctx) {
  const { state, draft, save, rebuild, onInput } = ctx;
  const wrap = h('div', { class: 'scent-block' });
  const options = [['', C.none], ...state.scents.map((s) => [s.id, s.name])];
  const chosen = draft.scents.filter((r) => r.scentId);
  let restEl = null;

  const updateRest = () => {
    if (!restEl) return;
    const others = chosen.slice(1).reduce((a, r) => {
      const v = parseDecimal(r.share);
      return a + (Number.isFinite(v) && v > 0 ? v : 0);
    }, 0);
    restEl.textContent = C.rest(formatPct(Math.max(0, 100 - others)));
  };

  draft.scents.forEach((row, i) => {
    const select = selectInput({
      id: `scent-${i}`, options, value: row.scentId,
      onchange: (v) => { row.scentId = v; save(); rebuild(); },
    });
    wrap.append(h('div', { class: 'scent-row' },
      field(i === 0 ? C.scent : C.scentN(i + 1), select),
      i > 0 && h('button', {
        class: 'icon-btn', type: 'button', 'aria-label': C.removeScent,
        onclick: () => { draft.scents.splice(i, 1); save(); rebuild(); },
      }, icon('x'))));

    if (!row.scentId) return;
    if (draft.mode === 'ml') {
      wrap.append(field(C.mlField, textInput({ id: `ml-${i}`, value: row.ml, oninput: (v) => { row.ml = v; save(); onInput(); } })));
    } else if (chosen.length >= 2) {
      if (row === chosen[0]) {
        restEl = h('p', { class: 'rest' });
        wrap.append(restEl);
      } else {
        wrap.append(field(C.share, textInput({
          id: `share-${i}`, value: row.share,
          oninput: (v) => { row.share = v; save(); updateRest(); onInput(); },
        })));
      }
    }
  });
  updateRest();

  if (draft.scents.length < MAX_SCENTS) {
    wrap.append(h('button', {
      class: 'link', type: 'button',
      onclick: () => { draft.scents.push(blankRow()); save(); rebuild(); },
    }, C.addScent));
  }
  if (!state.scents.length) {
    wrap.append(h('p', { class: 'hint' }, `${C.noScents} `, h('a', { href: '#/material/duefte/neu' }, C.createScent)));
  }
  return wrap;
}

// "Duftölmenge | Einheit": im ml-Modus entfällt das Gesamtfeld (jeder Duft hat sein ml-Feld)
export function amountRow(ctx) {
  const { draft, save, rebuild, onInput } = ctx;
  const pct = field(C.amount, textInput({
    id: 'pct', value: draft.pct,
    oninput: (v) => { draft.pct = v; draft.pctTouched = true; save(); onInput(); },
  }));
  pct.hidden = draft.mode === 'ml';
  const unit = field(C.unit, selectInput({
    id: 'unit', value: draft.mode,
    options: [['percent', C.unitPct], ['ml', C.unitMl]],
    onchange: (v) => { draft.mode = v; save(); rebuild(); },
  }));
  return fieldRow(pct, unit);
}

// Zeile der Ergebniskarte: Bezeichnung links, Betrag rechts, graue Unterzeilen darunter
export function resultRow(label, amount, subs = []) {
  return h('div', { class: 'result-row' },
    h('div', { class: 'result-line' }, h('span', {}, label), h('span', { class: 'result-amount' }, amount)),
    subs.map((s) => h('div', { class: 'result-sub' }, s)));
}

// Warnungen als Banner
export const warnings = (list) => list.map((w) => h('p', { class: 'msg msg-warn' }, w));

// Scroll-Position beim Neuaufbau halten
export function keepScroll(fn) {
  const y = window.scrollY;
  fn();
  window.scrollTo(0, y);
}
