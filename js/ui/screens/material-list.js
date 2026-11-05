import { h } from '../components.js';
import { icon } from '../icons.js';
import { T } from '../../texts.js';
import { getState } from '../../store.js';
import { COLLECTION, subline } from '../../materials.js';

export default function materialList(art) {
  const M = T.material;
  const items = getState()[COLLECTION[art]];

  const tabs = h('nav', { class: 'chips', 'aria-label': M.tabsLabel },
    Object.entries(M.arts).map(([a, t]) =>
      h('a', { class: 'chip', href: `#/material/${a}`, 'aria-current': a === art ? 'page' : null }, t.tab)));

  const card = (i) => {
    const s = subline(art, i);
    return h('a', { class: 'card', href: `#/material/${art}/${i.id}` },
      h('div', { class: 'card-main' },
        h('div', { class: 'card-title' }, i.name),
        h('div', { class: 'card-sub' }, s.parts.join(' · '),
          s.priceMissing && [s.parts.length ? ' · ' : '', h('span', { class: 'warn-text' }, M.priceMissing)])),
      icon('chevron-right', 'chev'));
  };

  const add = h('a', { class: 'btn btn-primary', href: `#/material/${art}/neu` }, icon('plus'), M.arts[art].add);

  return h('section', { class: 'screen' },
    h('h1', { class: 'screen-title' }, M.title),
    h('p', { class: 'subtitle' }, M.sub),
    tabs,
    items.length
      ? h('div', { class: 'stack' }, items.map(card))
      : h('p', { class: 'empty' }, M.arts[art].empty),
    add);
}
