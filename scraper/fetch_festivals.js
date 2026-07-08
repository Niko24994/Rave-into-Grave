#!/usr/bin/env node
/**
 * Rave into Grave — Festival Scraper
 *
 * Strategie:
 * 1. Bestehende festivals.js laden (nie überschreiben!)
 * 2. BEKANNTE SEITEN: Offizielle Websites der vorhandenen Festivals täglich prüfen
 *    → Neue Daten/Editionen → automatisch hinzufügen
 * 3. ENTDECKUNG: Listing-Seiten nach komplett neuen Festivals absuchen
 * 4. Nur wirklich neue Events ergänzen — alle manuellen Einträge bleiben erhalten
 *
 * Datumsfelder in festivals.js:
 *   date      = ERSTER Tag des Festivals (bei eintägigen Events der einzige Tag)
 *   endDate   = LETZTER Tag, nur bei mehrtägigen Festivals gesetzt
 * Dieser Scraper legt automatisch nur eintägige Events an (date = einziger Tag,
 * kein endDate nötig). Mehrtägige Festivals werden bisher manuell in
 * festivals.js gepflegt — dabei immer date=Start und endDate=Ende setzen,
 * nicht umgekehrt (das hat in der Vergangenheit zu falschen Einträgen geführt).
 */

import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FESTIVALS_PATH = path.resolve(__dirname, '../data/festivals.js');

const DAYS_AHEAD = 400;
const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);
const CUTOFF = new Date(TODAY);
CUTOFF.setDate(TODAY.getDate() + DAYS_AHEAD);

// ─────────────────────────────────────────────────────────────────────────────
// HTTP
// ─────────────────────────────────────────────────────────────────────────────

