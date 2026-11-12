// Hash-Router. Die Zurück-Schaltfläche führt zum logischen Elternscreen, nicht per history.back().
import { h, confirmDialog } from './ui/components.js';
import { icon } from './ui/icons.js';
import { T } from './texts.js';

export function parentOf(path) {
  const m = path.match(/^\/material\/([^/]+)\/.+/);
  if (m) return `/material/${m[1]}`;
  if (path === '/kosten/ergebnis') return '/kosten';
  if (/^\/galerie\/.+/.test(path)) return '/galerie';
  return '/';
}

export const currentPath = () => location.hash.slice(1) || '/';

// routes: [[RegExp, (…Treffergruppen) => Element]]
// Ein Screen darf element.guard = () => boolean setzen (true = ungespeicherte Änderungen)
// und element.destroy = () => void (wird beim Verlassen aufgerufen).
export function startRouter(routes, root) {
  let current = null;
  let lastHash = location.hash;

  const render = () => {
    const path = currentPath();
    for (const [re, screen] of routes) {
      const m = path.match(re);
      if (!m) continue;
      current?.destroy?.(); // Screen räumt auf (Object-URLs, Tastatur-Handler)
      root.replaceChildren();
      document.body.classList.toggle('is-sub', path !== '/'); // Unterseiten: kompakter Markenkopf
      if (path !== '/') {
        root.append(h('a', { class: 'back', href: `#${parentOf(path)}` }, icon('arrow-left'), T.back));
      }
      current = screen(...m.slice(1));
      root.append(current);
      lastHash = location.hash;
      window.scrollTo(0, 0);
      return;
    }
    location.replace('#/'); // unbekannte Adresse -> Start
  };

  addEventListener('hashchange', async () => {
    if (current?.guard?.()) {
      const target = location.hash;
      history.replaceState(null, '', lastHash || '#/'); // alte Adresse wiederherstellen, löst kein hashchange aus
      const { title, text, ok, cancel } = T.material.discard;
      if (!(await confirmDialog({ title, text, ok, cancel }))) return;
      current.guard = null;
      location.hash = target;
      return;
    }
    render();
  });
  render();
}
