// Vollbild-Diashow: Wischen (Scroll-Snap), Pfeiltasten, kein Autoplay.
// Nur das aktuelle und die beiden Nachbarfotos halten eine Object-URL (Spec 6.9).
import { h } from '../components.js';
import { icon } from '../icons.js';
import { T } from '../../texts.js';
import { getState, getPhoto } from '../../store.js';
import { slidesOf } from '../../candles.js';

const S = T.slideshow;

export default function slideshow() {
  const slides = slidesOf(getState().candles);
  const close = h('a', { class: 'ss-close', href: '#/galerie', 'aria-label': S.close }, icon('x'));
  const root = h('div', { class: 'slideshow', role: 'dialog', 'aria-label': S.label });

  if (!slides.length) {
    root.append(close, h('p', { class: 'ss-empty' }, S.empty));
    return root;
  }

  const imgs = slides.map((s) => h('img', { class: 'ss-img', alt: s.name || '' }));
  const track = h('div', { class: 'ss-track' }, imgs.map((img) => h('div', { class: 'ss-slide' }, img)));
  const caption = h('div', { class: 'ss-caption' });
  const counter = h('div', { class: 'ss-counter' });
  root.append(track, close, caption, counter);

  const urls = new Map(); // Index -> Object-URL
  let current = -1, gone = false;

  async function show(i) {
    current = i;
    caption.textContent = slides[i].name;
    counter.textContent = `${i + 1} / ${slides.length}`;
    const want = new Set([i - 1, i, i + 1].filter((k) => k >= 0 && k < slides.length));
    for (const [k, url] of urls) {
      if (want.has(k)) continue;
      imgs[k].removeAttribute('src');
      URL.revokeObjectURL(url);
      urls.delete(k);
    }
    for (const k of want) {
      if (urls.has(k)) continue;
      urls.set(k, ''); // Platzhalter gegen doppeltes Laden
      try {
        const rec = await getPhoto(slides[k].photoId);
        if (gone || !rec || !urls.has(k)) { urls.delete(k); continue; }
        const url = URL.createObjectURL(rec.blob);
        urls.set(k, url);
        imgs[k].src = url;
      } catch { urls.delete(k); }
    }
  }

  const indexNow = () => Math.round(track.scrollLeft / track.clientWidth);
  let timer = 0;
  track.addEventListener('scroll', () => {
    clearTimeout(timer);
    timer = setTimeout(() => { const i = indexNow(); if (i !== current && i >= 0 && i < slides.length) show(i); }, 80);
  });

  const onKey = (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const i = Math.min(slides.length - 1, Math.max(0, indexNow() + (e.key === 'ArrowRight' ? 1 : -1)));
    track.scrollTo({ left: i * track.clientWidth, behavior: 'smooth' });
  };
  addEventListener('keydown', onKey);

  root.destroy = () => {
    gone = true;
    removeEventListener('keydown', onKey);
    clearTimeout(timer);
    urls.forEach((u) => u && URL.revokeObjectURL(u));
    urls.clear();
  };
  show(0);
  return root;
}
