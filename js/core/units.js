// Zahlen lesen und deutsch formatieren. Rein, ohne DOM.

// "8,5" / "8.5" -> 8.5, "" -> null, Unsinn und Negatives -> NaN
export function parseDecimal(str) {
  const s = String(str ?? '').trim();
  if (s === '') return null;
  if (!/^(\d+[.,]?\d*|[.,]\d+)$/.test(s)) return NaN;
  return Number(s.replace(',', '.'));
}

export function formatNumber(x, maxFrac = 2) {
  return new Intl.NumberFormat('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: maxFrac }).format(x);
}

// "1.234,50 €" (geschütztes Leerzeichen vor dem €). maxFrac 4 für Preis pro ml.
export function formatEuro(x, maxFrac = 2) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: maxFrac,
  }).format(x);
}

export const formatPct = (x) => formatNumber(x, 1);
