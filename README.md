# Blechpartie – Webseite

Statische Webseite für **Blechpartie – Das Original** (blechpartie.de). Kein Build-Schritt nötig, gehostet auf Netlify.

## Farben

| Name | HEX | RGB | CMYK |
|---|---|---|---|
| Blechpartie Petrol | `#2F6F73` | 47 / 111 / 115 | 79 / 35 / 45 / 23 |

Alle Farben stehen als Variablen oben in `css/style.css`.

## Inhalte pflegen

| Was | Wo |
|---|---|
| Termine | `data/termine.json` – vergangene Termine werden automatisch ausgeblendet |
| Texte, Besetzung | `index.html` (Stellen mit `TODO` markiert) |
| Fotos | nach `img/galerie/` legen und in `index.html` im Bereich „Galerie“ eintragen |
| Videos | YouTube-ID in `data-youtube="…"` eintragen (wird erst nach Klick geladen) |
| Impressum / Datenschutz | `impressum.html`, `datenschutz.html` |

Beispiel-Termin:

```json
{ "datum": "2026-11-14", "uhrzeit": "19:00", "titel": "Wirtshausmusik", "ort": "Gasthaus XY, Ort", "link": "" }
```

## Logos

`img/logo-weiss.svg` und `img/logo-petrol.svg` sind aus der Vektor-Datei des Logos erzeugt.

## Lokal ansehen

```sh
python3 -m http.server 8000
```

Dann <http://localhost:8000> öffnen.

## Kontaktformular

Das Formular nutzt [Netlify Forms](https://docs.netlify.com/forms/setup/). Nach dem ersten Deploy im Netlify-Dashboard unter *Forms → Form notifications* eine E-Mail-Benachrichtigung einrichten.
