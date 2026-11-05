// Icon aus icons/sprite.svg. Relative URL, damit die App unter jedem Unterpfad läuft.
const NS = 'http://www.w3.org/2000/svg';

export function icon(name, cls = '') {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', `icon ${cls}`.trim());
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS(NS, 'use');
  use.setAttribute('href', `icons/sprite.svg#${name}`);
  svg.append(use);
  return svg;
}
