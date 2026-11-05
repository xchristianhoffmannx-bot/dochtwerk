import { startRouter } from './router.js';
import { h } from './ui/components.js';
import { T } from './texts.js';
import { loadStore, onSaveError, requestPersist } from './store.js';
import start from './ui/screens/start.js';
import stub from './ui/screens/stub.js';
import materialList from './ui/screens/material-list.js';
import materialDetail from './ui/screens/material-detail.js';

const ART = '(glaeser|waechse|duefte|sonstiges)';
const routes = [
  [/^\/$/, start],
  [new RegExp(`^/material/${ART}$`), materialList],
  [new RegExp(`^/material/${ART}/([^/]+)$`), materialDetail],
  [/^\/kosten(?:\/ergebnis)?$/, () => stub('kosten')],
  [/^\/rechner$/, () => stub('rechner')],
  [/^\/galerie(?:\/.+)?$/, () => stub('galerie')],
  [/^\/export$/, () => stub('export')],
  [/^\/daten$/, () => stub('daten')],
];

// Dauerhafter Hinweis, wenn Speichern nicht klappt (Quota, privater Modus)
onSaveError(() => {
  const banner = document.getElementById('banner');
  banner.replaceChildren(T.saveFailed + ' ', h('a', { href: '#/daten' }, T.saveFailedLink));
  banner.hidden = false;
});

await loadStore();
requestPersist();
startRouter(routes, document.getElementById('app'));

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
