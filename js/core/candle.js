// Vollständigkeit für den Export (Spec 5.5). Der Snapshot selbst wird beim Speichern in E4 gebaut.
const pos = (v) => typeof v === 'number' && v > 0;

export function missingForExport(c) {
  const out = [];
  if (!(c.photos || []).some((p) => p.role === 'side')) out.push('Seitenansicht fehlt');
  if (!String(c.name ?? '').trim()) out.push('Name fehlt');
  const g = c.glass;
  if (!g || !pos(g.heightMm) || !pos(g.widthMm)) out.push('Glas fehlt');
  if (!(c.scents || []).some((s) => String(s.name ?? '').trim())) out.push('Duft fehlt');
  return out;
}

export const isExportable = (c) => missingForExport(c).length === 0;

// Abgleich zwischen Foto-Verweisen im Zustand und den Schlüsseln im Foto-Speicher.
// missing: Verweise ohne Foto, orphans: Fotos ohne Verweis.
export function photoDiff(state, keys) {
  const have = new Set(keys), refs = new Set(), missing = [];
  for (const c of state.candles) {
    for (const p of c.photos || []) {
      refs.add(p.id);
      if (!have.has(p.id)) missing.push(p.id);
    }
  }
  return { missing, orphans: keys.filter((k) => !refs.has(k)) };
}

// Verweise auf nicht mehr vorhandene Fotos aus allen Kerzen entfernen
export function dropPhotoRefs(state, ids) {
  const gone = new Set(ids);
  for (const c of state.candles) if (Array.isArray(c.photos)) c.photos = c.photos.filter((p) => !gone.has(p.id));
}
