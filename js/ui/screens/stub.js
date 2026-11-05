// Platzhalter für Routen, deren Screen in einer späteren Etappe kommt.
import { h } from '../components.js';
import { T } from '../../texts.js';

export default function stub(key) {
  return h('section', { class: 'screen' },
    h('h1', { class: 'screen-title' }, T.stub.titles[key]),
    h('p', { class: 'subtitle' }, T.stub.soon));
}
