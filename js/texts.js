// Alle UI-Texte an einer Stelle (Spec 7).
export const T = {
  brand: { name: 'Dochtwerk', tagline: 'Dein kleines Kerzenatelier.' },
  back: 'Zurück',
  start: {
    title: 'Was möchtest du machen?',
    sub: 'Alles für deine nächste Kerze.',
    cost: { title: 'Kosten berechnen', desc: 'Glas wählen, Kerze wiegen. Materialkosten im Blick.' },
    material: { title: 'Materialien & Zubehör', desc: 'Gläser, Wachse, Düfte und mehr' },
    plan: { title: 'Wachs & Duftrechner', desc: 'Die passende Mischung für dein Glas' },
    gallery: { title: 'Meine Galerie', desc: 'Deine Kerzen in Bild und Detail' },
    export: { title: 'Kerzen exportieren', desc: 'Seitenansichten & Angaben als ZIP' },
    data: { title: 'Sichern & Hinweise', desc: 'Daten sichern, Merkzettel' },
  },
  // Screen-Titel für Routen, die noch keinen eigenen Screen haben
  stub: {
    soon: 'Dieser Bereich folgt in einer der nächsten Etappen.',
    titles: {
      material: 'Materialien & Zubehör', kosten: 'Kosten berechnen', rechner: 'Wachs & Duftrechner',
      galerie: 'Meine Galerie', export: 'Kerzen exportieren', daten: 'Sichern & Hinweise',
    },
  },
};
