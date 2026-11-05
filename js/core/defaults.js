// Startdaten: nur Wachse, ohne Preis und Menge (Spec 4.1).
export const DEFAULT_SCENT_DENSITY = 0.95;

const WAXES = [
  ['Sojawachs (Container)', 0.90, 8, 12],
  ['Kokos-Soja-Mischung', 0.90, 9, 12],
  ['Rapswachs', 0.90, 8, 10],
  ['Paraffin (Container)', 0.88, 8, 10],
  ['Gelwachs', 0.82, 2, 6],
];

export const defaultWaxes = () =>
  WAXES.map(([name, densityGml, fragranceStdPct, fragranceMaxPct]) => ({
    id: crypto.randomUUID(), name, manufacturer: null,
    price: null, quantityKg: null, densityGml, fragranceStdPct, fragranceMaxPct,
  }));
