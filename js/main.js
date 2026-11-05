import { startRouter } from './router.js';
import start from './ui/screens/start.js';
import stub from './ui/screens/stub.js';

const routes = [
  [/^\/$/, start],
  [/^\/material\/(?:glaeser|waechse|duefte|sonstiges)(?:\/.+)?$/, () => stub('material')],
  [/^\/kosten(?:\/ergebnis)?$/, () => stub('kosten')],
  [/^\/rechner$/, () => stub('rechner')],
  [/^\/galerie(?:\/.+)?$/, () => stub('galerie')],
  [/^\/export$/, () => stub('export')],
  [/^\/daten$/, () => stub('daten')],
];

startRouter(routes, document.getElementById('app'));

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
