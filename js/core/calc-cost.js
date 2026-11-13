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

// waxes: bis zu drei Wachse, das erste bekommt den Rest, die übrigen geben sharePct (waxUnit 'percent') oder grams (waxUnit 'g') an.
// Ohne waxes zählt das einzelne wax.
// perWax: jedes Wachs trägt sein eigenes Duftöl (w.scent = { name, densityGml, pricePerMl, pct }) mit eigener Konzentration;
// scents ist dann die Liste dieser Düfte in Wachs-Reihenfolge.
// noGlass (Figur): kein Glas; waxAmountG = Gewicht der fertigen Kerze (Wachs + Duftöl), wie Gesamtgewicht minus Leergewicht.
export function calcCost({ glass, noGlass = false, waxAmountG, wax, waxes, waxUnit = 'percent', perWax = false, mode = 'percent', totalWeightG, pct, scents = [], extras = [], markup }) {
  const errors = [];
  const mix = waxes?.length ? waxes : wax ? [wax] : [];
  const hasEmpty = glass && num(glass.emptyWeightG) && glass.emptyWeightG > 0;
  if (noGlass) { if (!(num(waxAmountG) && waxAmountG > 0)) errors.push('Gib das Gewicht der Figur in g ein.'); }
  else if (!glass) errors.push('Wähle ein Glas.');
  else if (!hasEmpty) errors.push('Für dieses Glas fehlt das Leergewicht.');
  if (!mix.length) errors.push('Wähle ein Wachs.');
  const byG = waxUnit === 'g';
  for (const w of mix.slice(1)) {
    if (byG && !(num(w.grams) && w.grams > 0)) errors.push(`Gib die Menge in g für ${w.name} ein.`);
    if (!byG && !num(w.sharePct)) errors.push(`Gib den Anteil für ${w.name} ein.`);
  }
  if (noGlass) { /* kein Gesamtgewicht */ } else if (!num(totalWeightG)) errors.push('Gib das Gesamtgewicht mit Glas ein.');
  else if (hasEmpty && totalWeightG <= glass.emptyWeightG)
    errors.push(`Das Gesamtgewicht ist nicht größer als das leere Glas (${formatNumber(glass.emptyWeightG, 1)} g).`);
  for (const s of scents) {
    if (!num(s.densityGml) || s.densityGml <= 0) errors.push(`Dichte fehlt: ${s.name}`);
    if (mode === 'ml' && !num(s.ml)) errors.push(`Gib die Menge für ${s.name} ein.`);
  }
  if (!perWax && mode !== 'ml' && scents.length && !num(pct)) errors.push('Gib die Duftölmenge ein.');
  if (perWax) for (const w of mix) if (w.scent && !(num(w.scent.pct) && w.scent.pct >= 0)) errors.push(`Gib die Duftölmenge für ${w.scent.name} ein.`);
  if (errors.length) return { ok: false, errors };

  const inner = noGlass ? waxAmountG : totalWeightG - glass.emptyWeightG;
  // Duftöl-% bezieht sich auf das Wachs MIT Duftöl. Gramm davon = ka * waxG + kb.
  const f = mix.map((w) => (w.scented === false ? 0 : 1));
  if (!perWax && scents.length && !f.includes(1)) return { ok: false, errors: ['Mindestens ein Wachs muss Duftöl bekommen.'] };
  const gSum = byG ? mix.slice(1).reduce((x, w) => x + w.grams, 0) : 0;
  let ws, ka, kb = 0;
  if (byG && mix.length > 1) {
    ka = f[0];
    kb = mix.slice(1).reduce((x, w, i) => x + f[i + 1] * w.grams, 0) - f[0] * gSum;
  } else {
    ws = resolveShares(mix);
    ka = mix.reduce((x, _, i) => x + (f[i] * ws.shares[i]) / 100, 0);
  }

  // Duftöl-Gramm = A * waxG + B (A, B ergeben sich aus Anteilen und Konzentrationen)
  const pw = mix.map((w) => (perWax && w.scent ? w.scent.pct / 100 : 0));
  let A, B;
  if (perWax) {
    if (byG && mix.length > 1) { A = pw[0]; B = mix.slice(1).reduce((x, w, i) => x + pw[i + 1] * w.grams, 0) - pw[0] * gSum; }
    else { A = mix.reduce((x, _, i) => x + (pw[i] * ws.shares[i]) / 100, 0); B = 0; }
  } else { const p0 = scents.length && num(pct) ? pct : 0; A = (p0 / 100) * ka; B = (p0 / 100) * kb; }

  let waxG, scentG, p, rows, normalized = false;
  if (mode === 'ml') {
    rows = scents.map((s) => ({ ml: s.ml, g: s.ml * s.densityGml }));
    scentG = rows.reduce((x, r) => x + r.g, 0);
    if (scentG >= inner) return { ok: false, errors: ['Das Duftöl wiegt mehr als der Kerzeninhalt.'] };
    waxG = inner - scentG;
  } else {
    p = scents.length ? pct : 0;
    waxG = (inner - B) / (1 + A);
    scentG = inner - waxG;
  }
  if (byG && mix.length > 1) {
    if (gSum >= waxG) return { ok: false, errors: [`Die weiteren Wachse wiegen ${formatNumber(gSum, 1)} g, das Wachs insgesamt aber nur ${formatNumber(waxG, 1)} g.`] };
    ws = { shares: [((waxG - gSum) / waxG) * 100, ...mix.slice(1).map((w) => (w.grams / waxG) * 100)], normalized: false };
  }
  const scentedWaxG = ka * waxG + kb;
  if (mode === 'ml') {
    p = scentG > 0 ? (scentG / scentedWaxG) * 100 : 0;
    const totalMl = rows.reduce((x, r) => x + r.ml, 0);
    rows.forEach((r) => {
      r.shareMassPct = part(r.g, scentG, 100 / rows.length);
      r.shareVolPct = part(r.ml, totalMl, 100 / rows.length);
    });
  } else if (perWax) {
    rows = [];
    mix.forEach((w, i) => {
      if (!w.scent) return;
      const g = (pw[i] * waxG * ws.shares[i]) / 100;
      rows.push({ g, ml: g / w.scent.densityGml, waxName: w.name, pct: w.scent.pct });
    });
    const totalMl = rows.reduce((x, y) => x + y.ml, 0);
    rows.forEach((x) => { x.shareMassPct = part(x.g, scentG, 100 / rows.length); x.shareVolPct = part(x.ml, totalMl, 100 / rows.length); });
    p = waxG > 0 ? (scentG / waxG) * 100 : 0; // Gesamt-Duftölanteil am ganzen Wachs
  } else {
    const r = resolveShares(scents);
    normalized = r.normalized;
    rows = scents.map((s, i) => {
      const g = (scentG * r.shares[i]) / 100;
      return { g, ml: g / s.densityGml, shareMassPct: r.shares[i] };
    });
    const totalMl = rows.reduce((x, y) => x + y.ml, 0);
    rows.forEach((x) => { x.shareVolPct = part(x.ml, totalMl, x.shareMassPct); });
  }

  const warnings = [];
  if (normalized) warnings.push('Die Anteile der weiteren Düfte ergeben über 100 %, sie wurden angepasst.');
  if (ws.normalized) warnings.push('Die Anteile der weiteren Wachse ergeben über 100 %, sie wurden angepasst.');
  // bei mehreren Wachsen begrenzt das empfindlichste (kleinstes Maximum, nur Wachse mit Duftöl und Anteil)
  const limits = mix.filter((w, i) => f[i] && ws.shares[i] > 0 && num(w.fragranceMaxPct));
  const limit = limits.length ? limits.reduce((a, b) => (b.fragranceMaxPct < a.fragranceMaxPct ? b : a)) : null;
  if (!perWax && limit && p > limit.fragranceMaxPct + 1e-9)
    warnings.push(`Duftöl ${formatPct(p)} % liegt über dem Maximum von ${formatPct(limit.fragranceMaxPct)} % für ${limit.name} (Rußgefahr, verstopfter Docht).`);
  if (perWax) for (const w of mix) if (w.scent && num(w.fragranceMaxPct) && w.scent.pct > w.fragranceMaxPct + 1e-9)
    warnings.push(`Duftöl ${formatPct(w.scent.pct)} % liegt über dem Maximum von ${formatPct(w.fragranceMaxPct)} % für ${w.name} (Rußgefahr, verstopfter Docht).`);

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
  const outWaxes = mix.map((w, i) => {
    const g = (waxG * ws.shares[i]) / 100;
    return { name: w.name, sharePct: ws.shares[i], scented: perWax ? !!w.scent : !!f[i], scentName: w.scent?.name ?? null, scentPct: w.scent?.pct ?? null, g, cost: (g / 1000) * price(w.pricePerKg, w.name) };
  });
  const costs = {
    wax: outWaxes.reduce((a, w) => a + w.cost, 0),
    scent: outScents.reduce((a, s) => a + s.cost, 0),
    glass: noGlass ? 0 : price(glass.price, glass.name || 'Glas'),
    extras: extras.reduce((a, x) => a + x.qty * price(x.pricePerPiece, x.name), 0),
  };
  costs.total = costs.wax + costs.scent + costs.glass + costs.extras;

  const sellPrice = markup && markup.on ? rund05(costs.total * (1 + markup.pct / 100)) : null;

  return { ok: true, noGlass, innerG: inner, waxG, waxes: outWaxes, scentG, scentPct: p, scents: outScents, costs, price: sellPrice, warnings, incomplete };
}
