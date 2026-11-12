// Vollständigkeit für den Export (Spec 5.5). Der Snapshot selbst wird beim Speichern in E4 gebaut.
const pos = (v) => typeof v === 'number' && v > 0;

export function missingForExport(c) {
  const out = [];
  if (!(c.photos || []).some((p) => p.role === 'side')) out.push('Seitenansicht fehlt');
  if (!String(c.name ?? '').trim()) out.push('Name fehlt');
  const g = c.glass;
  if (!c.noGlass && (!g || !pos(g.heightMm) || !pos(g.widthMm))) out.push('Glas fehlt');
  if (!(c.scents || []).some((s) => String(s.name ?? '').trim())) out.push('Duft fehlt');
  return out;
}

export const isExportable = (c) => missingForExport(c).length === 0;
