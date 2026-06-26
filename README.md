# ☠️⚡ RAVE INTO GRAVE

**Kein Techno- oder Hard Techno Festival in Deutschland mehr verpassen. Oder sterben es versuchend.**

Ein schlichter, düsterer Festival-Tracker für die deutsche Techno/Hard Techno Szene — brutalistisches Design, keine Werbung, kein Bullshit.

---

## Was ist Rave into Grave?

Eine statische Website die alle relevanten Techno, Hard Techno, Schranz, Hardcore und Hardstyle Festivals in Deutschland auf einen Blick zeigt — mit Countdowns, Genre-Filter, Suche und direktem Link zur offiziellen Festival-Website.

**Features:**
- Echtzeit-Countdown bis zum nächsten Event
- Genre-Filter (Techno / Hard Techno / Schranz / Hardstyle / Hardcore / Trance)
- Textsuche nach Name & Ort
- Monatsfilter
- Status-Indikatoren: Bevorstehend / Bald / Ausverkauft / Vergangen
- Vergangene Festivals werden ausgeblendet (aufklappbar)
- Düsteres Rave-Design mit Glitch-Effekt und Scanlines

---

## Festival melden / Fehler korrigieren

Fehlendes Festival entdeckt? Falsches Datum? Bitte ein [GitHub Issue öffnen](https://github.com/Niko24994/Rave-into-Grave/issues/new) mit:
- Festivalname
- Datum & Ort
- Offizielle Website
- Genre(s)

Alternativ direkt einen Pull Request mit Änderungen in `data/festivals.js` einreichen.

---

## Daten aktualisieren (Scraper)

Der Scraper lädt automatisch Festival-Daten von mehreren Quellen und schreibt sie nach `data/festivals.js`.

**Voraussetzungen:** Node.js 18+

```bash
cd scraper
npm install
node fetch_festivals.js
```

Oder via npm script:

```bash
cd scraper
npm run scrape
```

**Hinweis:** Scraper-Quellen ändern ihr HTML-Markup gelegentlich. Falls keine Daten gefunden werden, bitte die Scraper-Funktionen in `fetch_festivals.js` anpassen. Die bestehende `festivals.js` wird bei 0 Treffern **nicht** überschrieben.

---

## GitHub Pages Deployment

1. Repository auf GitHub pushen
2. In den Repository-Einstellungen → **Pages** → Source: **Deploy from a branch**
3. Branch: `main` / Root: `/ (root)` → **Save**
4. Nach wenigen Minuten ist die Seite live unter `https://<dein-username>.github.io/<repo-name>/`

Alternativ: Alle Dateien in einen `/docs`-Ordner legen und in den Pages-Einstellungen `/docs` als Root wählen.

---

## Projektstruktur

```
.
├── index.html              # Hauptseite (öffne direkt im Browser)
├── style.css               # Styling — brutalistisches Rave-Design
├── data/
│   └── festivals.js        # Festival-Daten (JS-Modul, manuell oder via Scraper)
├── scraper/
│   ├── fetch_festivals.js  # Node.js Scraper
│   └── package.json        # Scraper-Abhängigkeiten
└── README.md
```

Die Website funktioniert direkt durch Öffnen von `index.html` im Browser — kein Server, kein Build-Step nötig.

---

## Lizenz

MIT — mach damit was du willst, aber schreib nicht ab ohne Credit.

---

*☠️ Für alle, die lieber im Dreck tanzen als auf dem Sofa sitzen.*