async function fetchPage(url, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      if (attempt === retries) {
        console.warn(`  ⚠️  ${url}: ${err.message}`);
        return null;
      }
      await new Promise(r => setTimeout(r, 1500));
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BESTEHENDE FESTIVALS LADEN
// ─────────────────────────────────────────────────────────────────────────────

async function loadExistingFestivals() {
  try {
    const fileUrl = new URL(`file:///${FESTIVALS_PATH.replace(/\\/g, '/')}`);
    fileUrl.searchParams.set('v', Date.now());
    const mod = await import(fileUrl.href);
    const list = mod.default || [];
    console.log(`📂 ${list.length} bestehende Einträge geladen.`);
    return list;
  } catch (err) {
    console.warn('⚠️  festivals.js konnte nicht geladen werden:', err.message);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DATUMS-EXTRAKTION
// ─────────────────────────────────────────────────────────────────────────────

const MONTH_DE = {
  jan: '01', feb: '02', mär: '03', mar: '03', apr: '04', mai: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', okt: '10', oct: '10', nov: '11', dez: '12', dec: '12'
};

function extractFutureDates(text) {
  const dates = new Set();
  // Ordinalsuffixe entfernen: "13th" → "13", "1st" → "1" usw.
  const clean = text.replace(/\s+/g, ' ').replace(/\b(\d{1,2})(st|nd|rd|th)\b/gi, '$1');

  // DD.MM.YYYY oder DD/MM/YYYY
  for (const m of clean.matchAll(/\b(\d{1,2})[.\/](\d{1,2})[.\/](202[6-9]|20[3-9]\d)\b/g)) {
    const iso = `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
    if (isValidFutureDate(iso)) dates.add(iso);
  }

  // DD. Monat YYYY (deutsch) — trailing \b → (?!\d) weil Wix-Seiten Jahr+Text ohne Leerzeichen zusammenkleben
  // Auch ohne Punkt: "3 Juli, 2027" (wie auf 44labelgroup.events)
  for (const m of clean.matchAll(/\b(\d{1,2})\.?\s*(Jan|Feb|Mär|Mar|Apr|Mai|Jun|Jul|Aug|Sep|Okt|Oct|Nov|Dez|Dec)\w*\.?,?\s*(202[6-9]|20[3-9]\d)(?!\d)/gi)) {
    const mon = MONTH_DE[m[2].toLowerCase().slice(0, 3)];
    if (!mon) continue;
    const iso = `${m[3]}-${mon}-${m[1].padStart(2,'0')}`;
    if (isValidFutureDate(iso)) dates.add(iso);
  }

  // YYYY-MM-DD
  for (const m of clean.matchAll(/\b(202[6-9]|20[3-9]\d)-(\d{2})-(\d{2})\b/g)) {
    const iso = `${m[1]}-${m[2]}-${m[3]}`;
    if (isValidFutureDate(iso)) dates.add(iso);
  }

  // Month DD, YYYY (englisch)
  for (const m of clean.matchAll(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{1,2}),?\s+(202[6-9]|20[3-9]\d)(?!\d)/gi)) {
    const mon = MONTH_DE[m[1].toLowerCase().slice(0, 3)];
    if (!mon) continue;
    const iso = `${m[3]}-${mon}-${m[2].padStart(2,'0')}`;
    if (isValidFutureDate(iso)) dates.add(iso);
  }

  return [...dates];
}

function isValidFutureDate(iso) {
  try {
    const d = new Date(iso);
    return d >= TODAY && d <= CUTOFF;
  } catch { return false; }
}

// ─────────────────────────────────────────────────────────────────────────────
// TEIL 1 — BEKANNTE FESTIVAL-WEBSITES ÜBERWACHEN
// Lädt die offizielle Seite jedes bekannten Festivals und sucht nach
// neuen Datum-Ankündigungen für Folge-Editionen.
// ─────────────────────────────────────────────────────────────────────────────

// Domains die NICHT gescrapt werden sollen
// → Ticket-Dienste (single-event-Links), Venues mit wöchentlichem Programm
const SKIP_DOMAINS = new Set([
  'eventbrite.de', 'eventbrite.com', 'eventbrite.nl',
  'ra.co',
  'holypriest.os.fan',
  // Ticket-Plattformen: listen viele Events auf einmal → Falsch-Treffer
  'ticket.io',
  // Venues mit dichtem Wochenprogramm: jede Veranstaltung heißt z.B. "Faceless Presents: …"
  // → führt zu hunderten Falsch-Treffern. Neue jährliche Events werden manuell ergänzt.
  'turbinenhalle.de',
  'westfalenhallen.de',
  'maimarkthalle.de',
  // Event-Homepage listet alle 44-Events inkl. internationale → nur via scrape44LabelGroup
  '44labelgroup.events',
  // Allgemeine Startseite zeigt auch internationale Editionen (Spanien, Mexiko etc.) —
  // wurden fälschlich als weitere Mannheim-Termine gespeichert. Wird stattdessen über
  // die dedizierte scrapeTimeWarpMannheim()-Quelle (Discovery, s.u.) sicher geprüft.
  'time-warp.de',
  // Seite listet mehrere unterschiedliche PollerWiesen-Events (Opening, Boat, Hauptfestival
  // in Dortmund) — Gefahr von Verwechslungen wie beim Hexon-Bug. Neue Termine manuell ergänzen.
  'pollerwiesen.org',
  // Stadtweites Multi-Venue-Format mit vielen Einzel-Terminen → hohes Risiko für Falsch-Treffer.
  'theaos.de',
  // Org-Website mit diversen Event-Typen (Afterpartys, Cleanup-Days etc.), nicht nur die Parade.
  'ravetheplanet.com',
]);

// Domains die eine VENUE sind mit strukturiertem Kalender —
// hier gezielt nach dem vollen Festival-Namen im Kontext suchen
const VENUE_DOMAINS = new Set([
  'lokschuppen-bielefeld.de',
]);

// Kalender-Seite für Venue-Domains (wenn abweichend von der Festival-URL)
const VENUE_CALENDAR_URL = {
  'turbinenhalle.de':  'https://www.turbinenhalle.de/programm/',
  'westfalenhallen.de':'https://www.westfalenhallen.de/veranstaltungen/',
  // Preregistration-Seite zeigt naechste Edition mit Datum
  'hive-festival.de':  'https://www.hive-festival.de/en/hive27-preregistration',
  // /festival-Unterseite zeigt nur den einen echten Termin, keine Nebendaten
  // (die allgemeine Startseite enthielt z.B. eine Ticket-Deadline, die als
  // weitere Edition fehlinterpretiert wurde)
  'electric-horizon.com': 'https://www.electric-horizon.com/festival',
};

function getDomain(url) {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch { return null; }
}

function shouldSkipUrl(url) {
  if (!url) return true;
  const domain = getDomain(url);
  if (!domain) return true;
  // Prüfe domain UND alle übergeordneten Domains (z.B. de.ra.co → ra.co)
  return SKIP_DOMAINS.has(domain) || [...SKIP_DOMAINS].some(s => domain.endsWith('.' + s));
}

function getCheckUrl(fest) {
  const domain = getDomain(fest.url);
  if (VENUE_CALENDAR_URL[domain]) return VENUE_CALENDAR_URL[domain];
  return fest.url.startsWith('http') ? fest.url : null;
}

// Match-Schlüssel für Venue-Seiten: erste zwei Inhaltswörter des Festival-Namens
// "HEXON FESTIVAL #2 2026" → "hexon festival"
// "FACELESS OPEN AIR 2026" → "faceless open air"
function shortMatchKey(name) {
  return name.toLowerCase()
    .replace(/\d{4}/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(w => w.length > 1 || /^\d$/.test(w))
    .join(' ');
}

async function monitorKnownFestivalSites(existing) {
  console.log('\n── Teil 1: Bekannte Festival-Websites überwachen ──');
  const found = [];
  const existingKeys = new Set(existing.map(f => nameKey(f.name) + f.date));

  // Gruppiere Festivals nach der URL die gecheckt werden soll
  // (mehrere Festivals können dieselbe Venue-URL teilen)
  const byCheckUrl = new Map();
  for (const fest of existing) {
    if (shouldSkipUrl(fest.url)) continue;
    const checkUrl = getCheckUrl(fest);
    if (!checkUrl) continue;
    if (!byCheckUrl.has(checkUrl)) byCheckUrl.set(checkUrl, []);
    byCheckUrl.get(checkUrl).push(fest);
  }

  for (const [checkUrl, festivals] of byCheckUrl) {
    const domain = getDomain(checkUrl);
    const isVenue = VENUE_DOMAINS.has(domain);
    process.stdout.write(`  ▶ ${domain}${isVenue ? ' [venue]' : ''} … `);
    const html = await fetchPage(checkUrl);
    if (!html) { console.log('⚠️  kein Inhalt'); continue; }

    const $ = cheerio.load(html);
    $('nav, footer, script, style, .cookie-banner').remove();

    let newForThisPage = 0;

    if (!isVenue) {
      // ── OFFIZIELLE FESTIVAL-SEITE ──
      // Alle zukünftigen Daten auf der Seite = potentielle neue Editionen
      const pageText = $.text();
      const futureDates = extractFutureDates(pageText);
      for (const date of futureDates) {
        for (const knownFest of festivals) {
          const newYear = date.slice(0, 4);
          if (parseInt(newYear) < parseInt(knownFest.date.slice(0, 4))) continue;
          const key = nameKey(knownFest.name) + date;
          if (existingKeys.has(key)) continue;
          existingKeys.add(key);
          const newName = buildNewEditionName(knownFest.name, newYear);
          found.push(buildEditionEntry(knownFest, newName, date, checkUrl));
          newForThisPage++;
        }
      }

    } else {
      // ── VENUE-SEITE ──
      // Nur Blöcke scrapen, die den Festival-Namen enthalten
      // Jedes DOM-Element (li, tr, article, .event) separat prüfen
      $('li, tr, article, .event, [class*="event"], [class*="programm"], [class*="show"], p').each((_, el) => {
        const blockText = $(el).text();
        const blockLower = blockText.toLowerCase();
        for (const knownFest of festivals) {
          const matchKey = shortMatchKey(knownFest.name);
          if (!blockLower.includes(matchKey)) continue;
          const dates = extractFutureDates(blockText);
          for (const date of dates) {
            const newYear = date.slice(0, 4);
            if (parseInt(newYear) < parseInt(knownFest.date.slice(0, 4))) continue;
            const key = nameKey(knownFest.name) + date;
            if (existingKeys.has(key)) continue;
            existingKeys.add(key);
            const newName = buildNewEditionName(knownFest.name, newYear);
            found.push(buildEditionEntry(knownFest, newName, date, checkUrl));
            newForThisPage++;
          }
        }
      });
    }

    console.log(newForThisPage > 0 ? `✅ ${newForThisPage} neu` : '–');
  }

  return found;
}

function buildNewEditionName(existingName, newYear) {
  // Ersetze Jahreszahl oder hänge sie an
  if (/\d{4}/.test(existingName)) {
    return existingName.replace(/\d{4}/, newYear).toUpperCase();
  }
  return `${existingName} ${newYear}`.toUpperCase();
}

function buildEditionEntry(knownFest, newName, date, sourceUrl) {
  return {
    name: newName,
    date,
    dateDisplay: formatDate(date),
    location: knownFest.location,
    genre: knownFest.genre,
    url: knownFest.url,
    soldOut: false,
    description: knownFest.description.replace(/\d{4}/g, date.slice(0, 4)),
    _source: sourceUrl,
    _auto: true
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// TEIL 2 — ENTDECKUNGS-SCRAPERS (Listing-Seiten für neue, unbekannte Festivals)
// ─────────────────────────────────────────────────────────────────────────────

const DISCOVERY_SOURCES = [
  // Listing-Seiten DE
  { name: 'hardtours.de',                    url: 'https://www.hardtours.de/festivals',                                        fn: scrapeHardtours },
  { name: 'festivalticker.de (electronic)',  url: 'https://www.festivalticker.de/festivals/genre/elektronische_festivals/',     fn: scrapeFestivalTicker },
  { name: 'dein-festival.de (techno 26)',    url: 'https://www.dein-festival.de/festivals/techno-festivals-2026',              fn: scrapeDeinFestival },
  { name: 'dein-festival.de (techno 27)',    url: 'https://www.dein-festival.de/festivals/techno-festivals-2027',              fn: scrapeDeinFestival },
  { name: 'dein-festival.de (hard techno)',  url: 'https://www.dein-festival.de/festivals/hard-techno-festivals',             fn: scrapeDeinFestival },
  { name: 'dein-festival.de (hardcore)',     url: 'https://www.dein-festival.de/festivals/hardcore-festivals',                fn: scrapeDeinFestival },
  { name: 'eventbrite.de (techno festival)', url: 'https://www.eventbrite.de/d/germany/techno-festival/',                     fn: scrapeEventbrite },
  { name: 'eventbrite.de (hard techno)',     url: 'https://www.eventbrite.de/d/germany/hard-techno-festival/',                fn: scrapeEventbrite },
  { name: 'eventbrite.de (open air NRW)',    url: 'https://www.eventbrite.de/d/germany--north-rhine-westphalia/techno-open-air/', fn: scrapeEventbrite },
  // Festival-Aggregatoren — decken viele Festivals auf einmal ab
  { name: 'festivalsunited.com (DE)',        url: 'https://www.festivalsunited.com/festivals/countries/germany',              fn: scrapeFestivalsUnited },
  { name: 'festival-alarm.com (DE 2026)',    url: 'https://www.festival-alarm.com/Festivals-2026',                           fn: scrapeFestivalAlarm },
  { name: 'festival-alarm.com (Electro)',    url: 'https://www.festival-alarm.com/us/Categories/Electronic-music-festivals', fn: scrapeFestivalAlarm },
  // Fairground Festival Hannover
  { name: 'fairground-festival.de',         url: 'https://fairground-festival.de/',                                           fn: makeFestivalScraper('FAIRGROUND FESTIVAL', 'Messe Hannover, Hannover', ['Techno', 'Electronic', 'House', 'Hardstyle']) },
  // Sector Events
  { name: 'sector-event.de',                url: 'https://sector-event.de/events',                                            fn: scrapeSectorEvents },
  // Libella Festival Bochum
  { name: 'libella-festival.de',            url: 'https://libella-festival.de/',                                              fn: makeFestivalScraper('LIBELLA FESTIVAL', 'Kemnader See, Bochum', ['Techno', 'Schranz', 'Trance']) },
  // Docklands Festival Münster
  { name: 'docklands-festival.de',          url: 'https://docklands-festival.de/',                                            fn: makeFestivalScraper('DOCKLANDS FESTIVAL', 'Hawerkamp, Münster', ['Techno', 'House', 'Trance', 'Hard Techno']) },
  // 44 Label Group Events
  { name: '44labelgroup.events',            url: 'https://44labelgroup.events/',                                              fn: scrape44LabelGroup },
  // Unreal Germany absichtlich NICHT drin — ist ein Label/Act, kein Festival.
  // Ihre Auftritte sind bei Nibirii, World Club Dome etc. → bereits in der Liste.
  // Rheingrün Open Air
  { name: 'rheingruen-openair.de',            url: 'https://rheingruen-openair.de/',                                          fn: makeFestivalScraper('RHEINGRÜN OPEN AIR', 'Rheinstrandbad, Karlsruhe', ['Techno', 'Electronic']) },
  // Overdrive Hard Techno Events Hannover
  { name: 'shop-overdrive.de',                url: 'https://shop-overdrive.de/events/',                                       fn: scrapeOverdrive },
  // Buchbusch Festival Pforzheim
  { name: 'buchbusch.de',                    url: 'https://buchbusch.de/',                                                    fn: makeFestivalScraper('BUCHBUSCH FESTIVAL', 'Pforzheim', ['Techno']) },
  // Stroga Festival Energiefabrik Knappenrode
  { name: 'stroga-festival.de',              url: 'https://www.stroga-festival.de/',                                          fn: makeFestivalScraper('STROGA FESTIVAL', 'Energiefabrik Knappenrode, Hoyerswerda', ['Techno', 'Electronic']) },
  // Nation of Gondwana bei Berlin
  { name: 'pyonen.de (nog)',                 url: 'https://pyonen.de/',                                                       fn: makeFestivalScraper('NATION OF GONDWANA', 'Grünefeld bei Berlin', ['Techno', 'Electronic']) },
  // Waves Open Air Hannover — Haupt-Event und Closing
  { name: 'waves-openair.de',               url: 'https://waves-openair.de/waves/',                                          fn: scrapeWavesOpenAir },
  { name: 'waves-openair.de (closing)',      url: 'https://closing.waves-openair.de/',                                       fn: scrapeWavesOpenAir },
  // Verknipt NL — einzige erlaubte Holland-Quelle
  { name: 'verknipt.org (tickets)',          url: 'https://www.verknipt.org/tickets/',                                        fn: scrapeVerknipt },
  { name: 'verknipt.org (events)',           url: 'https://www.verknipt.org/events/',                                         fn: scrapeVerknipt },
  // Airpark Festival
  { name: 'airpark-festival.de',              url: 'https://www.airpark-festival.de/',                                        fn: makeFestivalScraper('AIRPARK FESTIVAL', 'Deutschland', ['Techno', 'Electronic']) },
  // City Bounce / Havelbeats Festival Potsdam
  { name: 'citybounce.de (havelbeats)',        url: 'https://www.citybounce.de/',                                              fn: scrapeHavelbeats },
  // Strandfieber Festival
  { name: 'strandfieber-festival.de',         url: 'https://www.strandfieber-festival.de/',                                   fn: makeFestivalScraper('STRANDFIEBER FESTIVAL', 'Deutschland', ['Techno', 'Electronic']) },
  // Awakenings (Niederlande erlaubt)
  { name: 'awakenings.com',                   url: 'https://www.awakenings.com/en/',                                          fn: scrapeAwakenings },
  // Electric Residence Herne
  { name: 'electric-residence.de',            url: 'https://www.electric-residence.de/',                                      fn: makeFestivalScraper('ELECTRIC RESIDENCE FESTIVAL', 'Schloss Strünkede, Herne', ['Techno', 'House', 'Electronic']) },
  // Schall im Schilf München
  { name: 'schallimschilf.de',                url: 'https://www.schallimschilf.de/',                                          fn: makeFestivalScraper('SCHALL IM SCHILF FESTIVAL', 'Garchinger See, München', ['Techno', 'Electronic']) },
  // Westhafen Festival Leipzig
  { name: 'westhafen-leipzig.de',             url: 'https://www.westhafen-leipzig.de/',                                       fn: makeFestivalScraper('WESTHAFEN FESTIVAL SUMMER EDITION', 'Westhafen, Leipzig', ['Techno', 'Electronic']) },
  // Muuuhnlight Festival Schauenburg
  { name: 'dancinginthemuuuhnlight.de',        url: 'https://www.dancinginthemuuuhnlight.de/',                                 fn: makeFestivalScraper('MUUUHNLIGHT FESTIVAL', 'Muuuhnlight Garten, Schauenburg (Hessen)', ['Techno', 'Electronic']) },
  // about blank Berlin (Blank Holidays Weekender)
  { name: 'aboutblank.li',                    url: 'https://aboutblank.li/',                                                  fn: makeFestivalScraper('BLANK HOLIDAYS FESTIVAL WEEKENDER', '://about blank, Berlin', ['Techno', 'Electronic']) },
  // Circle of Leaves Festival
  { name: 'circle-of-leaves.com',             url: 'https://circle-of-leaves.com/',                                           fn: makeFestivalScraper('CIRCLE OF LEAVES FESTIVAL', 'Marbach-Stausee, Oberzent (Hessen)', ['Techno', 'Electronic']) },
  // Chimaera Festival Brandenburg
  { name: 'chimaera-festival.de',             url: 'https://chimaera-festival.de/',                                           fn: makeFestivalScraper('CHIMAERA FESTIVAL', 'Klingemühle, Friedland (Brandenburg)', ['Techno', 'Electronic']) },
  // Reactōr Aftermath — Kernkraftwerk Kalkar
  { name: 'reactor.events',                   url: 'https://reactor.events/',                                                  fn: makeFestivalScraper('REACTŌR AFTERMATH', 'Kernkraftwerk Kalkar, Kalkar (NRW)', ['Techno', 'Electronic']) },
  // KeinFestival — Pittlerwerke Leipzig
  { name: 'kein-festival.de',                 url: 'https://kein-festival.de/',                                                fn: makeFestivalScraper('KEINFESTIVAL', 'Pittlerwerke, Leipzig', ['Hard Techno', 'Techno', 'Trance']) },
  // Rote Dichte — Galenbeck
  { name: 'rotedichte.de',                    url: 'https://www.rotedichte.de/',                                              fn: makeFestivalScraper('ROTE DICHTE', 'Galenbeck, Mecklenburg-Vorpommern', ['Techno', 'House']) },
  // Lacuna Festival — Ochtrup
  { name: 'lacunafestival.com',               url: 'https://www.lacunafestival.com/',                                         fn: makeFestivalScraper('LACUNA FESTIVAL', 'Felsenmühle, Ochtrup', ['Techno', 'Hardstyle', 'Trance']) },
  // Kindheitstraum Festival — letzte Ausgabe 2027, danach eingestellt
  { name: 'kindheitstraum-festival.de',       url: 'https://www.kindheitstraum-festival.de/',                                 fn: makeFestivalScraper('KINDHEITSTRAUM FESTIVAL', 'Flugplatz Speichersdorf, Bayern', ['Techno', 'House', 'Electronic']) },
  // Time Warp Mannheim — dedizierte, sichere Quelle statt der allgemeinen Startseite
  { name: 'time-warp.de (mannheim)',          url: 'https://www.time-warp.de/germany/mannheim/',                              fn: scrapeTimeWarpMannheim },
  // WET Open Air Sindelfingen
  { name: 'wet-openair.de',                   url: 'https://www.wet-openair.de/',                                             fn: makeFestivalScraper('WET OPEN AIR', 'Badezentrum Sindelfingen', ['Techno', 'Hard Techno']) },
  // Isle of Summer München
  { name: 'isleofsummer.de',                  url: 'https://www.isleofsummer.de/',                                            fn: makeFestivalScraper('ISLE OF SUMMER', 'Olympia Reitanlage Riem, München', ['Hard Techno', 'Techno', 'Hardstyle', 'Trance']) },
  // Amphoria Kevelaer
  { name: 'amphoria-kevelaer.de',             url: 'https://amphoria-kevelaer.de/',                                           fn: makeFestivalScraper('AMPHORIA', 'Schwarzer Bruch, Kevelaer', ['Techno']) },
  // Arena Rave — Touring-Reihe, mehrere Staedte/Termine (siehe scrapeArenaRave)
  { name: 'arena-rave.de',                    url: 'https://arena-rave.de/wp-json/wp/v2/event?per_page=50',                    fn: scrapeArenaRave },
  // Vortex Festival — naechster Termin noch nicht angekuendigt (Stand Juli 2026),
  // Seite ist JS-lastig (Cargo-Baukasten) und der Termin steht evtl. nur clientseitig.
  // Watch bleibt drin, damit er automatisch erscheint, sobald er als Text auf der
  // Seite steht — falls er nie serverseitig sichtbar wird, muss er manuell ergaenzt werden.
  { name: 'vortexfestival.com',               url: 'https://vortexfestival.com/',                                             fn: makeFestivalScraper('VORTEX FESTIVAL', 'EWS Arena, Göppingen', ['Techno', 'Trance', 'Hardcore']) },
  // Hasardeur Festival Karlsruhe
  { name: 'hasardeur-festival.de',            url: 'https://hasardeur-festival.de/',                                          fn: makeFestivalScraper('HASARDEUR FESTIVAL', 'Auto Böhler Schrottplatz, Karlsruhe', ['Techno', 'Hard Techno']) },
  // Hard.Noise Festival Detern
  { name: 'hard-noise.de',                    url: 'https://hard-noise.de/',                                                  fn: makeFestivalScraper('HARD.NOISE FESTIVAL', 'Burg Stickhausen, Detern', ['Hard Techno']) },
  // Sea You Festival Freiburg
  { name: 'seayou-festival.de',                url: 'https://www.seayou-festival.de/',                                        fn: makeFestivalScraper('SEA YOU FESTIVAL', 'Tunisee, Freiburg', ['Techno', 'House', 'Trance']) },
  // Mahagoni Festival Teutschenthal
  { name: 'mahagoni-festival.de',              url: 'https://mahagoni-festival.de/',                                          fn: makeFestivalScraper('MAHAGONI FESTIVAL', 'Rittergut Etzdorf, Teutschenthal (Sachsen-Anhalt)', ['Techno', 'Experimental']) },
  // Nimmerland Open Air Germersheim
  { name: 'nimmerlandevents.de',               url: 'https://nimmerlandevents.de/openair',                                    fn: makeFestivalScraper('NIMMERLAND OPEN AIR', 'Festung Germersheim, Germersheim', ['Techno']) },
  // Keine anderen NL-Quellen — nur Verknipt-Events und Awakenings aus Holland erlaubt
];

const GENRE_KEYWORDS = ['techno', 'hard techno', 'hardtechno', 'schranz', 'hardcore', 'hardstyle', 'psytrance', 'hard core', 'rave'];

function hasRelevantGenre(text) {
  const t = text.toLowerCase();
  return GENRE_KEYWORDS.some(k => t.includes(k));
}

function isClubName(name) {
  return /\b(club|bar|kantine|lounge)\b/i.test(name);
}

async function scrapeHardtours(url) {
  const html = await fetchPage(url);
  if (!html) return [];
  const $ = cheerio.load(html);
  const results = [];
  $('table tr').each((_, tr) => {
    const cells = $(tr).find('td');
    if (cells.length < 3) return;
    const dateText = $(cells[0]).text().trim();
    const name     = $(cells[1]).text().trim();
    const location = $(cells[2]).text().trim();
    const link     = $(cells[1]).find('a').attr('href') || '';
    if (!name || name.length < 3 || isClubName(name)) return;
    const entry = buildDiscoveryEntry({ name, dateText, location, genreText: 'techno', link, source: 'hardtours.de' });
    if (entry) results.push(entry);
  });
  return results;
}

async function scrapeFestivalTicker(url) {
  const html = await fetchPage(url);
  if (!html) return [];
  const $ = cheerio.load(html);
  const results = [];
  $('article, .festival-entry, .entry, [class*="festival"]').each((_, el) => {
    const name     = $(el).find('h2, h3, .title').first().text().trim();
    const dateText = $(el).find('time, .date, [class*="date"]').first().text().trim();
    const location = $(el).find('.location, .ort').first().text().trim();
    const genre    = $(el).find('.genre, .tag, [class*="genre"]').text().toLowerCase();
    const link     = $(el).find('a').first().attr('href') || '';
    if (!name || name.length < 3 || isClubName(name)) return;
    if (!hasRelevantGenre(genre + ' ' + name)) return;
    const entry = buildDiscoveryEntry({ name, dateText, location, genreText: genre, link, source: 'festivalticker.de' });
    if (entry) results.push(entry);
  });
  return results;
}

async function scrapeGenericListing(url) {
  const html = await fetchPage(url);
  if (!html) return [];
  const $ = cheerio.load(html);
  const results = [];
  $('article, [class*="festival"], [class*="event"], .card').each((_, el) => {
    const name     = $(el).find('h2, h3, h4, [class*="title"], [class*="name"]').first().text().trim();
    const dateText = $(el).find('time, [class*="date"], [class*="datum"]').first().text().trim();
    const location = $(el).find('[class*="location"], [class*="ort"], [class*="city"]').first().text().trim();
    const genre    = $(el).find('[class*="genre"], [class*="tag"]').text().toLowerCase();
    const link     = $(el).find('a').first().attr('href') || '';
    if (!name || name.length < 3 || isClubName(name)) return;
    if (!hasRelevantGenre(genre + ' ' + name)) return;
    const entry = buildDiscoveryEntry({ name, dateText, location, genreText: genre || 'techno', link, source: getDomain(url) || url });
    if (entry) results.push(entry);
  });
  return results;
}

async function scrapeDeinFestival(url) {
  const html = await fetchPage(url);
  if (!html) return [];
  const $ = cheerio.load(html);
  const results = [];
  // dein-festival.de listet Festivals als Karten mit data-* Attributen oder als .festival-item
  $('[class*="festival"], [class*="card"], article, li.festival').each((_, el) => {
    const name     = $(el).find('[class*="title"], [class*="name"], h2, h3').first().text().trim();
    const dateText = $(el).find('[class*="date"], time, [class*="datum"]').first().text().trim();
    const location = $(el).find('[class*="location"], [class*="city"], [class*="ort"]').first().text().trim();
    const genre    = $(el).find('[class*="genre"], [class*="tag"], [class*="style"]').text().toLowerCase();
    let link       = $(el).find('a').first().attr('href') || '';
    if (!link.startsWith('http') && link) link = `https://www.dein-festival.de${link}`;
    if (!name || name.length < 3 || name.length > 80) return;
    if (isClubName(name)) return;
    if (!hasRelevantGenre(genre + ' ' + name + ' ' + url)) return;
    const entry = buildDiscoveryEntry({ name, dateText, location, genreText: genre || 'techno', link, source: 'dein-festival.de' });
    if (entry) results.push(entry);
  });
  return results;
}

async function scrapeEventbrite(url) {
  const html = await fetchPage(url);
  if (!html) return [];
  const $ = cheerio.load(html);
  const results = [];
  $('[data-testid="event-card"], .eds-event-card, article').each((_, el) => {
    const name     = $(el).find('h2, h3, [data-testid="event-card-title"]').first().text().trim();
    const dateText = $(el).find('time, [data-testid="event-card-date"]').first().text().trim();
    const location = $(el).find('[data-testid="event-card-venue"], .location').first().text().trim();
    let link       = $(el).find('a[href*="eventbrite"]').first().attr('href') || $(el).find('a').first().attr('href') || '';
    if (!link.startsWith('http')) link = `https://www.eventbrite.de${link}`;
    if (!name || name.length < 3 || isClubName(name)) return;
    const nameLower = name.toLowerCase();
    if (!nameLower.includes('festival') && !nameLower.includes('open air') && !nameLower.includes('open-air') && !nameLower.includes('rave')) return;
    if (!hasRelevantGenre(nameLower)) return;
    const entry = buildDiscoveryEntry({ name, dateText, location, genreText: 'techno', link, source: 'eventbrite.de' });
    if (entry) results.push(entry);
  });
  return results;
}

// Factory für bekannte Festival-Websites: extrahiert Daten direkt ohne Genre-Filter,
// da der Veranstalter bereits als relevant bekannt ist.
function makeFestivalScraper(festName, location, genre) {
  return async function(url) {
    const html = await fetchPage(url);
    if (!html) return [];
    const $ = cheerio.load(html);
    $('nav, footer, script, style').remove();
    const pageText = $.text().replace(/\b(\d{1,2})(st|nd|rd|th)\b/gi, '$1');
    const dates = extractFutureDates(pageText);
    return dates.map(date => ({
      name: `${festName} ${date.slice(0, 4)}`.toUpperCase(),
      date,
      dateDisplay: formatDate(date),
      location,
      genre,
      url,
      soldOut: false,
      description: '',
      _source: url,
      _auto: true
    }));
  };
}

async function scrapeSectorEvents(url) {
  const html = await fetchPage(url);
  if (!html) return [];
  const $ = cheerio.load(html);
  $('nav, footer, script, style').remove();
  const results = [];
  $('article, [class*="event"], [class*="card"], li.event, .event-item, [class*="item"]').each((_, el) => {
    const text = $(el).text().replace(/\b(\d{1,2})(st|nd|rd|th)\b/gi, '$1').replace(/\s+/g, ' ').trim();
    if (text.length < 5 || text.length > 600) return;
    const dates = extractFutureDates(text);
    if (!dates.length) return;
    const name = $(el).find('h2, h3, h4, [class*="title"], [class*="name"]').first().text().trim();
    if (!name || name.length < 3 || isClubName(name)) return;
    const location = $(el).find('[class*="location"], [class*="ort"], [class*="venue"], [class*="city"]').first().text().trim() || 'Deutschland';
    let link = $(el).find('a').first().attr('href') || '';
    if (!link.startsWith('http') && link) link = `https://sector-event.de${link}`;
    for (const date of dates) {
      results.push({
        name: name.toUpperCase().substring(0, 80),
        date,
        dateDisplay: formatDate(date),
        location,
        genre: ['Hard Techno', 'Techno'],
        url: link || url,
        soldOut: false,
        description: '',
        _source: url,
        _auto: true
      });
    }
  });
  return results;
}

async function scrape44LabelGroup(url) {
  const html = await fetchPage(url);
  if (!html) return [];
  const $ = cheerio.load(html);
  const foreignCheck = ['santiago', 'mexico', 'bogotá', 'bogota', 'new york', 'nyc', 'london', 'paris', 'amsterdam', 'barcelona', 'madrid', 'vienna', 'wien', 'zürich', 'zurich', 'brussels', 'brüssel'];
  const germanCheck = ['stuttgart', 'karlsruhe', 'berlin', 'hamburg', 'münchen', 'munich', 'köln', 'cologne', 'frankfurt', 'düsseldorf', 'dortmund', 'mannheim', 'leipzig', 'messe', 'deutschland', 'germany'];
  const results = [];

  // JSON-LD (React/SPA-Seiten); nur Events mit "44" im Namen und deutscher Location
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html() || '{}');
      const events = Array.isArray(data) ? data : [data];
      for (const ev of events) {
        if (ev['@type'] !== 'Event') continue;
        const date = parseDate(ev.startDate || '');
        if (!date) continue;
        const loc = ev.location?.name || ev.location?.address?.addressLocality || ev.location?.address?.addressRegion || '';
        const name = (ev.name || '').trim();
        if (!name || !name.includes('44')) continue;
        const combined = (name + ' ' + loc).toLowerCase();
        if (foreignCheck.some(f => combined.includes(f))) continue;
        if (loc && !germanCheck.some(g => combined.includes(g))) continue;
        results.push({
          name: name.toUpperCase().substring(0, 80),
          date,
          dateDisplay: formatDate(date),
          location: loc || 'Deutschland',
          genre: ['Hard Techno', 'Techno'],
          url: ev.url || url,
          soldOut: false,
          description: '',
          _source: url,
          _auto: true
        });
      }
    } catch {}
  });

  return results;
}

