# Blechpartie – Webseite

Statische Webseite für **Blechpartie – Das Original** (blechpartie.de), gehostet auf Netlify. Die Seite liegt in `public/`, der Instagram-Feed läuft über Netlify-Funktionen in `netlify/`.

## Farben

| Name | HEX | RGB | CMYK |
|---|---|---|---|
| Blechpartie Petrol | `#2F6F73` | 47 / 111 / 115 | 79 / 35 / 45 / 23 |

Alle Farben stehen als Variablen oben in `public/css/style.css`.

## Inhalte pflegen

| Was | Wo |
|---|---|
| Termine | `public/data/termine.json` plus automatisch aus Konzertmeister (siehe unten) – vergangene Termine werden ausgeblendet |
| Texte, Besetzung | `public/index.html` (Stellen mit `TODO` markiert) |
| Fotos | nach `public/img/galerie/` legen und in `public/index.html` im Bereich „Galerie“ eintragen |
| Videos | YouTube-ID in `data-youtube="…"` eintragen (wird erst nach Klick geladen) |
| Impressum / Datenschutz | `public/impressum.html`, `public/datenschutz.html` |

Beispiel-Termin:

```json
{ "datum": "2026-11-14", "uhrzeit": "19:00", "titel": "Wirtshausmusik", "ort": "Gasthaus XY, Ort", "link": "" }
```

## Logos

`public/img/logo-weiss.svg` und `public/img/logo-petrol.svg` sind aus der Vektor-Datei des Logos erzeugt.

## Lokal ansehen

```sh
cd public && python3 -m http.server 8000
```

(Der Instagram-Bereich zeigt lokal nur den Link – die Beiträge kommen erst auf Netlify.)

Dann <http://localhost:8000> öffnen.

## Kontaktformular

Das Formular nutzt [Netlify Forms](https://docs.netlify.com/forms/setup/). Nach dem ersten Deploy im Netlify-Dashboard unter *Forms → Form notifications* eine E-Mail-Benachrichtigung einrichten.

## Instagram-Feed einrichten

Die Funktion `netlify/functions/instagram-sync.mjs` holt stündlich die 9 neuesten Beiträge über die offizielle Instagram-API und speichert Daten und Bilder in Netlify Blobs. `netlify/functions/instagram.mjs` liefert sie unter `/api/instagram` aus. Besucher laden dadurch nichts direkt von Instagram.

Einmalige Einrichtung:

1. **Instagram-Konto prüfen:** In der Instagram-App unter *Einstellungen → Kontotyp und Tools* muss es ein **Business-** oder **Creator-Konto** sein.
2. **Meta-App anlegen:** Auf <https://developers.facebook.com/apps> eine neue App erstellen, Anwendungsfall *Nachrichten und Inhalte auf Instagram verwalten* (Instagram API mit Instagram-Login).
3. **Token erzeugen:** In der App unter *API-Einrichtung mit Instagram-Login* das Konto @blechpartie hinzufügen und einen **Zugriffstoken generieren** (Berechtigung `instagram_business_basic`).
4. **Token bei Netlify hinterlegen:** *Site configuration → Environment variables →* `INSTAGRAM_TOKEN` = der erzeugte Token. Danach neu deployen.

Der Token gilt 60 Tage und wird von der Funktion automatisch verlängert. Falls der Feed doch einmal leer bleibt, einfach einen neuen Token erzeugen und `INSTAGRAM_TOKEN` ersetzen. Ohne Token zeigt die Seite nur den Link zu Instagram.

## Termine aus Konzertmeister

`netlify/functions/termine.mjs` liest den Konzertmeister-Kalender (iCal) und liefert unter `/api/termine` nur Termine, in denen „Blechpartie“ vorkommt (Titel, Kategorie, Veranstalter oder Beschreibung). Interne Termine wie Proben und abgesagte Termine werden ausgeblendet; übernommen werden nur Datum, Uhrzeit, Titel und Ort. Die Seite zeigt sie zusammen mit `data/termine.json` an, steht an einem Tag schon ein Eintrag in `data/termine.json`, hat dieser Vorrang und der Konzertmeister-Termin wird nicht zusätzlich gezeigt.

Einrichtung: In Netlify unter *Project configuration → Environment variables* die Variable `KONZERTMEISTER_ICAL_URL` mit dem iCal-Link aus Konzertmeister anlegen. Der Link ist privat und gehört **nicht** ins Repository. Optional: `KONZERTMEISTER_FILTER` ändert den Suchbegriff (Standard: `Blechpartie`).
