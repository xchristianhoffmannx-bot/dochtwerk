# Dochtwerk

Installierbare Android-App (PWA) für Kerzenbau: Materialkosten berechnen, Materialien verwalten, Kerzen-Galerie mit Fotos, Export als ZIP, Sicherung. Alles läuft offline, ohne Server und ohne Tracker.

Spezifikation: `docs/SPEC.md`, Mockups: `docs/mockups/`.

## Installieren

1. <https://xchristianhoffmannx-bot.github.io/dochtwerk/> in Chrome auf dem Handy öffnen.
2. Menü → „App installieren“ (oder „Zum Startbildschirm hinzufügen“).
3. Einmal online starten, danach funktioniert die App im Flugmodus.

## Daten und Sicherung

Alle Daten (Materialien, Kerzen, Fotos) liegen nur im Browser-Speicher des Geräts (IndexedDB). Wer die App-Daten löscht oder das Handy wechselt, verliert sie. Deshalb unter „Sichern & Hinweise“ regelmäßig ein ZIP sichern; dort lässt es sich auch wiederherstellen. „Kerzen exportieren“ erzeugt ein anderes ZIP (Seitenfotos + Angaben fürs Etikett), das ist keine Sicherung.

## Entwicklung

```bash
npm test                      # node --test, kein Build, keine Abhängigkeiten
python -m http.server 8090    # dann http://localhost:8090
```

- Reines HTML/CSS/JS (ES-Module), kein Bundler.
- **`CACHE_VERSION` in `sw.js` bei jeder Änderung an ausgelieferten Dateien hochzählen** und neue Dateien in `FILES` eintragen (ein Test prüft die Module). Sonst sehen installierte Kopien die alte Version. Beim Testen im Browser alte Service Worker und Caches löschen.
- Neue Versionen erscheinen beim Nutzer als Hinweis „Neue Version verfügbar“ mit Button „Neu laden“.

## Hinweise

- **Repo nicht umbenennen:** Die GitHub-Pages-Adresse und damit die installierte App hängen am Repo-Namen.
- Vorgänger: kerzenkalkulator (altes Repo, wird nicht mehr weiterentwickelt).
- Schrift Gelasio (SIL OFL, siehe `fonts/OFL.txt`), Icons im Stil von Lucide (ISC).
