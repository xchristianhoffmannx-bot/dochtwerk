// Hash-Router. Die Zurück-Schaltfläche führt zum logischen Elternscreen, nicht per history.back().
import { h } from './ui/components.js';
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
export function startRouter(routes, root) {
  const render = () => {
    const path = currentPath();
    for (const [re, screen] of routes) {
      const m = path.match(re);
      if (!m) continue;
      root.replaceChildren();
      if (path !== '/') {
        root.append(h('a', { class: 'back', href: `#${parentOf(path)}` }, icon('arrow-left'), T.back));
      }
      root.append(screen(...m.slice(1)));
      window.scrollTo(0, 0);
      return;
    }
    location.replace('#/'); // unbekannte Adresse -> Start
  };
  addEventListener('hashchange', render);
  render();
}
