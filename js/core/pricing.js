// Einheitspreise. Fehlende oder unsinnige Werte -> null ("Preis fehlt").
const ok = (v) => typeof v === 'number' && Number.isFinite(v);
const div = (a, b) => (ok(a) && ok(b) && b > 0 ? a / b : null);

export const pricePerKg = (price, quantityKg) => div(price, quantityKg);
export const pricePerMl = (price, quantityMl) => div(price, quantityMl);
export const pricePerPiece = (priceMode, price, packQty) =>
  priceMode === 'pack' ? div(price, packQty) : ok(price) ? price : null;