async function scrapeFestivalsUnited(url) {
  const html = await fetchPage(url);
  if (!html) return [];
  const $ = cheerio.load(html);
  const results = [];
  $('article, .festival-card, [class*="festival-item"], [class*="card"]').each((_, el) => {
    const name     = $(el).find('h2, h3, h4, [class*="title"], [class*="name"]').first().text().trim();
    const dateText = $(el).find('time, [class*="date"], [class*="datum"]').first().text().trim();
    const location = $(el).find('[class*="location"], [class*="city"], [class*="ort"]').first().text().trim();
    const genre    = $(el).find('[class*="genre"], [class*="tag"], [class*="category"], [class*="style"]').text().toLowerCase();
    let link       = $(el).find('a').first().attr('href') || '';
    if (!link.startsWith('http') && link) link = `https://www.festivalsunited.com${link}`;
    if (!name || name.length < 3 || name.length > 80) return;
    if (isClubName(name)) return;
    if (!hasRelevantGenre(genre + ' ' + name)) return;
    const entry = buildDiscoveryEntry({ name, dateText, location, genreText: genre || 'techno', link, source: 'festivalsunited.com' });
    if (entry) results.push(entry);
  });
  return results;
}

async function scrapeFestivalAlarm(url) {
  const html = await fetchPage(url);
  if (!html) return [];
  const $ = cheerio.load(html);
  const results = [];
  $('article, .festival-item, [class*="festival"], [class*="event"], tr').each((_, el) => {
    const name     = $(el).find('h2, h3, h4, [class*="title"], [class*="name"]').first().text().trim();
    const dateText = $(el).find('time, [class*="date"], [class*="datum"]').first().text().trim();
    const location = $(el).find('[class*="location"], [class*="city"], [class*="ort"]').first().text().trim();
    const genre    = $(el).find('[class*="genre"], [class*="tag"], [class*="category"]').text().toLowerCase();
    let link       = $(el).find('a').first().attr('href') || '';
    if (!link.startsWith('http') && link) link = `https://www.festival-alarm.com${link}`;
    if (!name || name.length < 3 || name.length > 80) return;
    if (isClubName(name)) return;
    if (!hasRelevantGenre(genre + ' ' + name + ' ' + url)) return;
    const entry = buildDiscoveryEntry({ name, dateText, location, genreText: genre || 'techno electronic', link, source: 'festival-alarm.com' });
    if (entry) results.push(entry);
  });
  return results;
}


