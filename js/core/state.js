// Zustandsobjekt (Spec 4). Rein, ohne DOM und ohne IndexedDB.
import { defaultWaxes } from './defaults.js';

export const SCHEMA_VERSION = 1;

export const newState = () => ({
  schemaVersion: SCHEMA_VERSION,
  settings: { markupOn: false, markupPct: 150, roundTo: 0.5, fillPct: 75 },
  glasses: [],
  waxes: defaultWaxes(),
  scents: [],
  extras: [],
  candles: [],
  drafts: { cost: {}, plan: {}, lastExtras: [] },
});

// Platzhalter für spätere Schema-Versionen
export function migrate(state) {
  if (!state || typeof state !== 'object') throw new Error('Ungültiger Zustand');
  if (state.schemaVersion > SCHEMA_VERSION) throw new Error('Die Daten stammen aus einer neueren Version der App.');
  return state;
}
