import { h, confirmDialog, toast } from '../components.js';
import { T } from '../../texts.js';
import { getState, commit } from '../../store.js';
import { takeReturn } from '../../router.js';
import { COLLECTION, FIELDS, formValues, validate, derivedLines } from '../../materials.js';

export default function materialDetail(art, id) {
  const M = T.material, A = M.arts[art], list = getState()[COLLECTION[art]];
  const existing = id === 'neu' ? null : list.find((x) => x.id === id);
  if (id !== 'neu' && !existing) {
    location.replace(`#/material/${art}`);
    return h('div');
  }

  const returnTo = takeReturn(); // kam der Nutzer aus dem Rechner? Dann nach dem Speichern dorthin zurück
  const raw = formValues(art, existing);
  const fields = FIELDS[art];
  const wraps = {}, errEls = {}, inputs = {};
  let dirty = false;

  const derived = h('div', { class: 'derived', 'aria-live': 'polite' });
  const refresh = () => {
    for (const f of fields) if (f.showIf) wraps[f.key].hidden = !f.showIf(raw);
    derived.replaceChildren(...derivedLines(art, validate(art, raw).item).map((t) => h('p', {}, t)));
  };
  const touch = (key, value) => {
    raw[key] = value;
    dirty = true;
    errEls[key].textContent = '';
    inputs[key]?.classList?.remove('invalid');
    refresh();
  };

  const control = (f) => {
    const id = `f-${f.key}`;
    if (f.type === 'select') {
      const el = h('select', { class: 'input', id }, f.options.map(([v, t]) => h('option', { value: v }, t)));
      el.value = raw[f.key];
      el.addEventListener('change', () => touch(f.key, el.value));
      return el;
    }
    if (f.type === 'mode') {
      return h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Preisart' }, f.options.map(([v, t]) => {
        const r = h('input', { type: 'radio', name: f.key, value: v });
        r.checked = raw[f.key] === v;
        r.addEventListener('change', () => touch(f.key, v));
        return h('label', {}, r, h('span', {}, t));
      }));
    }
    const el = h('input', { class: 'input', id, type: 'text', autocomplete: 'off',
      inputmode: f.type === 'num' ? 'decimal' : 'text', enterkeyhint: 'next' });
    el.value = raw[f.key];
    el.addEventListener('input', () => touch(f.key, el.value));
    return el;
  };

  const form = h('form', { class: 'form', novalidate: true });
  for (const f of fields) {
    const c = control(f);
    inputs[f.key] = c;
    errEls[f.key] = h('p', { class: 'field-error', id: `e-${f.key}` });
    wraps[f.key] = h('div', { class: 'field' },
      f.label && h('label', { for: `f-${f.key}` }, f.label + (f.required ? ' *' : '')),
      c, errEls[f.key]);
    form.append(wraps[f.key]);
  }
  form.append(derived);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const r = validate(art, raw);
    for (const f of fields) {
      errEls[f.key].textContent = r.errors[f.key] || '';
      inputs[f.key].classList?.toggle('invalid', Boolean(r.errors[f.key]));
    }
    if (!r.ok) {
      const first = fields.find((f) => r.errors[f.key]);
      inputs[first.key].focus?.();
      return;
    }
    const newId = crypto.randomUUID();
    commit(() => {
      if (existing) Object.assign(existing, r.item); else list.push({ id: newId, ...r.item });
      // neues Glas gleich im Kostenentwurf auswählen
      const d = getState().drafts.cost;
      if (returnTo && art === 'glaeser' && !existing && d) { d.glassId = newId; d.noGlass = false; }
    });
    dirty = false;
    toast(M.saved);
    location.hash = returnTo || `#/material/${art}`;
  });

  form.append(h('button', { class: 'btn btn-primary', type: 'submit' }, M.save));

  if (existing) {
    form.append(h('button', {
      class: 'link-danger', type: 'button',
      onclick: async () => {
        if (!(await confirmDialog({ ...M.confirmRemove(existing.name), danger: true }))) return;
        commit(() => list.splice(list.indexOf(existing), 1));
        dirty = false;
        toast(M.removed);
        location.hash = `#/material/${art}`;
      },
    }, M.remove));
  }

  refresh();
  const screen = h('section', { class: 'screen' },
    h('h1', { class: 'screen-title' }, existing ? A.editTitle : A.newTitle), form);
  screen.guard = () => dirty; // Router fragt vor dem Verlassen (Spec 6.3)
  return screen;
}