async function scrapeWavesOpenAir(url) {
  const html = await fetchPage(url);
  if (!html) return [];
  const $ = cheerio.load(html);
  $('nav, footer, script, style').remove();
  // Ordinalsuffixe entfernen bevor Datumsextraktion
  const pageText = $.text().replace(/\b(\d{1,2})(st|nd|rd|th)\b/gi, '$1');
  const dates = extractFutureDates(pageText);
  const results = [];
  const isClosing = url.includes('closing');
  const name = isClosing ? 'WAVES OPEN AIR CLOSING' : 'WAVES OPEN AIR';
  for (const date of dates) {
    const year = date.slice(0, 4);
    results.push({
      name: `${name} ${year}`,
      date,
      dateDisplay: formatDate(date),
      location: 'Spaßbad Wedemark, Hannover',
      genre: ['Techno', 'Electronic'],
      url: isClosing ? 'https://closing.waves-openair.de' : 'https://waves-openair.de',
      soldOut: false,
      description: isClosing
        ? 'Waves Open Air Closing — der Abschluss der Festivalsaison im Spaßbad Wedemark bei Hannover.'
        : 'Waves Open Air — Techno und Electronic im Spaßbad Wedemark bei Hannover. Drei Stages, Indoor & Outdoor, Pool-Vibes.',
      _source: url,
      _auto: true
    });
  }
  return results;
}

