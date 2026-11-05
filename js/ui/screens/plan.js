import { h, field, fieldRow, selectInput, textInput } from '../components.js';
import { T } from '../../texts.js';
import { getState, commit } from '../../store.js';
import { formatNumber, formatPct, parseDecimal } from '../../core/units.js';
import { calcPlan } from '../../core/calc-plan.js';
import { estimateVolume, fillVolume } from '../../core/glass-volume.js';
import { getDraft, emptyPlanDraft, planInput } from '../../calc-forms.js';
import { waxField, scentSection, amountRow, resultRow, warnings, keepScroll } from '../calc-parts.js';
import { toInput } from '../../materials.js';

const P = T.plan;

export default function plan() {
  const state = getState();
  const draft = getDraft(state, 'plan');
  const save = () => commit(() => {});
  const form = h('div', { class: 'form' });
  const out = h('div', { 'aria-live': 'polite' });
  const ctx = { state, draft, save, rebuild: () => keepScroll(() => { build(); update(); }), onInput: () => update() };

  // Zielvolumen aus Glas × Füllgrad vorbelegen; Rückgabe: Schätzung oder null
  function applyGlass() {
    const g = state.glasses.find((x) => x.id === draft.glassId);
    const est = g ? estimateVolume(g) : null;
    if (est) {
      draft.volume = toInput(Math.round(fillVolume(est.ml, state.settings.fillPct) * 10) / 10);
      draft.volumeIsEstimate = true;
    } else draft.volumeIsEstimate = false;
    return est;
  }

  function glassBlock(volumeInput) {
    const g = state.glasses.find((x) => x.id === draft.glassId);
    const est = g ? estimateVolume(g) : null;
    const hint = h('p', { class: 'hint' });
    const showHint = () => {
      const e = state.glasses.find((x) => x.id === draft.glassId);
      const v = e ? estimateVolume(e) : null;
      hint.textContent = !e ? '' : !v ? P.noEstimate : draft.volumeIsEstimate ? P.estimate(formatNumber(v.ml, 0), formatPct(state.settings.fillPct)) : '';
    };
    const select = selectInput({
      id: 'glass', value: draft.glassId,
      options: [['', P.noGlass], ...state.glasses.map((x) => [x.id, x.name])],
      onchange: (v) => {
        draft.glassId = v;
        applyGlass();
        save();
        keepScroll(() => { build(); update(); });
      },
    });
    const fill = field(P.fill, textInput({
      id: 'fill', value: toInput(state.settings.fillPct),
      oninput: (v) => {
        const n = parseDecimal(v);
        if (!Number.isFinite(n) || n <= 0 || n > 100) return;
        commit(() => { state.settings.fillPct = n; });
        if (draft.volumeIsEstimate && applyGlass()) volumeInput.value = draft.volume;
        showHint();
        update();
      },
    }));
    fill.hidden = !g || !est;
    showHint();
    return [field(P.glass, select), fill, hint];
  }

  function update() {
    const { input, errors } = planInput(state, draft);
    const r = errors.length ? { ok: false, errors } : calcPlan(input);
    out.replaceChildren();
    const card = h('div', { class: 'result' }, h('div', { class: 'result-head' }, P.head));
    if (r.ok) {
      card.append(resultRow(T.result.wax, `${formatNumber(r.waxG, 1)} g`));
      const subs = r.scents.length === 1 ? [] : r.scents.map((s) => `${s.name}: ${formatNumber(s.g, 1)} g · ${formatNumber(s.ml, 1)} ml`);
      const oil = r.scents.length === 1
        ? `${formatNumber(r.scentG, 1)} g · ${formatNumber(r.scents[0].ml, 1)} ml`
        : `${formatNumber(r.scentG, 1)} g`;
      if (r.scents.length) {
        card.append(resultRow(T.result.scent, oil, [...subs, input.mode === 'ml' && P.derived(formatPct(r.scentPct))].filter(Boolean)));
      }
    } else {
      card.append(resultRow(T.result.wax, P.dash), resultRow(T.result.scent, P.dash));
    }
    out.append(card, ...(r.ok ? warnings(r.warnings) : r.errors.map((e) => h('p', { class: 'hint' }, e))));
    const w = state.waxes.find((x) => x.id === draft.waxId);
    if (w) {
      const dens = (x) => `${x.toFixed(2).replace('.', ',')} g/ml`; // immer zwei Stellen: 0,90
      const parts = [`${T.plan.wax} ${dens(w.densityGml)}`];
      input.scents.forEach((s) => parts.push(`${s.name} ${dens(s.densityGml)}`));
      out.append(h('p', { class: 'hint', 'aria-label': P.densities }, parts.join(' · ')));
    }
  }

  function build() {
    const volume = textInput({
      id: 'volume', value: draft.volume,
      oninput: (v) => { draft.volume = v; draft.volumeIsEstimate = false; save(); update(); },
    });
    form.replaceChildren(
      waxField(ctx, P.wax),
      scentSection(ctx),
      ...glassBlock(volume),
      field(P.volume, volume),
      amountRow(ctx),
      out,
      h('button', {
        class: 'link', type: 'button',
        onclick: () => {
          Object.keys(draft).forEach((k) => delete draft[k]);
          Object.assign(draft, emptyPlanDraft());
          save();
          build();
          update();
        },
      }, T.cost.reset));
  }

  build();
  update();
  return h('section', { class: 'screen' },
    h('h1', { class: 'screen-title' }, P.title),
    h('p', { class: 'subtitle' }, P.sub),
    form);
}
