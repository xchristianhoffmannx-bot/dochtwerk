// Kleiner DOM-Helfer. Strings werden immer als Text eingefügt, nie als HTML (Spec 9).
export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  el.append(...kids.flat().filter((c) => c != null && c !== false));
  return el;
}

// Bestätigungsdialog (<dialog>). Esc oder „Abbrechen“ -> false.
export function confirmDialog({ title, text, ok = 'OK', cancel = 'Abbrechen', danger = false }) {
  return new Promise((resolve) => {
    let settled = false;
    // Ergebnis direkt bei Klick, nicht über das asynchrone close-Event
    const done = (value) => {
      if (settled) return;
      settled = true;
      d.close();
      d.remove();
      resolve(value);
    };
    const d = h('dialog', { class: 'dlg' },
      h('h2', { class: 'dlg-title' }, title),
      text && h('p', { class: 'dlg-text' }, text),
      h('div', { class: 'dlg-actions' },
        h('button', { class: 'btn btn-secondary', type: 'button', onclick: () => done(false) }, cancel),
        h('button', { class: `btn ${danger ? 'btn-danger' : 'btn-primary'}`, type: 'button', onclick: () => done(true) }, ok)));
    d.addEventListener('cancel', (e) => { e.preventDefault(); done(false); }); // Esc
    document.body.append(d);
    d.showModal();
  });
}

let toastEl = null, toastTimer = 0;
export function toast(text) {
  if (!toastEl) {
    toastEl = h('div', { class: 'toast', role: 'status', 'aria-live': 'polite' });
    document.body.append(toastEl);
  }
  toastEl.textContent = text;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2600);
}
