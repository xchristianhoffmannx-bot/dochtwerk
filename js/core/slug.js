// Ordnernamen für den ZIP-Export.
export function slug(name = '') {
  const s = String(name)
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/, '');
  return s || 'kerze';
}

// ['Vanille','Vanille'] -> ['vanille','vanille-2']
export function uniqueSlugs(names) {
  const used = new Set();
  return names.map((n) => {
    const base = slug(n);
    let s = base, i = 2;
    while (used.has(s)) s = `${base}-${i++}`;
    used.add(s);
    return s;
  });
}
