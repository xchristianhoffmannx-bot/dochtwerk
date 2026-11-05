// Kostenrechner (Spec 5.2). Rein: Eingabe -> Ergebnisobjekt.
import { formatNumber, formatPct } from './units.js';

const num = (v) => typeof v === 'number' && Number.isFinite(v);
export const rund05 = (x) => Math.round(x * 2) / 2;

// Prozent-Modus: Duft 1 bekommt den Rest, die übrigen geben sharePct an (E3).
// Summe der übrigen > 100 -> auf 100 normiert, Duft 1 bekommt 0.
export function resolveShares(scents) {
  if (scents.length <= 1) return { shares: scents.map(() => 100), normalized: false };
  const rest = scents.slice(1).map((s) => (num(s.sharePct) && s.sharePct > 0 ? s.sharePct : 0));
  const sum = rest.reduce((a, b) => a + b, 0);
  if (sum > 100) return { shares: [0, ...rest.map((r) => (r * 100) / sum)], normalized: true };
  return { shares: [100 - sum, ...rest], normalized: false };
}

const part = (x, total, fallback) => (total > 0 ? (x / total) * 100 : fallback);

export function calcCost({ glass, wax, mode = 'percent', totalWeightG, pct, scents = [], extras = [], markup }) {
  const errors = [];
  const hasEmpty = glass && num(glass.emptyWeightG) && glass.emptyWeightG > 0;
  if (!glass) errors.push('Wähle ein Glas.');
  else if (!hasEmpty) errors.push('Für dieses Glas fehlt das Leergewicht.');
  if (!wax) errors.push('Wähle ein Wachs.');
  if (!num(totalWeightG)) errors.push('Gib das Gesamtgewicht mit Glas ein.');
  else if (hasEmpty && totalWeightG <= glass.emptyWeightG)
    errors.push(`Das Gesamtgewicht ist nicht größer als das leere Glas (${formatNumber(glass.emptyWeightG, 1)} g).`);
  for (const s of scents) {
    if (!num(s.densityGml) || s.densityGml <= 0) errors.push(`Dichte fehlt: ${s.name}`);
    if (mode === 'ml' && !num(s.ml)) errors.push(`Gib die Menge für ${s.name} ein.`);
  }
  if (mode !== 'ml' && scents.length && !num(pct)) errors.push('Gib die Duftölmenge ein.');
  if (errors.length) return { ok: false, errors };

  const inner = totalWeightG - glass.emptyWeightG;
  let waxG, scentG, p, rows, normalized = false;

  if (mode === 'ml') {
    rows = scents.map((s) => ({ ml: s.ml, g: s.ml * s.densityGml }));
    scentG = rows.reduce((a, r) => a + r.g, 0);
    if (scentG >= inner) return { ok: false, errors: ['Das Duftöl wiegt mehr als der Kerzeninhalt.'] };
    waxG = inner - scentG;
    p = (scentG / waxG) * 100;
    const totalMl = rows.reduce((a, r) => a + r.ml, 0);
    rows.forEach((r) => {
      r.shareMassPct = part(r.g, scentG, 100 / rows.length);
      r.shareVolPct = part(r.ml, totalMl, 100 / rows.length);
    });
  } else {
    p = scents.length ? pct : 0;
    waxG = inner / (1 + p / 100);
    scentG = inner - waxG;
    const r = resolveShares(scents);
    normalized = r.normalized;
    rows = scents.map((s, i) => {
      const g = (scentG * r.shares[i]) / 100;
      return { g, ml: g / s.densityGml, shareMassPct: r.shares[i] };
    });
    const totalMl = rows.reduce((a, x) => a + x.ml, 0);
    rows.forEach((x) => { x.shareVolPct = part(x.ml, totalMl, x.shareMassPct); });
  }

  const warnings = [];
  if (normalized) warnings.push('Die Anteile der weiteren Düfte ergeben über 100 %, sie wurden angepasst.');
  if (num(wax.fragranceMaxPct) && p > wax.fragranceMaxPct + 1e-9)
    warnings.push(`Duftöl ${formatPct(p)} % liegt über dem Maximum von ${formatPct(wax.fragranceMaxPct)} % für ${wax.name} (Rußgefahr, verstopfter Docht).`);

  // fehlender Preis: rechnen mit 0, Warnzeile, Summe "unvollständig"
  let incomplete = false;
  const price = (v, name) => {
    if (num(v)) return v;
    incomplete = true;
    warnings.push(`Preis fehlt: ${name}`);
    return 0;
  };

  const outScents = scents.map((s, i) => ({
    name: s.name, ...rows[i], cost: rows[i].ml * price(s.pricePerMl, s.name),
  }));
  const costs = {
    wax: (waxG / 1000) * price(wax.pricePerKg, wax.name),
    scent: outScents.reduce((a, s) => a + s.cost, 0),
    glass: price(glass.price, glass.name || 'Glas'),
    extras: extras.reduce((a, x) => a + x.qty * price(x.pricePerPiece, x.name), 0),
  };
  costs.total = costs.wax + costs.scent + costs.glass + costs.extras;

  const sellPrice = markup && markup.on ? rund05(costs.total * (1 + markup.pct / 100)) : null;

  return { ok: true, innerG: inner, waxG, scentG, scentPct: p, scents: outScents, costs, price: sellPrice, warnings, incomplete };
}
