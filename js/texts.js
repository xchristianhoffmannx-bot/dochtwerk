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
  material: {
    title: 'Materialien & Zubehör',
    sub: 'Deine Grundlagen. Einmal hinterlegt.',
    tabsLabel: 'Materialart',
    priceMissing: 'Preis fehlt',
    save: 'Speichern',
    remove: 'Löschen',
    saved: 'Gespeichert',
    removed: 'Gelöscht',
    discard: { title: 'Änderungen verwerfen?', text: 'Deine Eingaben sind noch nicht gespeichert.', ok: 'Verwerfen', cancel: 'Weiter bearbeiten' },
    confirmRemove: (name) => ({ title: 'Wirklich löschen?', text: `„${name}“ wird gelöscht. Gespeicherte Kerzen bleiben unverändert.`, ok: 'Löschen', cancel: 'Abbrechen' }),
    arts: {
      glaeser: { tab: 'Gläser', add: 'Glas hinzufügen', empty: 'Noch keine Gläser angelegt.', newTitle: 'Neues Glas', editTitle: 'Glas bearbeiten' },
      waechse: { tab: 'Wachse', add: 'Wachs hinzufügen', empty: 'Noch keine Wachse angelegt.', newTitle: 'Neues Wachs', editTitle: 'Wachs bearbeiten' },
      duefte: { tab: 'Düfte', add: 'Duft hinzufügen', empty: 'Noch keine Düfte angelegt.', newTitle: 'Neuer Duft', editTitle: 'Duft bearbeiten' },
      sonstiges: { tab: 'Sonstiges', add: 'Posten hinzufügen', empty: 'Noch kein Zubehör angelegt (zum Beispiel Docht oder Etikett).', newTitle: 'Neuer Posten', editTitle: 'Posten bearbeiten' },
    },
  },
  saveFailed: 'Speichern fehlgeschlagen. Sichere deine Daten.',
  saveFailedLink: 'Zu „Sichern & Hinweise“',
  // Screen-Titel für Routen, die noch keinen eigenen Screen haben
  stub: {
    soon: 'Dieser Bereich folgt in einer der nächsten Etappen.',
    titles: {
      kosten: 'Kosten berechnen', rechner: 'Wachs & Duftrechner',
      galerie: 'Meine Galerie', export: 'Kerzen exportieren', daten: 'Sichern & Hinweise',
    },
  },
};
