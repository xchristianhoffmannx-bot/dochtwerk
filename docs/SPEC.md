# Dochtwerk – Spezifikation v1.0

Stand: 2026-11-05 · Sprache der App: Deutsch · Zielplattform: Android (Chrome), installierte PWA

Dieses Dokument beschreibt die Neuentwicklung des „Kerzenkalkulators“ unter dem Namen **Dochtwerk**. Es ist als Übergabe an Claude Code gedacht und soll ohne Rückfragen umsetzbar sein. Die Entscheidungen stammen aus einer Fragerunde mit dem Auftraggeber (Kürzel Q1–Q8, E1–E9, A1–A8 siehe Abschnitt 2). Offene Punkte und bewusste Abweichungen stehen in Abschnitt 13.

Konfidenz-Kennzeichnung: **Sicher** (nachgerechnet oder belegt), **Wahrscheinlich** (gut begründet, nicht geprüft), **Vermutung** (Annahme, vor Übernahme prüfen).

---

## 1. Ziel und Rahmen

- Privates Projekt eines Kerzenmachers (Dessertkerzen). Kein Markt, keine Nutzerverwaltung, kein Backend, keine Analytics, keine Netzwerkaufrufe zur Laufzeit.
- Die App rechnet Materialkosten und Mengen für Kerzen, verwaltet Materialien, sammelt Kerzenfotos in einer Galerie und exportiert Seitenansichten samt Angaben als ZIP für den späteren Etikettendruck.
- Auslieferung als **installierte PWA** (Chrome → „App installieren“, ergibt ein WebAPK). Eine APK über Capacitor ist **nicht** Teil von v1, soll aber später ohne Umbau möglich bleiben (relative URLs, keine Server-Abhängigkeit).
- Hosting: GitHub Pages in einem **neuen, eigenen Repo** (Name legt der Auftraggeber fest, Vorschlag `dochtwerk`), Auslieferung aus `main` / Wurzelverzeichnis. Alle URLs relativ, damit die App unter jedem Unterpfad läuft.
- Keine Laufzeit-Abhängigkeiten außer zwei mitgelieferten Dateien: einer Schrift (Abschnitt 8) und Inline-SVG-Icons. Kein Build-Schritt, kein Framework.
- Die alte App bleibt **unverändert** im Repo `xchristianhoffmannx-bot/kerzenkalkulator` bestehen und läuft weiter. Dochtwerk entsteht in einem neuen Repo, es gibt keine Datenübernahme (Q6: Neustart). Der alte Code ist nur lesbare Referenz (<https://github.com/xchristianhoffmannx-bot/kerzenkalkulator>), nichts davon wird vorausgesetzt.
- Beide Apps können nebeneinander installiert sein. Sie haben verschiedene Adressen (Origins) und damit getrennten Speicher.

Nicht Teil von v1: APK, Wachsmischungen, Rezepte, Stückzahl/Einkaufsliste, Dunkelmodus, weitere Sprachen, Cloud-Sync, Re-Import des Etiketten-ZIPs, Diashow-Autoplay, Nettogewicht/Datum/Charge im ZIP.

---

## 2. Entscheidungsprotokoll

| ID | Entscheidung |
|---|---|
| Q1 | Installierte PWA. APK später optional über Capacitor. |
| Q2 | Gestrichen: Wachsmischung, Rezepte, Stückzahl/Einkaufsliste. Behalten: Verkaufspreis mit Aufschlag (kleiner Schalter im Ergebnis), Merkzettel (hinter „Sichern & Hinweise“). Nachwiegen entfällt als eigene Funktion (A1). |
| Q3 | ZIP enthält pro Kerze Name, Glashöhe, Glasbreite, Duftmischung, Duftöl-% und das Seitenfoto. Verwendung: Etikettendruck, Übernahme von Hand. Kein Nettogewicht, kein Datum, keine Charge. |
| Q4 | Sonstiges-Posten werden pro Rechnung vom Nutzer ausgewählt. Es gibt Posten pro Stück und pro Packung (Packungspreis ÷ Stückzahl). |
| Q5 | Kosten werden über das Gewicht berechnet (Gesamtgewicht − Leergewicht Glas). Das Glasvolumen ist nur eine Schätzung aus den Maßen. Glasformen: rund, konisch, rechteckig, andere. |
| Q6 | Neustart ohne Datenübernahme. |
| Q7 | Höhe und Breite bleiben im ZIP (für die optimale Etikettengröße). |
| Q8 | Mehrere Düfte pro Kerze möglich. Im ml-Modus hat jeder Duft ein eigenes ml-Feld. |
| R1 | In beiden Rechnern (Kostenrechner, Wachs & Duftrechner) gibt es für den Duft den Umschalter „% vom Wachs“ / „ml“. |
| E1–E9 | Randfälle wie in den Abschnitten 5–7 beschrieben (Fehlerfälle, Aufschlag 150 %, Duftmischungs-Logik, Speichern-Ablauf, Löschen, ZIP-Aufbau, Zahlenformat, leere Zustände, Abnahmetests). |
| A1 | Kein eigenes Nachwiegen (der Kostenrechner ist die Wägung). |
| A2 | Sonstiges per Mehrfachauswahl pro Rechnung, Menge pro Kerze Standard 1, Vorauswahl wie bei der letzten Rechnung. |
| A3 | Datensicherung plus `navigator.storage.persist()`. Zugang über die Zeile „Sichern & Hinweise“. Format abweichend, siehe D1. |
| A4 | Eigenes Repo und eigene Adresse, damit ist der Speicher von der alten App getrennt. Zusätzlich eigene IndexedDB `dochtwerk`. Alte Daten bleiben in der alten App. |
| A5 | Angaben werden als Daten zum Foto gespeichert, nicht ins Bild gebrannt. |
| A6 | Diashow: manuelles Wischen im Vollbild, Kerzenname als Beschriftung, kein Autoplay. |
| A7 | Nur Hellmodus, App-Name „Dochtwerk“, Mockup-Fußzeile entfällt. |
| A8 | Diese Spec als `SPEC.md`, Deutsch. |

---

## 3. Technik und Architektur

### 3.1 Stack

- Plain HTML, CSS, JavaScript als **ES-Module** (`<script type="module">`). Kein Bundler, kein npm-Paket zur Laufzeit.
- Reiner Rechenkern ohne DOM-Zugriff unter `js/core/`, vollständig per Node getestet (`node --test`, nur Node-Standardbibliothek).
- Minimale `package.json` nur für den Test-Aufruf: `{ "type": "module", "scripts": { "test": "node --test" } }`.

### 3.2 Dateistruktur

```
/
├─ index.html
├─ manifest.webmanifest
├─ sw.js
├─ package.json
├─ css/        tokens.css · base.css · components.css
├─ fonts/      Gelasio (Latin-Subset, woff2) + OFL-Lizenztext
├─ icons/      app-192.png · app-512.png · app-maskable-512.png · sprite.svg
├─ js/
│  ├─ main.js            Start, Service-Worker-Registrierung, persist()-Anfrage
│  ├─ router.js          Hash-Router
│  ├─ store.js           State + IndexedDB
│  ├─ photos.js          Aufnahme, Skalierung, Thumbnails
│  ├─ texts.js           alle UI-Texte (deutsch)
│  ├─ core/              rein, ohne DOM
│  │  ├─ units.js        parseDecimal, Formatierer
│  │  ├─ pricing.js      Einheitspreise
│  │  ├─ glass-volume.js Volumenschätzung
│  │  ├─ calc-cost.js    Kostenrechner
│  │  ├─ calc-plan.js    Wachs & Duftrechner
│  │  ├─ candle.js       Snapshot, Vollständigkeit
│  │  ├─ slug.js         Ordnernamen
│  │  ├─ export-text.js  angaben.txt
│  │  ├─ zip.js          ZIP schreiben und lesen (nur Methode „stored“)
│  │  ├─ crc32.js
│  │  └─ defaults.js     Seed-Daten
│  └─ ui/                components.js · icons.js · screens/*.js
├─ docs/       SPEC.md · mockups/*.png (die 7 Screenshots)
└─ tests/      *.test.mjs
```

Die Mockup-Screenshots gehören ins Repo unter `docs/mockups/`, damit sie als visuelle Referenz verfügbar sind.

### 3.3 Navigation

Hash-Router, damit die Android-Zurück-Taste funktioniert und die App unter Unterpfaden von GitHub Pages läuft.

| Route | Screen |
|---|---|
| `#/` | Start |
| `#/material/<art>` | Materialliste, `<art>` = `glaeser` · `waechse` · `duefte` · `sonstiges` |
| `#/material/<art>/neu` | Neu anlegen |
| `#/material/<art>/<id>` | Detail/Bearbeiten |
| `#/kosten` | Kostenrechner (Eingabe) |
| `#/kosten/ergebnis` | Kostenrechner (Ergebnis) |
| `#/rechner` | Wachs & Duftrechner |
| `#/galerie` | Galerie |
| `#/galerie/neu` | Kerze manuell anlegen |
| `#/galerie/<id>` | Kerzen-Detail |
| `#/galerie/diashow` | Diashow |
| `#/export` | Export |
| `#/daten` | Sichern & Hinweise |

Die sichtbare „Zurück“-Schaltfläche führt zum **logischen Elternscreen** (Ergebnis → Eingabe, Detail → Liste, alles andere → Start), nicht zwingend per `history.back()`.

### 3.4 Eingaben und Zahlen (E7)

- Alle Zahlenfelder sind `<input type="text" inputmode="decimal">` (nicht `type="number"`, weil Android bei deutscher Tastatur Komma und Punkt inkonsistent behandelt).
- `parseDecimal(str)`: akzeptiert Komma oder Punkt als Dezimaltrenner, genau einen, keine Tausendertrenner, führende/folgende Leerzeichen werden ignoriert, leere Eingabe → `null`, Unsinn → `NaN`. Negative Werte sind unzulässig.
- Anzeige deutsch über `Intl.NumberFormat('de-DE')`: `1.234,50 €`. Maße in mm, Gewichte in g, Volumen in ml, Preise in €.
- Preis pro ml mit bis zu vier Nachkommastellen (getrimmt), alle anderen Preise mit zwei.
- Prozentwerte mit höchstens einer Nachkommastelle (getrimmt).
- Zwischenrechnungen laufen mit voller Genauigkeit, gerundet wird nur bei der Anzeige.

### 3.5 Speicher

- **IndexedDB** `dochtwerk`, Version 1, zwei Stores:
  - `kv`: Schlüssel `state` → das gesamte JSON-Zustandsobjekt (Abschnitt 4).
  - `photos`: Schlüssel = Foto-ID → `{ blob, thumb, width, height, createdAt }`.
- State wird beim Ändern entprellt (300 ms) geschrieben und zusätzlich bei `visibilitychange` (hidden) und `pagehide`.
- Fehler beim Schreiben (zum Beispiel Quota) → dauerhafter Hinweisbalken „Speichern fehlgeschlagen. Sichere deine Daten.“ mit Link zu `#/daten`.
- `state.schemaVersion = 1`, plus eine Funktion `migrate(state)` als Platzhalter für spätere Versionen.
- Beim Start und nach dem ersten gespeicherten Foto `navigator.storage.persist()` anfragen. Das Ergebnis (geschützt ja/nein) und `navigator.storage.estimate()` erscheinen auf `#/daten`. Ob Chrome die Anfrage gewährt, hängt von Heuristiken ab (Wahrscheinlich eher bei installierter PWA), es gibt keine Garantie. Deshalb ist die Datensicherung wichtig.
- Entwürfe der beiden Rechner (`drafts.cost`, `drafts.plan`) werden im State gespeichert, damit Eingaben beim Zurückkehren erhalten bleiben. Je ein Link „Neu beginnen“ setzt sie zurück.

### 3.6 Service Worker und PWA

- Cache-first für statische Dateien, Konstante `CACHE_VERSION` in `sw.js`. Bei **jeder** Änderung an ausgelieferten Dateien hochzählen (sonst zeigen installierte Kopien die alte Version).
- Navigationsanfragen fallen auf `index.html` zurück. Alles läuft offline.
- Neue Version erkannt → Hinweis „Neue Version verfügbar“ mit Button „Neu laden“.
- `manifest.webmanifest`: `name` und `short_name` „Dochtwerk“, `lang` `de`, `start_url` `./`, `scope` `./`, `display` `standalone`, `orientation` `portrait`, `background_color` `#faf7f2`, `theme_color` `#8c3158`, Icons 192, 512 und eine Maskable-Variante 512.
- App-Icon: Flammen-Strichsymbol in `#8c3158` auf `#faf7f2`. Für die Maskable-Variante bleibt das Symbol im inneren Sicherheitsbereich (80 %).

### 3.7 Fotos (photos.js)

- Zwei Wege: Kamera (`<input type="file" accept="image/*" capture="environment">`) und Galerie des Handys (gleiches Feld ohne `capture`).
- Verarbeitung: `createImageBitmap(file, { imageOrientation: 'from-image' })`, Skalierung auf **2000 px lange Kante** (nicht hochskalieren), `canvas.toBlob('image/jpeg', 0.85)`. Zusätzlich ein Thumbnail mit 400 px lange Kante (JPEG 0,8) für Raster und Listen.
- Anzeige über `URL.createObjectURL`, die URLs beim Verlassen des Screens wieder freigeben (`revokeObjectURL`).
- Pro Kerze höchstens **eine** Seitenansicht (Rolle `side`), beliebig viele weitere Fotos (Rolle `other`). Wird eine neue Seitenansicht gesetzt, fragt die App „Vorhandene Seitenansicht ersetzen?“. Bei „Ja“ wird das alte Foto zu `other` (es wird nichts gelöscht, Löschen geschieht nur explizit).

### 3.8 ZIP (zip.js)

- Schreiben: Methode 0 (stored), CRC-32, UTF-8-Dateinamen (General-Purpose-Bit 11), DOS-Datum/-Zeit, keine ZIP64-Unterstützung nötig.
- Lesen: nur für eigene Sicherungen (Methode 0). Zentrales Verzeichnis parsen.
- Download über `Blob` plus `<a download>`. Dateinamen: `dochtwerk-export-JJJJ-MM-TT.zip` und `dochtwerk-sicherung-JJJJ-MM-TT.zip`.

---

## 4. Datenmodell

Alle IDs sind Strings (`crypto.randomUUID()`). Geldbeträge in Euro als Zahl, Gewichte in g, Maße in mm, Dichten in g/ml.

```jsonc
{
  "schemaVersion": 1,
  "settings": {
    "markupOn": false,
    "markupPct": 150,            // Aufschlag auf Materialkosten
    "roundTo": 0.5,              // Verkaufspreis auf 0,50 € runden
    "fillPct": 75                // Füllgrad für Glaswahl im Wachs & Duftrechner
  },
  "glasses": [{
    "id": "", "name": "", "manufacturer": null,
    "shape": "round | conical | rect | other",
    "heightMm": 90, "widthMm": 80,           // Pflicht, Außenmaße
    "diameterTopMm": null, "diameterBottomMm": null,  // optional, nur conical
    "depthMm": null,                         // optional, nur rect
    "wallMm": 3,                             // Wandstärke, Standard 3
    "emptyWeightG": 195,
    "priceMode": "piece | pack", "price": 1.8, "packQty": 1   // → pricePerPiece
  }],
  "waxes": [{
    "id": "", "name": "", "manufacturer": null,
    "price": 0, "quantityKg": 0,             // → pricePerKg
    "densityGml": 0.90,
    "fragranceStdPct": 8, "fragranceMaxPct": 12   // beide optional
  }],
  "scents": [{
    "id": "", "name": "", "manufacturer": null,
    "price": 0, "quantityMl": 0,             // → pricePerMl
    "densityGml": 0.95
  }],
  "extras": [{                                // „Sonstiges“, zum Beispiel Docht
    "id": "", "name": "", "manufacturer": null,
    "priceMode": "piece | pack", "price": 0, "packQty": 1   // → pricePerPiece
  }],
  "candles": [{
    "id": "", "name": "", "createdAt": "ISO-8601",
    "glass": { "glassId": null, "name": "", "shape": "", "heightMm": 0, "widthMm": 0,
               "diameterTopMm": null, "diameterBottomMm": null, "depthMm": null,
               "emptyWeightG": 0, "price": 0 },          // Snapshot (Q3)
    "wax": { "waxId": null, "name": "", "pricePerKg": 0, "densityGml": 0 },
    "scentMode": "percent | ml",
    "scents": [{ "scentId": null, "name": "", "pricePerMl": 0, "densityGml": 0,
                 "ml": 0, "grams": 0,
                 "shareMassPct": 100, "shareVolPct": 100 }],
    "scentPct": 8,                            // Duftöl in % vom Wachs (bei ml-Modus abgeleitet)
    "totalWeightG": 465, "waxG": 250, "scentG": 20,
    "extras": [{ "extraId": null, "name": "", "qty": 1, "pricePerPiece": 0 }],
    "costs": { "wax": 0, "scent": 0, "glass": 0, "extras": 0, "total": 0 },   // Snapshot, editierbar
    "markup": { "on": false, "pct": 150, "price": null },
    "photos": [{ "id": "", "role": "side | other", "createdAt": "ISO-8601" }]
  }],
  "drafts": {
    "cost": { },                              // Eingaben des Kostenrechners
    "plan": { },                              // Eingaben des Wachs & Duftrechners
    "lastExtras": [{ "extraId": "", "qty": 1 }]
  }
}
```

Hinweise:

- **Snapshot (Q3):** Beim Speichern einer Kerze werden Preise, Gewichte und Glasmaße **kopiert**. Spätere Preisänderungen oder gelöschte Materialien verändern gespeicherte Kerzen und das ZIP nicht. Bearbeiten in der Galerie ändert nur die gespeicherten Werte und rechnet nichts neu.
- **Einheitspreise (`pricing.js`):** `pricePerKg = price / quantityKg`, `pricePerMl = price / quantityMl`, `pricePerPiece = priceMode === 'pack' ? price / packQty : price`. Division durch 0 oder fehlende Werte → `null` (Preis „fehlt“).
- **Anteil im ZIP:** `shareMassPct` ist der Massenanteil, `shareVolPct` der Volumenanteil am Duftöl. Das ZIP nutzt im ml-Modus `shareVolPct` (12 ml : 8 ml → 60 / 40, wie eingegeben), im Prozent-Modus `shareMassPct` (wie eingegeben). Siehe D7.
- Höchstens **4 Düfte** pro Kerze (Vermutung, dass das reicht).

### 4.1 Startdaten (`defaults.js`)

Beim ersten Start werden nur Wachse vorgelegt (ohne Preis und ohne Mengen). Düfte, Gläser und Sonstiges sind leer. Dichten und Prozentwerte stammen aus Abschnitt 5.1 und 14.

| Name | Dichte g/ml | Duftöl Standard % | Duftöl Max. % |
|---|---|---|---|
| Sojawachs (Container) | 0,90 | 8 | 12 |
| Kokos-Soja-Mischung | 0,90 | 9 | 12 |
| Rapswachs | 0,90 | 8 | 10 |
| Paraffin (Container) | 0,88 | 8 | 10 |
| Gelwachs | 0,82 | 2 | 6 |

Standard-Dichte eines neu angelegten Duftöls: 0,95 g/ml.

---

## 5. Berechnungen (Rechenkern)

Alle Funktionen sind rein (Eingabe → Ergebnisobjekt, keine Seiteneffekte) und liegen in `js/core/`. Das Duftöl-% bezieht sich **immer auf das Wachsgewicht**, nicht auf das Gesamtgewicht (Sicher, entspricht der Praxis laut Quellen in Abschnitt 14).

### 5.1 Dichten (Quelle und Belastbarkeit)

| Material | Wert | Konfidenz |
|---|---|---|
| Soja-, Kokos-Soja-, Rapswachs | ≈ 0,90 g/ml | Wahrscheinlich (Rapswachs: Herstellerdatenblatt 0,90 bei 20 °C; Soja und Kokos-Soja aus Sekundärquellen) |
| Paraffin | 0,86–0,915 g/ml je nach Sorte, Standard 0,88 | Wahrscheinlich (Spanne mehrerer Quellen) |
| Gelwachs | 0,82 g/ml (ein Herstellerdatenblatt) | Vermutung für andere Sorten, siehe D5 |
| Duftöl | 0,90–1,05 g/ml, Arbeitswert 0,95 | Wahrscheinlich (Spanne), der Einzelwert ist produktabhängig |

Alle Dichten sind **pro Material editierbar** (Q6a). Im Zweifel gilt das Sicherheitsdatenblatt des Herstellers. Flüssig vergossenes Wachs ist etwas weniger dicht als erstarrtes, deshalb gelten die Werte für das Vergussvolumen (Vermutung: Abweichung im Bereich weniger Prozent).

### 5.2 Kostenrechner (`calc-cost.js`)

Eingaben: Glas (mit Leergewicht und Preis), Wachs, Duft-Liste, Modus `percent` oder `ml`, Gesamtgewicht mit Glas `T`, Zubehör-Auswahl.

```
Inhalt I = T − Leergewicht            (muss > 0 sein)
```

**Modus `percent`** (Duftöl-% `p` für alle Düfte zusammen):

```
Wachs_g   = I / (1 + p/100)
Duft_g    = I − Wachs_g
Duft i:   Anteil s_i (Summe 100; der erste Duft bekommt den Rest, E3)
          g_i  = Duft_g · s_i/100
          ml_i = g_i / Dichte_i
```

**Modus `ml`** (je Duft ein Feld `ml_i`, kein Gesamt-%):

```
g_i       = ml_i · Dichte_i
Duft_g    = Σ g_i
Wachs_g   = I − Duft_g                (muss > 0 sein)
p         = Duft_g / Wachs_g · 100    (abgeleitet, wird angezeigt)
Massenanteil_i  = g_i / Duft_g
Volumenanteil_i = ml_i / Σ ml
```

**Kosten:**

```
Wachs  = Wachs_g / 1000 · Preis_pro_kg
Duft   = Σ ml_i · Preis_pro_ml_i
Glas   = Glaspreis (pro Stück)
Zubehör= Σ Menge · Preis_pro_Stück
Summe  = Wachs + Duft + Glas + Zubehör
Verkaufspreis (nur bei Aufschlag an) = rund05(Summe · (1 + Aufschlag/100))
```

`rund05(x) = Math.round(x · 2) / 2`. Standard-Aufschlag 150 % (E2). Anzeige der Kosten auf den Cent, die Summe ist die gerundete exakte Summe.

**Warnungen und Fehler (E1):**

| Fall | Verhalten |
|---|---|
| Kein Glas gewählt | Fehler „Wähle ein Glas.“ (ohne angelegte Gläser: Link „Glas anlegen“) |
| Kein Wachs gewählt | Fehler „Wähle ein Wachs.“ |
| Glas ohne Leergewicht | Fehler „Für dieses Glas fehlt das Leergewicht.“ mit Link zum Glas |
| `T ≤ Leergewicht` | Fehler „Das Gesamtgewicht ist nicht größer als das leere Glas (X g).“ |
| ml-Modus: `Duft_g ≥ I` | Fehler „Das Duftöl wiegt mehr als der Kerzeninhalt.“ |
| Duft-% über Maximum des Wachses | Warnung „Duftöl X % liegt über dem Maximum von Y % für <Wachs> (Rußgefahr, verstopfter Docht).“ Gilt auch für das abgeleitete % im ml-Modus. |
| Preis fehlt (Wachs, Duft, Glas, Zubehör) | Es wird trotzdem gerechnet. Warnzeile „Preis fehlt: <Name>“, die Summe trägt den Zusatz „unvollständig“. |
| Kein Duft gewählt | Erlaubt, Duftkosten 0. Die Kerze ist dann nicht exportierbar (Abschnitt 5.5). |

Bei Fehlern erscheint **kein** Ergebnisscreen, die Meldung steht direkt am Feld beziehungsweise über dem Button.

### 5.3 Wachs & Duftrechner (`calc-plan.js`)

Zielvolumen `V` ist das **Gesamtvolumen** der Kerzenmasse (Wachs + Duft). Ideale Mischung, das heißt Volumina addieren sich (Wahrscheinlich ausreichend genau für Kerzen).

**Modus `percent`:**

```
k       = Σ (s_i/100) / Dichte_i                 // Ölvolumen je Gramm Öl
Wachs_g = V / (1/Dichte_Wachs + (p/100) · k)
Duft_g  = (p/100) · Wachs_g
g_i = Duft_g · s_i/100,   ml_i = g_i / Dichte_i
```

**Modus `ml`:**

```
V_Öl    = Σ ml_i                                 (muss < V sein)
Wachs_g = (V − V_Öl) · Dichte_Wachs
g_i     = ml_i · Dichte_i,   Duft_g = Σ g_i
p       = Duft_g / Wachs_g · 100                 (abgeleitet)
```

Ergebnis: Wachs in g, Duftöl in g und ml je Duft. Im ml-Modus zusätzlich „entspricht ca. x,x % vom Wachs“, die Maximum-Warnung prüft diesen Wert. `V_Öl ≥ V` → Fehler „Die Duftmenge ist größer als das Zielvolumen.“

**Glas übernehmen (Q6c):** Optional wählt man ein Glas, das Zielvolumen wird mit `Volumenschätzung × Füllgrad` vorbelegt (Füllgrad Standard 75 %, einstellbar am Feld, gespeichert in `settings.fillPct`). Die Vorbelegung ist mit „Schätzung“ gekennzeichnet und von Hand überschreibbar. Hat das Glas keine Volumenschätzung (Form „andere“ oder fehlende Tiefe), bleibt das Feld leer, ein Hinweis erklärt warum.

### 5.4 Glasvolumen-Schätzung (`glass-volume.js`)

Die Maße sind **Außenmaße**. Das Innenvolumen wird über die Wandstärke `w` (Standard 3 mm, Boden gleich dick) geschätzt und immer als „Schätzung ca.“ angezeigt.

```
h_i = Höhe − w                                    (muss > 0 sein)
rund:       r = (Breite − 2w)/2
            V = π · r² · h_i
konisch:    mit Ø oben und Ø unten: r1 = (Ø_oben − 2w)/2, r2 = (Ø_unten − 2w)/2
            V = π · h_i / 3 · (r1² + r1·r2 + r2²)           (Kegelstumpf)
            ohne beide: Zylindernäherung mit Breite wie „rund“, Hinweis „grobe Schätzung“
rechteckig: V = (Breite − 2w) · (Tiefe − 2w) · h_i          (ohne Tiefe: keine Schätzung)
andere:     keine Schätzung
```

Umrechnung: mm³ ÷ 1000 = ml. Die Schätzung fließt **nicht** in die Kostenrechnung ein, nur in die Anzeige (Materialliste, Glasdetail) und in die Vorbelegung des Zielvolumens.

### 5.5 Vollständigkeit für den Export (`candle.js`, Q3b)

Eine Kerze ist exportierbar, wenn alle vier Bedingungen gelten:

1. mindestens ein Foto mit Rolle `side`,
2. Name nicht leer,
3. Glas-Snapshot mit Höhe und Breite,
4. mindestens ein Duft mit Namen.

Fehlendes wird als Liste ausgegeben: „Seitenansicht fehlt“, „Name fehlt“, „Glas fehlt“, „Duft fehlt“, mehrere durch Komma getrennt.

---

## 6. Screens

Allgemein:

- **Kopf** auf jedem Screen: Flammen-Icon (Strich, Akzentfarbe), „Dochtwerk“ in Serifenschrift, darunter „Dein kleines Kerzenatelier.“. Der Kopf scrollt mit.
- **Zurück-Zeile** auf allen Screens außer dem Start: Pfeil-Icon plus „Zurück“, **klebt beim Scrollen oben** (`position: sticky`), weil „oben immer eine Zurück-Möglichkeit“ gefordert ist.
- Inhaltsbreite maximal 480 px, zentriert, seitlicher Rand ≈ 22 px.
- Die Mockup-Fußzeile „Gestaltungsvorschlag mit Beispieldaten“ und alle Mockup-Platzhaltertexte („Beispielergebnis ansehen“, „Die Zahlen zeigen die Gestaltung…“, „Die Mengenberechnung folgt…“) entfallen.
- Jeder Screen hat einen leeren Zustand mit kurzem Hinweis und Button (E8).
- Löschen immer mit Rückfrage über `<dialog>` (E5).

Visuelle Referenz: `docs/mockups/*.png`. Die Maße in Abschnitt 8 sind aus den Screenshots geschätzt und gegen sie abzugleichen.

### 6.1 Start (`#/`)

Reihenfolge von oben nach unten:

1. Titel „Was möchtest du machen?“ (Serifenschrift, groß), darunter „Alles für deine nächste Kerze.“
2. **Hero-Kachel** (Akzentfarbe, weißer Text): „Kosten berechnen“ (Serifenschrift) mit Beschreibung „Glas wählen, Kerze wiegen. Materialkosten im Blick.“ und Taschenrechner-Icon rechts oben. Seitenverhältnis ≈ 3 : 1. → `#/kosten`
3. **Zwei Kacheln nebeneinander** (weiße Karte, Rahmen): „Materialien & Zubehör“ („Gläser, Wachse, Düfte und mehr“, Box-Icon) → `#/material/glaeser`, und „Wachs & Duftrechner“ („Die passende Mischung für dein Glas“, Tropfen-Icon) → `#/rechner`.
4. **Breite Kachel** „Meine Galerie“ („Deine Kerzen in Bild und Detail“, Bilder-Icon) mit dekorativer Kerzen-Illustration (Inline-SVG, Kerze mit Etikett) rechts. → `#/galerie`
5. **Listenzeile** „Kerzen exportieren“ („Seitenansichten & Angaben als ZIP“, Ordner-Icon, Chevron rechts). → `#/export`
6. **Listenzeile** „Sichern & Hinweise“ („Daten sichern, Merkzettel“, Chevron). → `#/daten`

### 6.2 Materialien (`#/material/<art>`)

- Titel „Materialien & Zubehör“, Untertitel „Deine Grundlagen. Einmal hinterlegt.“
- **Reiter** (Chips, Reihenfolge fest): Gläser · Wachse · Düfte · Sonstiges. Aktiv: Akzentfüllung, weißer Text. Inaktiv: weiße Karte, Rahmen.
- Liste: eine Karte je Eintrag mit Name (fett) und einer grauen Unterzeile, rechts ein Chevron. Tippen öffnet das Detail.

| Reiter | Unterzeile |
|---|---|
| Gläser | rund/konisch: `Ø 80 × 90 mm · 1,80 € / Stück` (Breite als Ø), rechteckig: `80 × 70 × 90 mm · 1,80 € / Stück` (ohne Tiefe: `80 × 90 mm`), andere: `80 × 90 mm` |
| Wachse | `13,36 € / kg` |
| Düfte | `0,0318 € / ml` |
| Sonstiges | `0,29 € / Stück` |

- Fehlender Preis: Unterzeile „Preis fehlt“ in Warnfarbe.
- Unter der Liste der Button **„+ Glas hinzufügen“**, bzw. „+ Wachs hinzufügen“, „+ Duft hinzufügen“, „+ Posten hinzufügen“. Leerer Zustand: Hinweistext plus derselbe Button.

### 6.3 Material-Detail (`#/material/<art>/<id|neu>`)

Einheitliches Formular mit Feldern je Art. Pflichtfelder sind mit * markiert. Unten **„Speichern“** (Primärbutton), bei bestehenden Einträgen **„Löschen“** (Textlink in Fehlerfarbe) mit Rückfrage. Ungespeicherte Änderungen beim Verlassen: Rückfrage „Änderungen verwerfen?“.

**Glas:** Name\*, Hersteller (optional), Form\* (rund · konisch · rechteckig · andere), Höhe\* (mm), Breite\* (mm), bei konisch optional Ø oben und Ø unten (mm), bei rechteckig optional Tiefe (mm), Wandstärke (mm, Standard 3), Leergewicht\* (g), Preis\* mit Umschalter „pro Stück“ / „pro Packung“ (bei Packung zusätzlich „Stück pro Packung“). Darunter die Anzeige „Volumen: ca. 374 ml (Schätzung)“ bzw. „Keine Schätzung möglich“.

**Wachs:** Name\*, Hersteller (optional), Preis\* (€), gekaufte Menge\* (kg), Dichte (g/ml, vorbelegt 0,90), Duftöl Standard (%), Duftöl Maximum (%). Anzeige „= 13,36 € pro kg“.

**Duft:** Name\*, Hersteller (optional), Preis\* (€), gekaufte Menge\* (ml), Dichte (g/ml, vorbelegt 0,95). Anzeige „= 0,0318 € pro ml“.

**Sonstiges:** Name\*, Hersteller (optional), Preis\* (€) mit Umschalter „pro Stück“ / „pro Packung“ (bei Packung „Stück pro Packung“). Anzeige „= 0,29 € pro Stück“.

Validierung: Zahlen ≥ 0, Mengen und Packungsgrößen > 0, Maße > 0. Fehler stehen unter dem jeweiligen Feld.

Löschen eines Materials ändert gespeicherte Kerzen **nicht** (Snapshot).

### 6.4 Kostenrechner, Eingabe (`#/kosten`)

Titel „Kosten berechnen“, Untertitel „Die fertige Kerze auf die Waage stellen.“

Felder von oben nach unten:

1. **Verwendetes Glas** (Auswahl, Optionstext `Name · leer 195 g`, ohne Leergewicht `Name · Leergewicht fehlt`).
2. **Verwendetes Wachs** (Auswahl).
3. **Duftöl**-Block:
   - Zeile 1: Auswahl „Duftöl“ (Option „– ohne –“ erlaubt).
   - Textlink „+ weiteres Duftöl“ (bis 4 Zeilen, je Zeile ein Entfernen-Icon).
4. **Gesamtgewicht mit Glas (g)**.
5. **Duftölmenge** und **Einheit** nebeneinander (Auswahl „% vom Wachs“ / „ml“):
   - Modus `percent`: ein Feld für das Gesamt-%. Bei ≥ 2 Düften zeigt Zeile 1 „Rest x %“ (nur Anzeige), die weiteren Zeilen haben ein Feld „Anteil %“ (E3). Summe der weiteren Anteile über 100 % → Normierung plus Hinweis.
   - Modus `ml`: das Gesamtfeld entfällt, **jede Duftzeile** bekommt ein eigenes Feld „ml“ (Q8). Anteile ergeben sich daraus.
   - Beim Umschalten behält jeder Modus seine eigenen Eingaben (keine Umrechnung).
   - Beim Wählen eines Wachses wird das Duftöl-% mit dessen Standardwert vorbelegt, solange der Nutzer es nicht selbst geändert hat.
6. **Zubehör pro Kerze** (A2): Liste der Sonstiges-Posten als antippbare Zeilen mit Haken und Mengenfeld (Standard 1, nur bei gesetztem Haken aktiv). Vorauswahl = Auswahl der letzten Rechnung (`drafts.lastExtras`). Leer: „Noch kein Zubehör angelegt.“ mit Link nach `#/material/sonstiges`.
7. Primärbutton **„Kosten berechnen“** (Taschenrechner-Icon). Validierung nach Abschnitt 5.2, bei Erfolg → `#/kosten/ergebnis`.
8. Textlink „Neu beginnen“.

### 6.5 Kostenrechner, Ergebnis (`#/kosten/ergebnis`)

- Titel „Deine Materialkosten“, Untertitel `<Duftname(n)> im <Glasname>.`
- **Ergebniskarte** (Hintergrund `--result-bg`): Kopfzeile „Reine Materialkosten“, darunter die Summe groß in Serifenschrift (zum Beispiel `6,40 €`), darunter Zeilen mit Bezeichnung links, Betrag rechts:
  - `Wachs` mit grauer Zusatzzeile `250 g`
  - `Duftöl` mit Zusatzzeile `20 g · 21,1 ml` (bei mehreren Düften je Duft eine eigene Unterzeile mit Name, g und ml)
  - `Glas`
  - `Docht & Zubehör` (Summe der gewählten Sonstiges-Posten, Zeile entfällt ohne Auswahl)
- Unter der Karte zwei Kennzahlen nebeneinander: „Gesamtgewicht“ → `465 g mit Glas`, „Duftölanteil“ → `8 % vom Wachs` (ml-Modus: `7,7 % vom Wachs (aus 20 ml)`).
- Warnungen (Abschnitt 5.2) als Warnbanner über der Karte.
- **Verkaufspreis** (kleiner Schalter „Verkaufspreis berechnen“, Zustand in `settings.markupOn`): bei „an“ erscheinen das Feld „Aufschlag %“ (Standard 150) und der Verkaufspreis, auf 0,50 € gerundet.
- Primärbutton **„Foto & Kerze speichern“** (Kamera-Icon) und darunter Textlink **„Ohne Foto speichern“** (E4).

**Speichern-Ablauf (E4, A5):**

1. Button → Kamera öffnet sich (Abschnitt 3.7).
2. Nach dem Foto erscheint ein Bottom-Sheet (`<dialog>`): Feld „Name“ (optional) und Auswahl „Dieses Foto ist die Seitenansicht“ (Ja/Nein, Vorgabe Ja).
3. „Speichern“ legt die Kerze mit Snapshot an (Abschnitt 4), das Foto bleibt unverändert (keine Einblendung ins Bild).
4. Hinweis „Kerze gespeichert“, Weiterleitung nach `#/galerie/<id>`.

Bei „Ohne Foto speichern“ entfällt Schritt 1 und 2 (nur Namensfeld), die Kerze erscheint als „Seitenansicht fehlt“.

### 6.6 Wachs & Duftrechner (`#/rechner`)

Titel „Wachs & Duftrechner“, Untertitel „Mengen planen, bevor du gießt.“

Felder: Wachs (Auswahl), Duftöl-Block wie in 6.4 (Duft-Zeilen, „+ weiteres Duftöl“, Einheit „% vom Wachs“ / „ml“, im ml-Modus je Duft ein ml-Feld), **Zielvolumen (ml)**, optional „Glas übernehmen“ (Auswahl plus Füllgrad %).

Ergebniskarte „Das brauchst du“ (live aktualisiert, bis die Eingaben gültig sind steht `— g`):

- `Wachs` in g
- `Duftöl` in g (und ml), bei mehreren Düften je Duft eine Unterzeile
- ml-Modus: Zusatzzeile „entspricht ca. x,x % vom Wachs“

Darunter eine Zeile mit den verwendeten Dichten (`Wachs 0,90 g/ml · Vanille 0,95 g/ml`). Warnungen nach Abschnitt 5.3. „Neu beginnen“ setzt den Entwurf zurück.

### 6.7 Galerie (`#/galerie`)

- Titel „Meine Galerie“, Untertitel „Deine Kerzen. Jede ein kleines Werk.“
- **Raster, zwei Spalten**, Karten mit Bildfläche oben (Thumbnail der Seitenansicht, sonst erstes Foto, sonst farbiger Platzhalter) und darunter Name (fehlt er: „Ohne Namen“) sowie die Zeile **„Seitenansicht vorhanden“** bzw. **„Seitenansicht fehlt“**. Sortierung: neueste zuerst. Tippen → Kerzen-Detail.
- Buttons: **„+ Kerze hinzufügen“** (Primär) → `#/galerie/neu`, **„Diashow starten“** (Sekundär, Play-Icon) → `#/galerie/diashow`. Ohne Fotos ist „Diashow starten“ deaktiviert.
- Leer: „Noch keine Kerzen. Berechne Kosten und speichere eine Kerze, oder lege eine von Hand an.“

### 6.8 Kerzen-Detail und manuelles Anlegen (`#/galerie/<id>`, `#/galerie/neu`)

Von oben nach unten:

1. **Statusband zur Exportfähigkeit**: grün „Bereit für den Export“ oder Warnband „Für den Export fehlt: Name, Seitenansicht“ (Abschnitt 5.5).
2. **Fotos**: horizontale Leiste mit Thumbnails, Rollenbadge „Seitenansicht“ auf dem entsprechenden Foto. Antippen öffnet das Foto groß mit Aktionen „Als Seitenansicht markieren“ (mit Rückfrage bei vorhandener, Abschnitt 3.7) und „Löschen“. Button **„+ Foto hinzufügen“** öffnet eine Auswahl „Kamera“ / „Aus Galerie“, danach die Frage „Ist das die Seitenansicht?“.
3. **Felder** (alle bearbeitbar, speichern beim Verlassen oder per Button „Speichern“):
   - Name
   - Glas (Auswahl aus den Gläsern; Wechsel kopiert die Maße als neuen Snapshot)
   - Wachs (Auswahl, kopiert Namen und Dichte)
   - Düfte (Zeilen mit Auswahl und Anteil %; bis 4)
   - Duftöl % vom Wachs
   - Gesamtgewicht mit Glas (g)
   - Kosten gesamt (€)
   - erstellt am (nur Anzeige)
4. **„Kerze löschen“** (Textlink, Fehlerfarbe, Rückfrage; löscht auch die zugehörigen Fotos).

Manuell angelegte Kerzen nutzen denselben Screen im Modus „neu“: zuerst ein Foto wählen (Kamera oder Galerie, optional), dann die Felder ausfüllen. Es werden **keine** Kosten automatisch berechnet.

### 6.9 Diashow (`#/galerie/diashow`)

- Vollbild-Overlay, dunkler Hintergrund (`#1e1a1e`), Foto passend eingepasst (`object-fit: contain`).
- Wischen links/rechts (CSS Scroll-Snap, horizontal), Pfeiltasten am Desktop. Reihenfolge: Galerie-Reihenfolge, innerhalb einer Kerze die Seitenansicht zuerst.
- Unten der Kerzenname als Beschriftung (falls vorhanden) und ein Zähler `3 / 12`. Oben rechts Schließen-Icon (zurück nach `#/galerie`).
- Kein Autoplay. Speicher schonen: nur das aktuelle und die beiden Nachbarfotos als Object-URL halten.

### 6.10 Export (`#/export`)

- Titel „Kerzen exportieren“, Untertitel „Wähle die Kerzen für dein ZIP-Paket.“
- Abschnitt **„Mit Seitenansicht“**: je exportierbarer Kerze eine Zeile mit Checkbox (Akzentfarbe), Name und Unterzeile „Seitenfoto und Kerzenangaben“. Standard: alle ausgewählt. Textlink „Alle abwählen“ / „Alle auswählen“.
- Abschnitt **„Noch unvollständig“**: je nicht exportierbarer Kerze eine Karte mit Name, Grund („Seitenansicht fehlt“ usw., Abschnitt 5.5) und rechts dem Link **„Ergänzen“** → `#/galerie/<id>`.
- Hinweistext „Das Paket enthält die gewählten Seitenfotos und die vorhandenen Angaben zu jeder Kerze.“
- Primärbutton **„ZIP exportieren“** (Ordner-Icon), deaktiviert ohne Auswahl. Danach Hinweis mit Dateiname.

**ZIP-Inhalt (E6, Q3, Q7):**

```
dochtwerk-export-2026-11-05.zip
├─ vanillewolke/
│  ├─ seite.jpg
│  └─ angaben.txt
└─ lavendeltraum/
   ├─ seite.jpg
   └─ angaben.txt
```

`angaben.txt` (UTF-8, Zeilenende LF, deutsche Zahlen, keine Kosten):

```
Name: Vanillewolke
Höhe: 90 mm
Breite: 80 mm
Duft: Vanille 60 %, Karamell 40 %
Duftöl: 8 % vom Wachs
```

- Bei nur einem Duft: `Duft: Vanille`.
- Anteile als ganze Prozent, sonst eine Nachkommastelle (getrimmt). Anteilsbasis siehe Abschnitt 4.
- Zahlen mit Dezimalkomma. Höhe und Breite aus dem Glas-Snapshot, Millimeter ohne Nachkommastellen, wenn ganzzahlig.
- **Ordnername (`slug.js`)**: Kleinbuchstaben, ä→ae, ö→oe, ü→ue, ß→ss, übrige Akzente per NFD entfernen, alles außer a–z und 0–9 → `-`, mehrfache `-` zusammenfassen, Anfang/Ende trimmen, höchstens 40 Zeichen, leer → `kerze`. Doppelte Namen erhalten einen Zähler (`vanille`, `vanille-2`, `vanille-3`). Der Originalname steht in `angaben.txt`.
- Foto: unverändert die gespeicherte 2000-px-Datei als `seite.jpg`.

### 6.11 Sichern & Hinweise (`#/daten`)

Abschnitte:

1. **Daten sichern** (Primärbutton): erzeugt `dochtwerk-sicherung-JJJJ-MM-TT.zip` mit `state.json` und `fotos/<foto-id>.jpg` (je Foto die gespeicherte Hauptdatei, Thumbnails werden beim Wiederherstellen neu erzeugt). Siehe D1.
2. **Wiederherstellen**: Dateiauswahl, prüft Format und `schemaVersion`, Rückfrage „Alle aktuellen Daten durch die Sicherung ersetzen?“, dann Rückmeldung „Wiederhergestellt: X Kerzen, Y Fotos“. Ungültige Datei → „Diese Datei ist keine gültige Sicherung.“
3. **Speicher**: Status „Dauerhaft geschützt: ja/nein“ und „Belegt: x MB von y MB“ (aus `navigator.storage`). Bei „nein“ ein Hinweis, regelmäßig zu sichern.
4. **Merkzettel zum Verkauf** (Text aus der bisherigen App, unverändert übernehmen):
   - Keine Lebensmittel-Optik: Dessertkerzen dürfen nicht mit echtem Essen verwechselbar sein (GPSR, § 5 LFGB). „Nicht essbar“ als Aufkleber allein reicht laut Quelle nicht.
   - Lose Deko (Beeren, Kekse) nicht kleiner als 3,17 cm (Erstickungsschutzkegel).
   - Warnhinweise nach DIN EN 15494: nie unbeaufsichtigt brennen lassen, außer Reichweite von Kindern und Tieren, Abstand zu Brennbarem.
   - Duftöl: Allergene, Piktogramme, Signalwort, H-/P-Sätze auf dem Etikett; bei gefährlichen Gemischen UFI-Code und Meldung.
   - Auf Produkt oder Verpackung: Name, Postanschrift und E-Mail, Chargennummer, Nettogewicht.
   - Dokumentation: interne Risikoanalyse aufbewahren.
   - Tassen/Geschirr als Behälter: gegebenenfalls zusätzliche Anzeigepflicht (BedGgstV).
   - Steuern/Gewerbe beim Verkauf auf dem Markt klären.
   - Überschrift-Hinweis: „Aus deinem NotebookLM-Material, nicht rechtlich geprüft. Vor dem Verkauf selbst klären, keine Rechtsberatung.“
5. **Über Dochtwerk**: Versionsnummer (`APP_VERSION`), Hinweis „Alle Daten liegen nur auf diesem Gerät.“

---

## 7. Verhalten, das mehrere Screens betrifft

- **Live-Berechnung** nur im Wachs & Duftrechner. Der Kostenrechner rechnet auf Knopfdruck (zwei Screens wie im Mockup).
- **Eingabefokus:** Beim Tippen darf nur der Ergebnisbereich neu gerendert werden, nie das Eingabefeld selbst (die alte App tat das nur bei Auswahlfeldern, das beibehalten).
- **Leere Zustände (E8):** jede Liste und jeder Rechner nennt in einem Satz, was fehlt, und bietet den nächsten Schritt als Button oder Link.
- **Löschen (E5):** Materialien, Kerzen und Fotos nur nach Rückfrage.
- **Texte:** alle UI-Texte in `texts.js`, damit Änderungen an einer Stelle möglich sind.

---

## 8. Design

Referenz sind die sieben Mockups. Werte aus den Screenshots gemessen (Pixelfarben, **Sicher**) oder geschätzt (Maße, **Vermutung**).

### 8.1 Farben

| Token | Wert | Verwendung |
|---|---|---|
| `--bg` | `#faf7f2` | Seitenhintergrund |
| `--surface` | `#fffefd` | Karten, Eingabefelder, Reiter (inaktiv) |
| `--border` | `#e8dfe2` | Rahmen von Karten, Feldern, Trennlinien |
| `--accent` | `#8c3158` | Primärbuttons, Hero-Kachel, aktiver Reiter, Haken, Icons |
| `--accent-contrast` | `#ffffff` | Text auf Akzent |
| `--result-bg` | `#f3e4eb` | Ergebniskarten |
| `--ink` | `#332b33` | Haupttext |
| `--muted` | `#756773` | Beschriftungen, Unterzeilen, Hinweise |
| `--gallery-tint-1` / `-2` | `#eee3df` / `#e6e4ee` | Platzhalter-Flächen in der Galerie (nur ohne Foto) |
| `--slideshow-bg` | `#1e1a1e` | Diashow (Vorschlag) |
| `--warn` / `--warn-bg` | `#8a4b00` / `#fdf0dc` | Warnungen (Vorschlag, nicht im Mockup) |
| `--danger` | `#a4262c` | Fehler, Löschen (Vorschlag, nicht im Mockup) |

Kontrast (grob gerechnet): `--accent` auf Weiß ≈ 7,8 : 1, `--muted` auf `--surface` ≈ 5,3 : 1. Beides erfüllt WCAG AA (Wahrscheinlich, bitte mit einem Prüfwerkzeug nachmessen).

### 8.2 Typografie

- Überschriften, Markenname, große Zahlen: Serifenschrift. Im Mockup wirkt sie wie Georgia. Georgia ist auf Android nicht vorinstalliert (Wahrscheinlich), deshalb wird **Gelasio** (SIL OFL, metrisch zu Georgia kompatibel) als lokale woff2-Datei im Repo mitgeliefert, mit `Georgia, 'Times New Roman', serif` als Fallback. Siehe D2.
- Fließtext, Beschriftungen, Buttons, Kacheltitel (fett): `system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`.
- Richtwerte bei 390 px Breite (Vermutung, gegen Screenshots abgleichen): Markenname ≈ 28–30 px, Screentitel ≈ 30–32 px, Hero-Titel ≈ 24–26 px, Kacheltitel ≈ 20 px fett, Fließtext 16–17 px, Beschriftungen 15 px, graue Zusatztexte 14 px, Summe im Ergebnis ≈ 48 px.

### 8.3 Form, Abstände, Bedienung

- Radien (Vermutung): Karten ≈ 16–18 px, Hero-Kachel ≈ 18 px, Eingabefelder und Buttons ≈ 14 px, Reiter ≈ 14 px.
- Karten: Hintergrund `--surface`, 1 px Rahmen `--border`, kein ausgeprägter Schatten. Ausnahme: kleine Kerzen-Illustration mit weichem Schatten.
- Eingabefelder und Buttons: mindestens 48 px hoch (Tippziel), Primärbutton ≈ 52 px, Vollbreite.
- Seitenrand ≈ 22 px (5,5 % der Breite), vertikaler Abstand zwischen Blöcken ≈ 16–20 px.
- Reiter: Chips in einer Zeile, bei engem Platz horizontal scrollbar.
- Fokus: sichtbarer Ring in `--accent` (2 px, 2 px Abstand). `prefers-reduced-motion` respektieren.
- Dunkelmodus: nicht in v1.

### 8.4 Icons

Strich-Icons (Stil Lucide, Strichstärke ≈ 1,75), als Inline-SVG im Sprite `icons/sprite.svg` (Lucide steht unter der ISC-Lizenz, Sicher). Benötigt: `flame`, `calculator`, `package-open` (oder `box`), `droplets`, `images`, `folder-down`, `chevron-right`, `arrow-left`, `camera`, `plus`, `play`, `check`, `x`, `trash-2`. Dass das Mockup genau diese Icons nutzt, ist eine Vermutung, der Stil stimmt aber überein.

### 8.5 Komponenten

Kopf, Zurück-Zeile (sticky), Screen-Titel mit Untertitel, Kachel (Hero, Karte, breit), Listenzeile mit Chevron, Reiter-Chips, Feld (Beschriftung oben, Eingabe, Fehlertext), Einheits-Feld (Zahl plus Einheit), Auswahlfeld (natives `<select>` im Stil der Felder), Primärbutton, Sekundärbutton, Textlink, Checkbox und Schalter (Akzentfarbe), Ergebniskarte, Warnbanner und Fehlerbanner, Toast, Bestätigungsdialog und Bottom-Sheet (beide `<dialog>`).

Barrierefreiheit: Beschriftungen mit `<label>`, Ergebnisbereiche mit `aria-live="polite"`, `lang="de"`, Tippziele ≥ 48 px, Icons mit Text oder `aria-label`.

---

## 9. Sicherheit und Datenschutz

- Keine Netzwerkaufrufe zur Laufzeit, keine Tracker, keine externen Schriften oder Skripte.
- Alle Daten und Fotos liegen lokal im Browser (IndexedDB). Das ist auch die einzige Kopie. Deshalb gilt: Datensicherung ist Pflicht-Feature (Abschnitt 6.11).
- Texte aus Nutzereingaben immer als Text einfügen (`textContent`), nie als HTML (kein XSS über Namen).

---

## 10. Tests und Abnahme

### 10.1 Unit-Tests (`node --test`)

Toleranz bei Zahlenvergleichen: `1e-6` für Zwischenwerte, bei angezeigten Werten auf die gezeigte Stellenzahl gerundet. Alle folgenden Zahlen sind per Skript nachgerechnet (**Sicher**).

**AB1 – Mockup-Fall, Kostenrechner, Modus `percent`:** Gesamtgewicht 465 g, Glas leer 195 g, 8 %, Vanille (Dichte 0,95, 0,0318 €/ml), Wachs 13,36 €/kg, Glas 1,80 €, Zubehör 0,59 € (Docht 0,29 + Etikett 0,30).

| Größe | Erwartet |
|---|---|
| Inhalt | 270 g |
| Wachs | 250 g |
| Duftöl | 20 g = 21,05 ml |
| Kosten Wachs / Duft / Glas / Zubehör | 3,34 € / 0,67 € / 1,80 € / 0,59 € |
| Summe | 6,40 € (exakt 6,399474) |
| Verkaufspreis bei 150 % Aufschlag | 16,00 € (exakt 15,9987) |

**AB2 – Kostenrechner, Modus `ml`, zwei Düfte:** 465 g gesamt, Glas 195 g, 12 ml Vanille (0,95 g/ml, 0,0318 €/ml) und 8 ml Karamell (1,00 g/ml, 0,04 €/ml), Wachs 13,36 €/kg, Glas 1,80 €, Zubehör 0,59 €.

| Größe | Erwartet |
|---|---|
| Duftöl gesamt | 19,4 g |
| Wachs | 250,6 g |
| Duftöl-% (abgeleitet) | 7,74 % |
| Massenanteile | 58,76 % / 41,24 % |
| Volumenanteile | 60 % / 40 % |
| Kosten Wachs / Duft / Summe | 3,35 € / 0,70 € / 6,44 € |

**AB2b – Kostenrechner, Modus `percent`, Mischung 60/40, 8 %:** gleiche Daten wie AB2. Wachs 250 g, Duftöl 20 g (Vanille 12 g = 12,63 ml, Karamell 8 g = 8,00 ml), Duftkosten 0,72 €, Summe 6,45 €.

**AB3 – Wachs & Duftrechner, `percent`:** V = 250 ml, Soja 0,90, Vanille 0,95, 8 %. Wachs 209,15 g, Duftöl 16,73 g = 17,61 ml. Volumenprobe `Wachs_g/0,90 + Duft_ml` ergibt 250,000 ml.

**AB3b – `percent`, Mischung 60/40 (Vanille 0,95, Karamell 1,00), V = 250 ml, 8 %:** Wachs 209,44 g, Duftöl 16,76 g (Vanille 10,05 g = 10,58 ml, Karamell 6,70 g = 6,70 ml).

**AB4 – Wachs & Duftrechner, `ml`:** V = 250 ml, 18 ml Vanille. Wachs 208,80 g, Duftöl 17,10 g, abgeleitet 8,19 %.

**AB4b – `ml`, 12 ml Vanille + 8 ml Karamell, V = 250 ml:** Wachs 207,00 g, Duftöl 19,40 g, abgeleitet 9,37 %.

**AB5 – Glasvolumen (Wand 3 mm):**

| Fall | Erwartet |
|---|---|
| rund, Breite 80, Höhe 90 | 374,2 ml |
| konisch, Höhe 90, Ø oben 80, Ø unten 60 | 282,2 ml |
| konisch ohne Ø oben/unten, Breite 80, Höhe 90 | 374,2 ml (Zylindernäherung, Hinweis „grobe Schätzung“) |
| rechteckig 70 × 70 × 80 (Breite × Tiefe × Höhe) | 315,4 ml |
| rechteckig ohne Tiefe | keine Schätzung |
| 75 % Füllung des runden Glases (374,2 ml) | 280,6 ml |

**AB6 – Fehlerfälle (Abschnitt 5.2):** Gesamtgewicht ≤ Leergewicht → Fehler. Glas ohne Leergewicht → Fehler. ml-Modus mit Duftgewicht ≥ Inhalt → Fehler. Fehlender Wachspreis → Ergebnis mit Warnung. Duft-% über Maximum → Warnung. `V_Öl ≥ V` im Wachs & Duftrechner → Fehler.

**AB7 – `slug`:** `Vanillewolke` → `vanillewolke`, `Crème Brûlée` → `creme-brulee`, `Äpfel & Zimt` → `aepfel-zimt`, `  ` → `kerze`, zweimal `Vanille` → `vanille` und `vanille-2`. Reihenfolge der Regeln: zuerst ä/ö/ü/ß ersetzen (ae, oe, ue, ss), dann `normalize('NFD')` und Akzentzeichen entfernen (è → e, û → u), dann alles außer a–z und 0–9 zu `-`.

**AB8 – Zahlen:** `parseDecimal('8,5') = 8.5`, `'8.5' = 8.5`, `' 12 ' = 12`, `'' = null`, `'abc'` und `'1.234,5'` → `NaN`. `formatEuro(1234.5)` ergibt `1.234,50 €` (mit geschütztem Leerzeichen vor dem Euro-Zeichen).

**AB9 – ZIP:** Das erzeugte ZIP lässt sich mit dem eigenen Leser lesen (CRC stimmt, Dateinamen UTF-8, Reihenfolge erhalten). Manuell: `unzip -t` meldet keine Fehler, Windows-Explorer und Android-Dateimanager öffnen es.

**AB10 – Vollständigkeit:** vier Fälle, in denen je eine Bedingung aus 5.5 fehlt, ergeben den jeweils erwarteten Text. Ohne Fehlendes: leere Liste.

### 10.2 Abnahmekriterien (manuell, Android Chrome)

1. Installation über „App installieren“, Start im Vollbild, Icon und Name „Dochtwerk“.
2. Flugmodus: alle Screens, Rechner und Galerie funktionieren.
3. Mockup-Fall AB1 per Hand durchspielen: Anzeige `6,40 €`, Verteilung wie im Mockup.
4. Kerze mit Foto speichern, in der Galerie sehen, in der Diashow wischen, nach Ergänzen von Name, Glas, Duft exportieren, ZIP am Rechner öffnen und `angaben.txt` prüfen.
5. Sicherung erstellen, Daten löschen (Browserdaten), Sicherung wiederherstellen: Kerzen, Materialien und Fotos sind wieder da.
6. Android-Zurück-Taste führt in jedem Screen sinnvoll zurück und beendet die App nur auf dem Start.
7. Komma-Eingabe (`8,5`) funktioniert in allen Zahlenfeldern.
8. Optischer Vergleich mit den sieben Mockups: Farben, Kachelaufbau, Typografie.

---

## 11. Umsetzungsreihenfolge

Jede Etappe ist in sich abgeschlossen, testbar und kann als eigener Commit enden.

| Etappe | Inhalt | Fertig, wenn |
|---|---|---|
| E0 Repo | Neues Repo anlegen, GitHub Pages (`main` / Wurzel) aktivieren, `SPEC.md` nach `docs/`, Mockup-Screenshots nach `docs/mockups/` | Leere Seite ist unter der Pages-Adresse erreichbar |
| E1 Kern | `core/*` (units, pricing, glass-volume, calc-cost, calc-plan, candle, slug, export-text, crc32, zip) mit Tests AB1–AB10 | `npm test` grün |
| E2 Gerüst | `index.html`, Router, Design-Tokens, Kopf, Zurück-Zeile, Start-Screen, Service Worker, Manifest, Icons | Start-Screen entspricht dem Mockup, App installierbar |
| E3 Materialien | Speicher (`store.js`), Materialliste, Detailformulare, Startdaten | Alle vier Materialarten anlegbar, bearbeitbar, löschbar, Einheitspreise und Volumenschätzung sichtbar |
| E4 Rechner | Kostenrechner (Eingabe, Ergebnis, Fehlerfälle, Zubehör), Wachs & Duftrechner mit % und ml, Mehrfach-Duft | AB1–AB4 stimmen in der Oberfläche |
| E5 Fotos und Galerie | `photos.js`, Speichern-Ablauf, Galerie, Kerzen-Detail, manuelles Anlegen, Diashow | Kerze mit Foto speichern, bearbeiten, Diashow |
| E6 Export und Sicherung | Export-Screen, ZIP mit `angaben.txt`, Sicherung und Wiederherstellung, `persist()`, `#/daten` mit Merkzettel | Abnahmekriterien 4 und 5 |
| E7 Feinschliff | Leere Zustände, Meldungstexte, Barrierefreiheit, Offline-Test, Update-Hinweis, Abgleich mit Mockups | alle Abnahmekriterien erfüllt |

---

## 12. Dokumentation im Repo

`README.md` der neuen App kurz halten: Zweck, Installation, Daten und Sicherung, Entwicklung (`npm test`, lokaler Server per `python -m http.server`), Hinweis zur `CACHE_VERSION`, Hinweis „Repo nicht umbenennen, sonst ändert sich die Adresse und installierte Kopien starten ohne ihre Daten“. Außerdem ein Verweis auf das alte Repo `kerzenkalkulator` als unabhängige Vorgängerversion.

---

## 13. Offene Punkte und bewusste Abweichungen

| ID | Punkt |
|---|---|
| D1 | **Sicherung als ZIP statt JSON** (Abweichung von A3). Eine JSON-Sicherung mit Fotos als Base64 würde bei vielen 2000-px-Fotos sehr groß (Wahrscheinlich über 100 MB als einzelner String, speicherintensiv auf dem Handy). Das ZIP aus `state.json` und `fotos/*.jpg` löst das und nutzt denselben ZIP-Code wie der Export. |
| D2 | **Schrift:** Georgia fehlt auf Android (Wahrscheinlich), daher Gelasio als mitgelieferte Datei. Verändert die „keine Abhängigkeiten“-Linie minimal um eine Font-Datei. |
| D3 | **Icons:** Lucide-ähnliche Strich-Icons als Inline-SVG. Die genaue Icon-Wahl des Mockups ist eine Vermutung. |
| D4 | **Startdaten:** Es werden fünf Wachse mit Dichte und Prozentwerten vorgelegt (ohne Preise). Gewünscht war „Neustart“, das ist eine Erleichterung, die sich leicht streichen lässt. |
| D5 | **Gelwachs-Dichte:** 0,82 g/ml stammt aus genau einem Herstellerdatenblatt. Die alte App hatte 0,97 (nicht belegt). Je nach Gelwachs prüfen, das Feld ist editierbar. |
| D6 | **Mockup-Beispieldaten sind nicht konsistent:** „Dessertglas 250“ mit 80 × 90 mm ergibt rechnerisch ≈ 374 ml, und 270 g Inhalt entsprechen ≈ 299 ml. Die Mockup-Daten sind reine Illustration und taugen nur als Gewichtsbeispiel (AB1), nicht als Volumen-Testdaten. |
| D7 | **Anteilsbasis im ZIP:** im ml-Modus Volumenanteil (wie eingegeben), im Prozent-Modus Massenanteil (wie eingegeben). Die Unterschiede sind bei ähnlichen Dichten klein, aber vorhanden (AB2: 58,76 % Masse gegenüber 60 % Volumen). |
| D8 | **Neues Repo, danach nicht mehr umbenennen.** Ein geänderter Repo-Name ändert die Adresse (Origin) und damit den Speicher, installierte Kopien starten dann leer. Repo-Name und App-Name „Dochtwerk“ dürfen verschieden sein, der App-Name steht nur in Manifest und Oberfläche. |
| D9 | Warn- und Fehlerfarben (`--warn`, `--danger`) sind nicht aus dem Mockup, sondern Vorschläge. |
| D10 | Zurück-Zeile klebt oben (Auslegung von „oben immer eine Zurück-Möglichkeit“). Mockups zeigen sie nicht klebend. |
| D11 | `navigator.storage.persist()` wird nicht in jedem Fall gewährt. Es gibt keinen Mechanismus, das zu erzwingen. Die Sicherung bleibt die einzige echte Absicherung. |
| D12 | Maße und Schriftgrößen in Abschnitt 8 sind aus Screenshots geschätzt (Vermutung). Maßgeblich ist der optische Abgleich. |
| D13 | Kerzen ohne Duft lassen sich rechnen und speichern, sind aber nicht exportierbar (Q3b verlangt mindestens einen Duft). |
| D14 | Höchstens 4 Düfte je Kerze (Vermutung, dass das reicht). |

---

## 14. Quellen für Dichten und Mengenangaben

Recherchiert am 2026-11-05. Zwei Primärquellen (Herstellerdatenblätter), die übrigen sind Sekundärquellen. Deshalb sind alle Dichten editierbar.

| Quelle | Aussage |
|---|---|
| [Rapswachs-Datenblatt, Distrebution (D10238)](https://www.distrebution.com/media/pdf/45/64/84/D10238_Rapswachs_EN.pdf) | Dichte ca. 0,90 g/ml bei 20 °C, Erstarrungspunkt 52–56 °C. Primärquelle. |
| [Gelwachs-Datenblatt, Distrebution (D10412)](https://www.distrebution.com/media/pdf/25/ca/85/D10412_Gelwachs_EN.pdf) | Dichte ca. 0,82 g/ml bei 20 °C, keine Duftempfehlung. Primärquelle, gilt für dieses Produkt. |
| [Craftybase: Fragrance load berechnen](https://craftybase.com/blog/handmade-success/how-to-calculate-fragrance-load-when-making-candles) | Duftlast bezieht sich auf das Wachsgewicht. Typische Duftlast Soja 10–12 %, Paraffin 6–10 %, Kokos 10–12 %, Soja-Kokos 10–12 %, Raps 8–10 %. Dichten Soja 0,90, Paraffin 0,86–0,90, Kokos 0,90, Soja-Kokos 0,90, Raps 0,90. Sekundärquelle. |
| [Craftybase: Gramm in ml](https://craftybase.com/blog/grams-to-ml-conversion-guide-for-makers) | Flüssige Dichten Soja 0,900, Paraffin 0,880–0,915, Kokos 0,924. Duftöl 0,900–1,050, Arbeitswert 0,95, genauer Wert laut Sicherheitsdatenblatt. Sekundärquelle. |
| [Referenztabelle Wachsdichten](https://rewaxguide-com.pages.dev/reference/tables) | Paraffin 0,900–0,915 g/cm³ bei 25 °C (Wahrscheinlich Festzustand). Sekundärquelle. |
| [Wikipedia: Soy candle](https://en.wikipedia.org/wiki/Soy_candle) | Sojawachs ca. 0,9 g/ml. |
| [BrambleBerry: Kokos-Soja-Wachs](https://www.brambleberry.com/shop-by-product/waxes/coconut-soy-candle-wax/V900169.html) | Herstellerempfehlung höchstens 10 % Duftöl. Zeigt, dass das Maximum je Hersteller und Produkt abweicht, deshalb ist es pro Wachs editierbar. |