async function scrapeVerknipt(url) {
  const html = await fetchPage(url);
  if (!html) return [];
  const $ = cheerio.load(html);
  const results = [];

  // Verknipt-Events haben oft eigene Karten/Links
  $('a, article, [class*="event"], [class*="ticket"]').each((_, el) => {
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (text.length < 5 || text.length > 200) return;

    const dates = extractFutureDates(text);
    if (dates.length === 0) return;

    const linkHref = ($(el).is('a') ? $(el).attr('href') : $(el).find('a').first().attr('href')) || '';
    const fullLink = linkHref.startsWith('http') ? linkHref : `https://www.verknipt.org${linkHref}`;

    const textLower = text.toLowerCase();
    const location = textLower.includes('amsterdam')  ? 'Amsterdam (NL)'
                   : textLower.includes('oberhausen') ? 'Turbinenhalle, Oberhausen'
                   : textLower.includes('utrecht')    ? 'Utrecht (NL)'
                   : textLower.includes('rotterdam')  ? 'Rotterdam (NL)'
                   : textLower.includes('eindhoven')  ? 'Eindhoven (NL)'
                   : textLower.includes('berlin')     ? 'Berlin'
                   : textLower.includes('köln')       ? 'Köln'
                   : textLower.includes('düsseldorf') ? 'Düsseldorf'
                   : 'Niederlande';

    for (const date of dates) {
      const year = date.slice(0, 4);
      results.push({
        name: `VERKNIPT — ${location.toUpperCase()} ${year}`,
        date,
        dateDisplay: formatDate(date),
        location,
        genre: ['Hard Techno'],
        url: fullLink || 'https://www.verknipt.org/',
        soldOut: false,
        description: `Verknipt in ${location} — Hard Techno von der führenden holländischen Crew.`,
        _source: url,
        _auto: true
      });
    }
  });
  return results;
}


