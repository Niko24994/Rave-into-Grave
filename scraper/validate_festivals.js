#!/usr/bin/env node
/**
 * Rave into Grave — Daten-Validierung
 *
 * Prueft data/festivals.js auf die Art von Fehlern, die diese Saison bisher
 * nur durch Zufall/Nutzer-Screenshots aufgefallen sind: falsche Koordinaten
 * (Third Eye Festival landete in Schweden), Duplikat-Splits (Unreal XXL wurde
 * fuer denselben Junkyard-Dortmund-Termin zweimal unter der Koeln-Adresse
 * gespeichert), leere Pflichtfelder (Tfeld ohne URL, Rheingruen/Docklands ohne
 * Beschreibung).
 *
 * Bricht NICHTS ab — gibt nur Warnungen auf der Konsole aus, damit sie im
 * taeglichen GitHub-Action-Log sichtbar sind, bevor sie zu einem sichtbaren
 * Bug auf der Website werden.
 *
 * Nutzung: node scraper/validate_festivals.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function loadFestivals() {
  const src = fs.readFileSync(path.join(ROOT, 'data', 'festivals.js'), 'utf-8');
  const match = src.match(/const festivals = (\[[\s\S]*?\]);/);
  return JSON.parse(match[1]);
}

// Grobe Deutschland-Bounding-Box. Ein paar Festivals liegen bewusst im
// nahen Ausland (Verknipt Amsterdam, Awakenings NL) — die stehen deshalb
// auf der Ausnahmeliste statt bei jedem Lauf erneut aufzufallen.
const DE_BOUNDS = { latMin: 47.2, latMax: 55.2, lngMin: 5.8, lngMax: 15.2 };
// baseName() entfernt Leerzeichen mit, die Eintraege hier muessen also
// ebenfalls ohne Leerzeichen geschrieben werden (z.B. "verkniptamsterdam").
const KNOWN_FOREIGN = new Set([
  'verkniptamsterdam',
  'awakeningsfestival',
]);

// Festivals ohne eigene Website (siehe NO_WEBSITE_YET in fetch_festivals.js) —
// leere URL ist hier kein Fehler, sondern Absicht.
const KNOWN_NO_URL = new Set([
  'solemfestival',
]);

function baseName(name) {
  return name.toLowerCase().replace(/\d{4}/g, '').replace(/[^a-z]/g, '').trim();
}

function main() {
  const festivals = loadFestivals();
  const warnings = [];

  festivals.forEach((f) => {
    const label = `${f.name} (${f.date})`;
    const base = baseName(f.name);

    if (!f.name || !f.date || !f.location) {
      warnings.push(`FEHLENDE PFLICHTFELDER: ${label}`);
    }
    if (!Array.isArray(f.genre) || f.genre.length === 0) {
      warnings.push(`KEIN GENRE: ${label}`);
    }
    if (!f.description || !f.description.trim()) {
      warnings.push(`LEERE BESCHREIBUNG: ${label}`);
    }
    if ((f.url === undefined || f.url === '') && !KNOWN_NO_URL.has(base)) {
      warnings.push(`URL LEER/FEHLT: ${label}`);
    }
    if (typeof f.lat !== 'number' || typeof f.lng !== 'number') {
      warnings.push(`KOORDINATEN FEHLEN: ${label}`);
    } else {
      const inBounds = f.lat >= DE_BOUNDS.latMin && f.lat <= DE_BOUNDS.latMax &&
                        f.lng >= DE_BOUNDS.lngMin && f.lng <= DE_BOUNDS.lngMax;
      if (!inBounds && !KNOWN_FOREIGN.has(base)) {
        warnings.push(`KOORDINATEN AUSSERHALB DEUTSCHLANDS (evtl. falsch): ${label} -> lat=${f.lat}, lng=${f.lng}`);
      }
    }
  });

  // Exakte Name+Datum-Duplikate
  const seenKey = new Set();
  festivals.forEach((f) => {
    const key = f.name.toLowerCase() + '|' + f.date;
    if (seenKey.has(key)) {
      warnings.push(`EXAKTES DUPLIKAT: "${f.name}" (${f.date}) kommt mehrfach vor`);
    }
    seenKey.add(key);
  });

  // Gleicher Basisname (Jahr/Edition ignoriert), Daten nah beieinander
  // (<=3 Tage), aber unterschiedliche Location -> vermutlich derselbe Termin
  // faelschlich doppelt gespeichert (Muster des Unreal-XXL-Bugs).
  const byBase = new Map();
  festivals.forEach((f) => {
    const b = baseName(f.name);
    if (!byBase.has(b)) byBase.set(b, []);
    byBase.get(b).push(f);
  });
  byBase.forEach((group) => {
    if (group.length < 2) return;
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i], b = group[j];
        const diffDays = Math.abs(new Date(a.date) - new Date(b.date)) / 86400000;
        if (diffDays <= 3 && a.location !== b.location) {
          warnings.push(
            `MOEGLICHER DUPLIKAT-SPLIT: "${a.name}" (${a.date}, ${a.location}) vs. ` +
            `"${b.name}" (${b.date}, ${b.location}) — selber Basisname, Termine nah ` +
            `beieinander, aber unterschiedliche Locations`
          );
        }
      }
    }
  });

  // Unterschiedliche Namen, aber identisches Datum + Location -> vermutlich
  // ein Scraping-Bug (z.B. Venue-Seite falsch zugeordnet).
  const byDateLoc = new Map();
  festivals.forEach((f) => {
    const key = f.date + '|' + f.location.toLowerCase();
    if (!byDateLoc.has(key)) byDateLoc.set(key, []);
    byDateLoc.get(key).push(f.name);
  });
  byDateLoc.forEach((names, key) => {
    const uniqueBases = new Set(names.map(baseName));
    if (names.length > 1 && uniqueBases.size > 1) {
      warnings.push(`GLEICHES DATUM+ORT, UNTERSCHIEDLICHE NAMEN: ${key} -> ${names.join(' / ')}`);
    }
  });

  console.log(`\n🔍 Daten-Check: ${festivals.length} Festivals geprueft.\n`);
  if (warnings.length === 0) {
    console.log('✅ Keine Auffaelligkeiten gefunden.');
  } else {
    console.log(`⚠️  ${warnings.length} Auffaelligkeit(en):\n`);
    warnings.forEach((w) => console.log('  - ' + w));
  }
}

main();
