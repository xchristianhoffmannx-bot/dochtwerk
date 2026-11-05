// Wachs & Duftrechner (Spec 5.3). Zielvolumen = Wachs + Duft, Volumina addieren sich.
import { resolveShares } from './calc-cost.js';
import { formatPct } from './units.js';

const num = (v) => typeof v === 'number' && Number.isFinite(v);

export function calcPlan({ wax, mode = 'percent', pct, scents = [], volumeMl }) {
  const errors = [];
  if (!wax) errors.push('Wähle ein Wachs.');
  else if (!num(wax.densityGml) || wax.densityGml <= 0) errors.push(`Dichte fehlt: ${wax.name}`);
  if (!num(volumeMl) || volumeMl <= 0) errors.push('Gib das Zielvolumen ein.');
  for (const s of scents) {
    if (!num(s.densityGml) || s.densityGml <= 0) errors.push(`Dichte fehlt: ${s.name}`);
    if (mode === 'ml' && !num(s.ml)) errors.push(`Gib die Menge für ${s.name} ein.`);
  }
  if (mode !== 'ml' && scents.length && !num(pct)) errors.push('Gib die Duftölmenge ein.');
  if (errors.length) return { ok: false, errors };

  let waxG, scentG, p, rows;
  if (mode === 'ml') {
    const oilMl = scents.reduce((a, s) => a + s.ml, 0);
    if (oilMl >= volumeMl) return { ok: false, errors: ['Die Duftmenge ist größer als das Zielvolumen.'] };
    waxG = (volumeMl - oilMl) * wax.densityGml;
    rows = scents.map((s) => ({ ml: s.ml, g: s.ml * s.densityGml }));
    scentG = rows.reduce((a, r) => a + r.g, 0);
    p = (scentG / waxG) * 100;
  } else {
    p = scents.length ? pct : 0;
    const { shares } = resolveShares(scents);
    const k = scents.reduce((a, s, i) => a + shares[i] / 100 / s.densityGml, 0); // Ölvolumen je g Öl
    waxG = volumeMl / (1 / wax.densityGml + (p / 100) * k);
    scentG = (p / 100) * waxG;
    rows = scents.map((s, i) => {
      const g = (scentG * shares[i]) / 100;
      return { g, ml: g / s.densityGml };
    });
  }

  const warnings = [];
  if (num(wax.fragranceMaxPct) && p > wax.fragranceMaxPct + 1e-9)
    warnings.push(`Duftöl ${formatPct(p)} % liegt über dem Maximum von ${formatPct(wax.fragranceMaxPct)} % für ${wax.name} (Rußgefahr, verstopfter Docht).`);

  return { ok: true, waxG, scentG, scentPct: p, scents: scents.map((s, i) => ({ name: s.name, ...rows[i] })), warnings };
}