async function scrapeHavelbeats(_url) {
  const year = new Date().getFullYear();
  const results = [];
  for (const y of [year, year + 1]) {
    const pageUrl = `https://www.citybounce.de/havelbeats-${y}`;
    const html = await fetchPage(pageUrl);
    if (!html) continue;
    const $ = cheerio.load(html);
    if ($('title').text().includes('nicht gefunden')) continue;
    const pageText = $.text();
    const dates = extractFutureDates(pageText);
    for (const date of dates) {
      const key = `havelbeats-festival-${y}-${date}`;
      if (results.find(r => r.date === date)) continue;
      results.push({
        name: `HAVELBEATS FESTIVAL ${y}`,
        date,
        dateDisplay: formatDate(date),
        location: 'Schiffbauergasse, Potsdam',
        genre: ['Techno', 'Electronic', 'Trance'],
        url: pageUrl,
        soldOut: false,
        description: `Potsdams größtes Festival an der Havel — 5 Stages, 50+ Acts, Techno, Trance & Goa direkt am Wasser in der Schiffbauergasse.`,
        _source: pageUrl, _auto: true
      });
    }
  }
  return results;
}

// Arena Rave — Touring-Reihe (angemietete Messehallen/Arenen, wechselnde Staedte).
// Nutzt die WordPress-REST-API (eigener "event" Post-Type) statt der Startseite,
// weil dort auch ein fremdes, cross-promotetes Club-Event (Boom Room/Docks Hamburg)
// auftaucht, das keine Arena-Rave-Veranstaltung ist.
async function scrapeArenaRave(_url) {
  const apiUrl = 'https://arena-rave.de/wp-json/wp/v2/event?per_page=50';
  const json = await fetchPage(apiUrl);
  if (!json) return [];
  let events;
  try { events = JSON.parse(json); } catch { return []; }
  if (!Array.isArray(events)) return [];

  const results = [];
  for (const ev of events) {
    const city = (ev.title?.rendered || '').trim();
    if (!city) continue;
    const text = String(ev.content?.rendered || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const dates = extractFutureDates(text);
    if (!dates.length) continue;
    // Nur das fruehste Datum nehmen — Overnight-Raves erwaehnen oft noch
    // einen Shuttle-Rueckfahrt-Termin am naechsten Morgen, kein zweiter Termin.
    const date = dates.sort()[0];

    const venueMatch = text.match(/ZUR\s+([A-ZÄÖÜ0-9À-Ž][A-ZÄÖÜ0-9À-Ž\s\-\.]*),\s*\d{4,5}\s+([A-ZÄÖÜ][A-ZÄÖÜ\s\-]*)/i);
    const toTitleCase = (s) => s.trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
    const location = venueMatch
      ? `${toTitleCase(venueMatch[1])}, ${toTitleCase(venueMatch[2])}`
      : toTitleCase(city);

    const year = date.slice(0, 4);
    results.push({
      name: `ARENA RAVE ${city.toUpperCase()} ${year}`,
      date,
      dateDisplay: formatDate(date),
      location,
      genre: ['Hard Techno'],
      url: ev.link || 'https://arena-rave.de/',
      soldOut: false,
      description: `Angemietete Halle, großes Line-up — Arena Rave macht Station in ${toTitleCase(city)}.`,
      _source: ev.link, _auto: true
    });
  }
  return results;
}

async function scrapeAwakenings(_url) {
  const html = await fetchPage('https://www.awakenings.com/en/');
  if (!html) return [];
  const $ = cheerio.load(html);
  const results = [];
  $('a[href*="/events/"][href*="/awakenings-festival/"]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    const yearMatch = href.match(/\/events\/(\d{4})\//);
    if (!yearMatch) return;
    const year = yearMatch[1];
    const text = $.text();
    const dateMatch = text.match(/(?:friday|saturday|sunday|monday)?\s*(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:\s*[-–]\s*(?:\w+\s+)?(\d{1,2}))?,?\s*(\d{4})/i);
    const fullUrl = href.startsWith('http') ? href : `https://www.awakenings.com${href}`;
    const key = `awakenings-${year}`;
    if (results.find(r => r.url === fullUrl)) return;
    results.push({
      name: `AWAKENINGS FESTIVAL ${year}`,
      date: `${year}-07-12`,
      dateDisplay: `Juli ${year}`,
      location: 'Niederlande',
      genre: ['Techno'],
      url: fullUrl,
      soldOut: false,
      description: 'Eines der größten Techno-Festivals Europas — purer Techno mit den absoluten Weltstars des Genres.',
      _source: fullUrl, _auto: true
    });
  });
  return results;
}

