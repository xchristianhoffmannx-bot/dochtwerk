import { startRouter } from './router.js';
import { h } from './ui/components.js';
import { T } from './texts.js';
import { loadStore, onSaveError, requestPersist } from './store.js';
import start from './ui/screens/start.js';
import exportScreen from './ui/screens/export.js';
import data from './ui/screens/data.js';
import materialList from './ui/screens/material-list.js';
import materialDetail from './ui/screens/material-detail.js';
import cost from './ui/screens/cost.js';
import costResult from './ui/screens/cost-result.js';
import plan from './ui/screens/plan.js';
import gallery from './ui/screens/gallery.js';
import slideshow from './ui/screens/slideshow.js';
import candleDetail from './ui/screens/candle-detail.js';

const ART = '(glaeser|waechse|duefte|sonstiges)';
const routes = [
  [/^\/$/, start],
  [new RegExp(`^/material/${ART}$`), materialList],
  [new RegExp(`^/material/${ART}/([^/]+)$`), materialDetail],
  [/^\/kosten$/, cost],
  [/^\/kosten\/ergebnis$/, costResult],
  [/^\/rechner$/, plan],
  [/^\/galerie$/, gallery],
  [/^\/galerie\/diashow$/, slideshow], // vor /galerie/<id>
  [/^\/galerie\/([^/]+)$/, candleDetail], // "neu" oder Kerzen-ID
  [/^\/export$/, exportScreen],
  [/^\/daten$/, data],
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
