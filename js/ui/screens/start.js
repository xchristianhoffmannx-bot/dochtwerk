import { h } from '../components.js';
import { icon } from '../icons.js';
import { T } from '../../texts.js';

// Dekorative Kerze (statisches SVG, keine Nutzerdaten)
const CANDLE = `<svg viewBox="0 0 80 100" aria-hidden="true">
  <defs><linearGradient id="cg" x1="0" x2="1">
    <stop offset="0" stop-color="#f1dcb8"/><stop offset=".5" stop-color="#fcf3e0"/><stop offset="1" stop-color="#eed5aa"/>
  </linearGradient></defs>
  <line x1="40" y1="5" x2="41" y2="17" stroke="#4a3a3a" stroke-width="3" stroke-linecap="round"/>
  <rect x="14" y="30" width="52" height="62" rx="12" fill="url(#cg)" stroke="#ead3a6"/>
  <path d="M16 36V28Q16 14 40 14Q64 14 64 28V36Q40 30 16 36Z" fill="#fffaf0"/>
  <rect x="26" y="52" width="28" height="17" fill="#fffaf0"/>
  <text x="40" y="64" text-anchor="middle" font-family="Georgia,serif" font-size="8" fill="#5a4046">Vanille</text>
</svg>`;

const tile = (href, ic, t) =>
  h('a', { class: 'tile', href }, icon(ic), h('h2', { class: 'tile-title' }, t.title), h('p', { class: 'tile-desc' }, t.desc));

const row = (href, ic, t) =>
  h('a', { class: 'list-row', href },
    icon(ic),
    h('div', {}, h('div', { class: 'list-row-title' }, t.title), h('div', { class: 'list-row-sub' }, t.desc)),
    icon('chevron-right', 'chev'));

export default function start() {
  const S = T.start;
  const candle = h('span', { class: 'candle' });
  candle.innerHTML = CANDLE;

  const gallery = h('a', { class: 'tile tile-wide', href: '#/galerie' },
    h('div', {}, icon('images'), h('h2', { class: 'tile-title' }, S.gallery.title), h('p', { class: 'tile-desc' }, S.gallery.desc)),
    candle);

  return h('section', { class: 'screen' },
    h('h1', { class: 'screen-title', style: 'margin-top:28px' }, S.title),
    h('a', { class: 'tile tile-hero', href: '#/kosten' },
      h('div', {}, h('h2', { class: 'tile-title' }, S.cost.title), h('p', { class: 'tile-desc' }, S.cost.desc)),
      icon('calculator')),
    h('div', { class: 'tile-grid' }, tile('#/material/glaeser', 'box', S.material), tile('#/rechner', 'droplets', S.plan)),
    gallery,
    h('div', { class: 'list' }, row('#/export', 'folder-down', S.export), row('#/daten', 'check', S.data)));
}