// Time Warp Mannheim: dedizierte Quelle statt der allgemeinen Startseite
// (time-warp.de steht deshalb in SKIP_DOMAINS). Die Seite rendert den echten
// Termin UND "Next Ticket Drop: April 2, 2026" im selben Datumsformat
// ("Month DD, YYYY") — reines Format-Matching kann sie nicht unterscheiden.
// Deshalb: Kontext vor jedem Treffer prüfen und "Drop"-Erwähnungen verwerfen.
async function scrapeTimeWarpMannheim(url) {
  const html = await fetchPage(url);
  if (!html) return [];
  const $ = cheerio.load(html);
  $('nav, footer, script, style').remove();
  const pageText = $.text().replace(/\s+/g, ' ');

  const dates = new Set();
  const regex = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{1,2}),?\s+(202[6-9]|20[3-9]\d)(?!\d)/gi;
  for (const m of pageText.matchAll(regex)) {
    const contextBefore = pageText.slice(Math.max(0, m.index - 40), m.index).toLowerCase();
    if (contextBefore.includes('drop')) continue;
    const mon = MONTH_DE[m[1].toLowerCase().slice(0, 3)];
    if (!mon) continue;
    const iso = `${m[3]}-${mon}-${m[2].padStart(2, '0')}`;
    if (isValidFutureDate(iso)) dates.add(iso);
  }

  return [...dates].map(date => ({
    name: `TIME WARP ${date.slice(0, 4)}`,
    date,
    dateDisplay: formatDate(date),
    location: 'Maimarkthalle, Mannheim',
    genre: ['Techno'],
    url: 'https://www.time-warp.de',
    soldOut: false,
    description: '19 Stunden, 5 Floors — Time Warp verwandelt die Maimarkthalle in ein pulsierendes Techno-Labyrinth.',
    _source: url,
    _auto: true
  }));
}

async function scrapeOverdrive(url) {
  const html = await fetchPage(url);
  if (!html) return [];
  const $ = cheerio.load(html);
  const results = [];
  // WooCommerce Produkt-Karten
  $('li.product, article.product, .product').each((_, el) => {
    const name     = $(el).find('.woocommerce-loop-product__title, h2, h3').first().text().trim();
    const dateText = $(el).find('.date, time, [class*="date"]').first().text().trim() || $(el).text();
    const link     = $(el).find('a').first().attr('href') || url;
    if (!name || name.length < 3) return;
    const entry = buildDiscoveryEntry({
      name,
      dateText,
      location: 'Expo Park, Hannover',
      genreText: 'hard techno',
      link,
      source: 'shop-overdrive.de'
    });
    if (entry) results.push(entry);
  });
  // Fallback: alle Daten auf der Seite + Name aus Titel
  if (results.length === 0) {
    const pageText = $.text();
    const dates = extractFutureDates(pageText);
    for (const date of dates) {
      results.push({
        name: `OVERDRIVE OPEN AIR FESTIVAL ${date.slice(0, 4)}`,
        date,
        dateDisplay: formatDate(date),
        location: 'Expo Park, Hannover',
        genre: ['Hard Techno'],
        url,
        soldOut: false,
        description: 'Hannovers Hard Techno Open Air im Expo Park — die Heimat für alle, die Hard Techno leben.',
        _source: url,
        _auto: true
      });
    }
  }
  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// HILFSFUNKTIONEN
// ─────────────────────────────────────────────────────────────────────────────

function parseDate(text) {
  const dates = extractFutureDates(text);
  if (dates.length > 0) return dates[0];

  // Auch vergangene Daten versuchen (für Datumsfelder)
  const m = text.match(/(\d{1,2})[.\/](\d{1,2})[.\/](20\d{2})/);
  if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  return null;
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch { return iso; }
}

function guessGenres(text) {
  const t = text.toLowerCase();
  const genres = [];
  if (t.includes('hard techno') || t.includes('hardtechno')) genres.push('Hard Techno');
  if (t.includes('schranz')) genres.push('Schranz');
  if (t.includes('hardcore')) genres.push('Hardcore');
  if (t.includes('hardstyle')) genres.push('Hardstyle');
  if (t.includes('psytrance') || t.includes('psy trance')) genres.push('Psytrance');
  if (t.includes('trance') && !genres.includes('Psytrance')) genres.push('Trance');
  if (t.includes('techno') && !genres.includes('Hard Techno')) genres.push('Techno');
  if (t.includes('house')) genres.push('House');
  return genres.length ? genres : ['Techno'];
}

function buildDiscoveryEntry({ name, dateText, location, genreText, link, source }) {
  const date = parseDate(dateText);
  if (!date) return null;

  const combined = (location + ' ' + name).toLowerCase();

  // Holländische Locations: NUR Verknipt-Events erlaubt
  const nlKeywords = ['netherlands', 'nederland', 'amsterdam', 'utrecht', 'rotterdam', 'eindhoven', 'nl)'];
  if (nlKeywords.some(kw => combined.includes(kw))) {
    if (!name.toLowerCase().includes('verknipt')) return null;
  }

  // Sonstige Auslandsfestivals komplett ausschließen
  const foreignOther = ['austria', 'österreich', 'schweiz', 'belgien', 'france', 'frankreich', 'uk ', 'united kingdom', 'croatia', 'kroatien', 'spain', 'spanien', 'italy', 'italien'];
  if (foreignOther.some(f => combined.includes(f))) return null;

  const url = link && link.startsWith('http') ? link : (link ? `https://${source}${link}` : '');

  return {
    name: name.toUpperCase().substring(0, 80),
    date,
    dateDisplay: formatDate(date),
    location: location || 'Deutschland',
    genre: guessGenres(genreText + ' ' + name),
    url,
    soldOut: false,
    description: '',
    _source: source,
    _auto: true
  };
}

function nameKey(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 25);
}

