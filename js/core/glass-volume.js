// Innenvolumen-Schätzung aus Außenmaßen (mm) und Wandstärke. Nur Anzeige, nie in der Kostenrechnung.
// Ergebnis: { ml, rough } oder null, wenn keine Schätzung möglich ist.
const pos = (v) => typeof v === 'number' && Number.isFinite(v) && v > 0;

export function estimateVolume(g) {
  const w = pos(g.wallMm) ? g.wallMm : 3;
  if (!pos(g.heightMm) || !pos(g.widthMm)) return null;
  const hi = g.heightMm - w;
  if (hi <= 0) return null;
  const inner = (d) => (d - 2 * w) / 2; // Außenmaß -> Innenradius
  let mm3, rough = false;

  if (g.shape === 'round') {
    const r = inner(g.widthMm);
    if (r <= 0) return null;
    mm3 = Math.PI * r * r * hi;
  } else if (g.shape === 'conical') {
    rough = !pos(g.diameterTopMm) || !pos(g.diameterBottomMm);
    const r1 = inner(pos(g.diameterTopMm) ? g.diameterTopMm : g.widthMm);
    const r2 = inner(pos(g.diameterBottomMm) ? g.diameterBottomMm : g.widthMm);
    if (r1 <= 0 || r2 <= 0) return null;
    mm3 = (Math.PI * hi / 3) * (r1 * r1 + r1 * r2 + r2 * r2);
  } else if (g.shape === 'rect') {
    if (!pos(g.depthMm)) return null;
    const a = g.widthMm - 2 * w, b = g.depthMm - 2 * w;
    if (a <= 0 || b <= 0) return null;
    mm3 = a * b * hi;
  } else {
    return null;
  }
  return { ml: mm3 / 1000, rough };
}

export const fillVolume = (ml, fillPct) => (ml * fillPct) / 100;
