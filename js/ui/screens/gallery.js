import { h } from '../components.js';
import { icon } from '../icons.js';
import { T } from '../../texts.js';
import { getState, getPhoto } from '../../store.js';
import { UrlBag } from '../../photos.js';
import { galleryOrder, coverPhoto, hasSide, slidesOf } from '../../candles.js';

const G = T.gallery;

export default function gallery() {
  const state = getState();
  const bag = new UrlBag();
  let gone = false;

  const card = (c, i) => {
    const media = h('div', { class: `gthumb tint-${i % 2}` });
    const cover = coverPhoto(c);
    if (cover) {
      getPhoto(cover.id).then((rec) => {
        if (rec && !gone) media.replaceChildren(h('img', { src: bag.make(rec.thumb), alt: '' }));
      }).catch(() => {});
    }
    return h('a', { class: 'gcard', href: `#/galerie/${c.id}` },
      media,
      h('div', { class: 'gbody' },
        h('div', { class: 'gname' }, c.name || G.unnamed),
        h('div', { class: 'gsub' }, hasSide(c) ? G.side : G.noSide)));
  };

  const list = galleryOrder(state.candles);
  const hasPhotos = slidesOf(state.candles).length > 0;

  const screen = h('section', { class: 'screen' },
    h('h1', { class: 'screen-title' }, G.title),
    h('p', { class: 'subtitle' }, G.sub),
    // Aktionen vor dem Raster, damit sie bei großer Sammlung nicht nach unten wandern
    h('div', { class: 'stack gallery-actions' },
      h('a', { class: 'btn btn-primary', href: '#/galerie/neu' }, icon('plus'), G.add),
      hasPhotos
        ? h('a', { class: 'btn btn-secondary', href: '#/galerie/diashow' }, icon('play'), G.slideshow)
        : h('button', { class: 'btn btn-secondary', type: 'button', disabled: true }, icon('play'), G.slideshow)),
    list.length ? h('div', { class: 'gallery-grid' }, list.map(card)) : h('p', { class: 'empty' }, G.empty));

  screen.destroy = () => { gone = true; bag.freeAll(); };
  return screen;
}