// Basisname ohne Jahreszahl, für proximity-Dedup
function baseName(name) {
  return name.toLowerCase().replace(/\d{4}/g, '').replace(/[^a-z]/g, '').substring(0, 20);
}

// ─────────────────────────────────────────────────────────────────────────────
// MERGE
// ─────────────────────────────────────────────────────────────────────────────

function mergeIntoExisting(existing, candidates) {
  const existingKeys = new Set(existing.map(f => nameKey(f.name) + f.date));
  const added = [];

  for (const c of candidates) {
    if (!c || !c.date || !c.name) continue;

    // 1. Exakter Name+Datum Duplikat
    const key = nameKey(c.name) + c.date;
    if (existingKeys.has(key)) continue;

    // 2. Gleiches Festival, selber Monat oder Nachbarmonat → nicht re-adden
    //    Verhindert Start-/End-Datum-Duplikate bei mehrtägigen Festivals
    //    (z.B. Open Beatz Juli 24 UND Juli 26 würden beide eingetragen)
    const cBase = baseName(c.name);
    const cYear = c.date.slice(0, 4);
    const cMonth = parseInt(c.date.slice(5, 7));
    const nearDuplicate = existing.some(f => {
      if (baseName(f.name) !== cBase) return false;
      if (f.date.slice(0, 4) !== cYear) return false;
      const fMonth = parseInt(f.date.slice(5, 7));
      return Math.abs(cMonth - fMonth) <= 1; // gleicher oder Nachbarmonat
    });
    if (nearDuplicate) continue;

    existingKeys.add(key);
    const { _source, _auto, ...clean } = c;
    added.push(clean);
  }
  return added;
}

// ─────────────────────────────────────────────────────────────────────────────
// OUTPUT
// ─────────────────────────────────────────────────────────────────────────────

async function writeOutput(festivals) {
  const date = new Date().toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  const js = `// Daten zuletzt aktualisiert: ${date}
// Automatisch gepflegt von scraper/fetch_festivals.js — manuelle Einträge bleiben erhalten.

const festivals = ${JSON.stringify(festivals, null, 2)};

export default festivals;
`;
  await fs.writeFile(FESTIVALS_PATH, js, 'utf-8');
  console.log(`\n✅ ${festivals.length} Festivals geschrieben nach ${FESTIVALS_PATH}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// GEOCODING (Nominatim — kostenlos, kein API-Key nötig)
// ─────────────────────────────────────────────────────────────────────────────

async function nominatimGeocode(query) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'raveintograve.de/1.0 festival-tracker' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch { return null; }
}

async function geocodeMissingFestivals(festivals) {
  const missing = festivals.filter(f => f.lat == null || f.lng == null);
  if (missing.length === 0) return false;

  console.log(`\n── Geocoding: ${missing.length} Festivals ohne Koordinaten ──`);
  let changed = false;

  for (const f of missing) {
    const loc = f.location || '';
    let coords = await nominatimGeocode(loc);
    if (!coords) {
      // Fallback: nur den Ortsteil nach dem letzten Komma versuchen
      const cityPart = loc.split(',').pop().replace(/\(.*\)/g, '').trim();
      if (cityPart && cityPart !== loc) coords = await nominatimGeocode(cityPart);
    }
    if (coords) {
      f.lat = coords.lat;
      f.lng = coords.lng;
      console.log(`  ✓ ${loc} → ${coords.lat.toFixed(3)}, ${coords.lng.toFixed(3)}`);
      changed = true;
    } else {
      console.log(`  ⚠️  ${loc} → nicht gefunden`);
    }
    await new Promise(r => setTimeout(r, 1100)); // Nominatim: max 1 req/s
  }

  return changed;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('⚡ Rave into Grave — Festival Scraper\n');

  // 1. Bestehende Liste laden
  const existing = await loadExistingFestivals();

  // 2. Bekannte Festival-Websites auf neue Daten prüfen
  const fromKnownSites = await monitorKnownFestivalSites(existing);

  // 3. Discovery: Neue unbekannte Festivals finden
  console.log('\n── Teil 2: Discovery — neue Festivals suchen ──');
  const discovered = [];
  for (const src of DISCOVERY_SOURCES) {
    process.stdout.write(`  ▶ ${src.name} … `);
    try {
      const results = await src.fn(src.url);
      console.log(`${results.length} Einträge`);
      discovered.push(...results);
    } catch (err) {
      console.log(`⚠️  ${err.message}`);
    }
  }

  // 4. Nur wirklich neue Events ermitteln
  const allCandidates = [...fromKnownSites, ...discovered];
  const newEntries = mergeIntoExisting(existing, allCandidates);
  console.log(`\n🆕 Neue Events: ${newEntries.length}`);
  if (newEntries.length > 0) {
    newEntries.forEach(e => console.log(`  + ${e.name}  (${e.date})  ${e.location}`));
  }

  // 5. Zusammenführen und nach Datum sortieren
  const merged = [...existing, ...newEntries];
  merged.sort((a, b) => new Date(a.date) - new Date(b.date));

  // 6. Koordinaten für Festivals ohne lat/lng ergänzen
  const geocodingChanged = await geocodeMissingFestivals(merged);

  if (newEntries.length === 0 && !geocodingChanged) {
    console.log('✅ Keine Änderungen — festivals.js bleibt unverändert.');
    return;
  }

  await writeOutput(merged);
}

main().catch(console.error);
