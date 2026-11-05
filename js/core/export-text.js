// angaben.txt für den Etikettendruck (UTF-8, LF, deutsche Zahlen, keine Kosten).
import { formatNumber, formatPct } from './units.js';

const num = (v) => typeof v === 'number' && Number.isFinite(v);

export function angabenText(c) {
  const g = c.glass || {};
  const scents = (c.scents || []).filter((s) => s.name);
  // ml-Modus: Volumenanteil, Prozent-Modus: Massenanteil (Spec D7)
  const share = (s) => (c.scentMode === 'ml' ? s.shareVolPct : s.shareMassPct);
  const duft = scents.length === 1
    ? scents[0].name
    : scents.map((s) => `${s.name} ${formatPct(share(s))} %`).join(', ');

  const lines = [`Name: ${c.name}`];
  if (num(g.heightMm)) lines.push(`Höhe: ${formatNumber(g.heightMm, 1)} mm`);
  if (num(g.widthMm)) lines.push(`Breite: ${formatNumber(g.widthMm, 1)} mm`);
  lines.push(`Duft: ${duft}`);
  if (num(c.scentPct)) lines.push(`Duftöl: ${formatPct(c.scentPct)} % vom Wachs`);
  return lines.join('\n') + '\n';
}
