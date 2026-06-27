#!/usr/bin/env node
/**
 * Rave into Grave — Festival Scraper
 * Führe aus mit: node fetch_festivals.js
 * Ergänzt ../data/festivals.js mit neuen Festival-Daten — bestehende Einträge bleiben erhalten.
 */

import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── KONFIGURATION ───

const GENRE_KEYWORDS = ['techno', 'hard techno', 'hardtechno', 'schranz', 'hardcore', 'hard core', 'hardstyle', 'psytrance'];
const CLUB_ONLY_PATTERN = /\b(club|bar|lounge)\b/i;
const DAYS_AHEAD = 365;

// ─── QUELLEN ───
// Generische Festival-Listen-Seiten
const LIST_SOURCES = [
  { name: 'dein-festival.de (Techno)',      url: 'https://www.dein-festival.de/festivals/techno-festivals-2026',     scrape: scrapeDeinFestival },
  { name: 'dein-festival.de (Hard Techno)', url: 'https://www.dein-festival.de/festivals/hard-techno-festivals',      scrape: scrapeDeinFestival },
  { name: 'dein-festival.de (2027)',        url: 'https://www.dein-festival.de/festivals/techno-festivals-2027',     scrape: scrapeDeinFestival },
  { name: 'festival-alarm.com (2026)',      url: 'https://www.festival-alarm.com/Kategorien/Electro-Festivals/year/2026', scrape: scrapeFestivalAlarm },
  { name: 'festival-alarm.com (2027)',      url: 'https://www.festival-alarm.com/Kategorien/Electro-Festivals/year/2027', scrape: scrapeFestivalAlarm },
  { name: 'hardtours.de',                  url: 'https://www.hardtours.de/festivals',                               scrape: scrapeHardtours },
  { name: 'festivalticker.de (electronic)',url: 'https://www.festivalticker.de/festivals/genre/elektronische_festivals/', scrape: scrapeFestivalTicker },
  { name: 'festivalticker.de (techno)',     url: 'https://www.festivalticker.de/festivals/genre/techno/',            scrape: scrapeFestivalTicker },
  { name: 'festivalhopper.de (Techno)',     url: 'https://www.festivalhopper.de/festivals/suche/?genre%5B%5D=Techno&land=DE', scrape: scrapeFestivalHopper },
  { name: 'festivalhopper.de (Hard Techno)',url: 'https://www.festivalhopper.de/festivals/suche/?genre%5B%5D=Hard+Techno&land=DE', scrape: scrapeFestivalHopper },
  { name: 'festivalguide.de',              url: 'https://www.festivalguide.de/festivals/techno',                    scrape: scrapeFestivalGuide },
  { name: 'goabase.net',                   url: 'https://www.goabase.net/party/list/?country=de&genre=techno',      scrape: scrapeGoabase },
  { name: 'eventbrite.de (techno)',        url: 'https://www.eventbrite.de/d/germany/techno-festival/',             scrape: scrapeEventbrite },
  { name: 'eventbrite.de (hard techno)',   url: 'https://www.eventbrite.de/d/germany/hard-techno-festival/',        scrape: scrapeEventbrite },
  { name: 'eventbrite.de (schranz)',       url: 'https://www.eventbrite.de/d/germany/schranz-festival/',            scrape: scrapeEventbrite },
  { name: 'eventbrite.de (electronic)',    url: 'https://www.eventbrite.de/d/germany/electronic-open-air/',         scrape: scrapeEventbrite },
  // Niederlande — speziell für Verknipt & Co
  { name: 'festivalhopper.de (NL Techno)', url: 'https://www.festivalhopper.de/festivals/suche/?genre%5B%5D=Techno&land=NL', scrape: (url) => scrapeFestivalHopper(url, true) },
  { name: 'festivalhopper.de (NL Hard Techno)', url: 'https://www.festivalhopper.de/festivals/suche/?genre%5B%5D=Hard+Techno&land=NL', scrape: (url) => scrapeFestivalHopper(url, true) },
];

// Spezifische Event-Seiten die wir direkt überwachen
const SPECIFIC_SOURCES = [
  { name: 'Verknipt — alle Events',         url: 'https://www.verknipt.org/verknipt/tickets/', scrape: scrapeVerknipt },
  { name: 'Hardtours — Festival-Liste',     url: 'https://www.hardtours.de/festivals',          scrape: scrapeHardtours },
  { name: 'Syndicate Festival',             url: 'https://www.syndicate-festival.de',           scrape: scrapeGenericEvent('Syndicate', ['Hard Techno', 'Hardcore', 'Schranz'], 'Westfalenhallen, Dortmund') },
  { name: 'Nature One',                     url: 'https://www.nature-one.de',                   scrape: scrapeGenericEvent('Nature One', ['Techno', 'Trance', 'Hardstyle'], 'Raketenbasis Pydna, Kastellaun') },
  { name: 'Mayday',                         url: 'https://www.mayday.de',                       scrape: scrapeGenericEvent('Mayday', ['Techno', 'Hard Techno', 'Trance'], 'Westfalenhallen, Dortmund') },
  { name: 'Parookaville',                   url: 'https://www.parookaville.com',                scrape: scrapeGenericEvent('Parookaville', ['EDM', 'Techno', 'Hard Techno'], 'Airport Weeze') },
  { name: 'World Club Dome',                url: 'https://www.worldclubdome.com',               scrape: scrapeGenericEvent('World Club Dome', ['Techno', 'Hard Techno', 'EDM'], 'Messe Frankfurt') },
  { name: 'Time Warp',                      url: 'https://www.time-warp.de',                    scrape: scrapeGenericEvent('Time Warp', ['Techno'], 'Maimarkthalle, Mannheim') },
  { name: 'Hive Festival',                  url: 'https://hivefestival.de',                     scrape: scrapeGenericEvent('Hive Festival', ['Hard Techno', 'Schranz'], 'Ferropolis, Gräfenhainichen') },
  { name: 'Nibirii',                        url: 'https://www.nibirii.de',                      scrape: scrapeGenericEvent('Nibirii Festival', ['Techno', 'Hard Techno'], 'Düren, NRW') },
  { name: 'Electric Horizon',              url: 'https://www.electric-horizon.com/en',          scrape: scrapeGenericEvent('Electric Horizon Festival', ['Hard Techno'], 'Weldegarten, Plankstadt') },
  { name: 'Toxicator',                     url: 'https://www.toxicator.de',                    scrape: scrapeGenericEvent('Toxicator', ['Hardcore', 'Hard Techno', 'Hardstyle'], 'Maimarkthalle, Mannheim') },
  { name: 'Airbeat One',                   url: 'https://www.airbeat-one.de',                  scrape: scrapeGenericEvent('Airbeat One', ['EDM', 'Techno', 'Hardstyle'], 'Flughafen Neustadt-Glewe') },
  { name: 'Open Beatz',                    url: 'https://www.openbeatz.de',                    scrape: scrapeGenericEvent('Open Beatz', ['Techno', 'Hard Techno', 'EDM'], 'bei Herzogenaurach') },
  { name: 'Hexon Festival',               url: 'https://www.lokschuppen-bielefeld.de',          scrape: scrapeGenericEvent('Hexon Festival', ['Techno', 'Trance', 'Electronic'], 'Lokschuppen Bielefeld') },
];

// ─── HTTP FETCH ───

async function fetchPage(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RaveIntoGraveScraper/1.0)',
        'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8'
      },
      timeout: 12000
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (err) {
    console.warn(`  ⚠️  ${url}: ${err.message}`);
    return null;
  }
}

// ─── SCRAPER-FUNKTIONEN ───

async function scrapeDeinFestival(url) {
  const html = await fetchPage(url);
  if (!html) return [];
  const $ = cheerio.load(html);
  const results = [];
  $('article, .festival-item, .event-item, [class*="festival"]').each((_, el) => {
    const name     = $(el).find('[class*="title"], h2, h3').first().text().trim();
    const dateText = $(el).find('[class*="date"], time, .datum').first().text().trim();
    const location = $(el).find('[class*="location"], [class*="ort"], .city').first().text().trim();
    const genreText= $(el).find('[class*="genre"], [class*="tag"], .kategorie').text().toLowerCase();
    const link     = $(el).find('a').first().attr('href') || '';
    if (!name || name.length < 3) return;
    if (!hasRelevantGenre(genreText + ' ' + name.toLowerCase())) return;
    results.push(normalizeEntry({ name, dateText, location, genreText, link, source: 'dein-festival.de' }));
  });
  return results.filter(Boolean);
}

async function scrapeFestivalAlarm(url) {
  const html = await fetchPage(url);
  if (!html) return [];
  const $ = cheerio.load(html);
  const results = [];
  $('.festival, .event, [class*="festival-card"], .veranstaltung').each((_, el) => {
    const name     = $(el).find('h2, h3, .name, [class*="title"]').first().text().trim();
    const dateText = $(el).find('.date, time, [class*="date"]').first().text().trim();
    const location = $(el).find('.location, .ort, .venue, [class*="location"]').first().text().trim();
    const genreText= $(el).find('.genre, .tags, [class*="genre"]').text().toLowerCase();
    const link     = $(el).find('a').first().attr('href') || '';
    if (!name || name.length < 3) return;
    if (!hasRelevantGenre(genreText + ' ' + name.toLowerCase())) return;
    results.push(normalizeEntry({ name, dateText, location, genreText, link, source: 'festival-alarm.com' }));
  });
  return results.filter(Boolean);
}

async function scrapeHardtours(url) {
  const html = await fetchPage(url);
  if (!html) return [];
  const $ = cheerio.load(html);
  const results = [];
  $('table tr, .event-row, .festival-row, article').each((_, el) => {
    const cells = $(el).find('td');
    let name, dateText, location, genreText, link;
    if (cells.length >= 3) {
      dateText  = $(cells[0]).text().trim();
      name      = $(cells[1]).text().trim();
      location  = $(cells[2]).text().trim();
      genreText = $(cells[3] || cells[1]).text().toLowerCase();
      link      = $(cells[1]).find('a').attr('href') || $(el).find('a').first().attr('href') || '';
    } else {
      name      = $(el).find('[class*="title"], h2, h3, strong').first().text().trim();
      dateText  = $(el).find('[class*="date"], time').first().text().trim();
      location  = $(el).find('[class*="location"], [class*="ort"]').first().text().trim();
      genreText = $(el).find('[class*="genre"]').text().toLowerCase();
      link      = $(el).find('a').first().attr('href') || '';
    }
    if (!name || name.length < 3) return;
    results.push(normalizeEntry({ name, dateText, location, genreText: genreText || 'techno', link, source: 'hardtours.de' }));
  });
  return results.filter(Boolean);
}

async function scrapeFestivalTicker(url) {
  const html = await fetchPage(url);
  if (!html) return [];
  const $ = cheerio.load(html);
  const results = [];
  $('.festival-entry, .ft-event, article, .event').each((_, el) => {
    const name     = $(el).find('h2, h3, .title, [class*="name"]').first().text().trim();
    const dateText = $(el).find('time, .date, [class*="date"]').first().text().trim();
    const location = $(el).find('.location, .ort, [class*="venue"]').first().text().trim();
    const genreText= $(el).find('.genre, .tag, [class*="genre"]').text().toLowerCase();
    const link     = $(el).find('a').first().attr('href') || '';
    if (!name || name.length < 3) return;
    if (!hasRelevantGenre(genreText + ' ' + name.toLowerCase())) return;
    if (isClubEvent(location)) return;
    results.push(normalizeEntry({ name, dateText, location, genreText, link, source: 'festivalticker.de' }));
  });
  return results.filter(Boolean);
}

async function scrapeFestivalHopper(url, allowForeign = false) {
  const html = await fetchPage(url);
  if (!html) return [];
  const $ = cheerio.load(html);
  const results = [];
  $('.festival, .festival-item, article, [class*="festival"]').each((_, el) => {
    const name     = $(el).find('h2, h3, .title, [class*="name"]').first().text().trim();
    const dateText = $(el).find('time, .date, [class*="date"], [class*="zeit"]').first().text().trim();
    const location = $(el).find('.location, .ort, .city, [class*="location"]').first().text().trim();
    const genreText= $(el).find('.genre, .tag, [class*="genre"], [class*="stile"]').text().toLowerCase();
    const link     = $(el).find('a').first().attr('href') || '';
    if (!name || name.length < 3) return;
    if (!hasRelevantGenre(genreText + ' ' + name.toLowerCase())) return;
    if (isClubEvent(location)) return;
    results.push(normalizeEntry({ name, dateText, location, genreText: genreText || 'techno', link, source: 'festivalhopper.de', allowForeign }));
  });
  return results.filter(Boolean);
}

async function scrapeFestivalGuide(url) {
  const html = await fetchPage(url);
  if (!html) return [];
  const $ = cheerio.load(html);
  const results = [];
  $('article, .festival-card, .event, [class*="festival"]').each((_, el) => {
    const name     = $(el).find('h1, h2, h3, [class*="title"]').first().text().trim();
    const dateText = $(el).find('time, [class*="date"], [class*="datum"]').first().text().trim();
    const location = $(el).find('[class*="location"], [class*="ort"], [class*="venue"]').first().text().trim();
    const genreText= $(el).find('[class*="genre"], [class*="tag"]').text().toLowerCase();
    const link     = $(el).find('a').first().attr('href') || '';
    if (!name || name.length < 3) return;
    if (!hasRelevantGenre(genreText + ' ' + name.toLowerCase())) return;
    if (isClubEvent(location)) return;
    results.push(normalizeEntry({ name, dateText, location, genreText: genreText || 'techno', link, source: 'festivalguide.de' }));
  });
  return results.filter(Boolean);
}

async function scrapeEventbrite(url) {
  const results = [];
  for (let page = 1; page <= 4; page++) {
    const pageUrl = page === 1 ? url : `${url}?page=${page}`;
    const html = await fetchPage(pageUrl);
    if (!html) continue;
    const $ = cheerio.load(html);
    $('[data-testid="event-card"], .eds-event-card, article, .search-event-card').each((_, el) => {
      const name     = $(el).find('h2, h3, [data-testid="event-card-title"]').first().text().trim();
      const dateText = $(el).find('time, [data-testid="event-card-date"]').first().text().trim();
      const location = $(el).find('[data-testid="event-card-venue"]').first().text().trim();
      const link     = $(el).find('a').first().attr('href') || '';
      if (!name || name.length < 3) return;
      const nameLower = name.toLowerCase();
      if (!nameLower.includes('festival') && !nameLower.includes('open air') && !nameLower.includes('open-air')) return;
      if (isClubEvent(location)) return;
      if (!hasRelevantGenre(nameLower)) return;
      results.push(normalizeEntry({ name, dateText, location, genreText: 'techno', link: link.startsWith('http') ? link : `https://www.eventbrite.de${link}`, source: 'eventbrite.de' }));
    });
  }
  return results.filter(Boolean);
}

async function scrapeGoabase(url) {
  const html = await fetchPage(url);
  if (!html) return [];
  const $ = cheerio.load(html);
  const results = [];
  $('table tr, .party-item, .event-row').each((_, el) => {
    const name     = $(el).find('a, .name, td:nth-child(2)').first().text().trim();
    const dateText = $(el).find('td:first-child, .date, time').first().text().trim();
    const location = $(el).find('td:nth-child(3), .location, .city').first().text().trim();
    const genreText= $(el).find('td:nth-child(4), .genre').text().toLowerCase();
    const link     = $(el).find('a').first().attr('href') || '';
    if (!name || name.length < 3) return;
    if (!hasRelevantGenre(genreText + ' ' + name.toLowerCase())) return;
    if (isClubEvent(location)) return;
    results.push(normalizeEntry({ name, dateText, location, genreText: genreText || 'techno', link, source: 'goabase.net' }));
  });
  return results.filter(Boolean);
}

// Verknipt direkt scrapen — sucht nach Datum-Links auf der Tickets-Seite
async function scrapeVerknipt(url) {
  const html = await fetchPage(url);
  if (!html) return [];
  const $ = cheerio.load(html);
  const results = [];
  $('a, .event, article, [class*="event"], [class*="festival"]').each((_, el) => {
    const text = $(el).text().trim();
    const link = $(el).attr('href') || $(el).find('a').first().attr('href') || '';
    const dateMatch = text.match(/(\d{1,2})[.\s\/](\d{1,2})[.\s\/](202[6-9]|20[3-9]\d)/);
    if (!dateMatch) return;
    const name = text.replace(/\s+/g, ' ').trim().substring(0, 60) || 'Verknipt Event';
    const dateText = dateMatch[0];
    const location = text.toLowerCase().includes('amsterdam') ? 'Amsterdam (NL)'
                   : text.toLowerCase().includes('oberhausen') ? 'Turbinenhalle, Oberhausen'
                   : text.toLowerCase().includes('utrecht') ? 'Utrecht (NL)'
                   : text.toLowerCase().includes('rotterdam') ? 'Rotterdam (NL)'
                   : 'Niederlande';
    const fullLink = link.startsWith('http') ? link : `https://www.verknipt.org${link}`;
    results.push(normalizeEntry({ name: `VERKNIPT — ${location.toUpperCase()}`, dateText, location, genreText: 'hard techno', link: fullLink, source: 'verknipt.org', allowForeign: true }));
  });
  return results.filter(Boolean);
}

// Generischer Scraper für spezifische Festival-Websites — sucht nur nach Datum-Updates
function scrapeGenericEvent(festivalName, genres, defaultLocation) {
  return async function(url) {
    const html = await fetchPage(url);
    if (!html) return [];
    const $ = cheerio.load(html);
    const results = [];
    const bodyText = $('body').text();
    // Suche nach Jahres-Datumsangaben im Text
    const dateMatches = [...bodyText.matchAll(/(\d{1,2})[.\s\/–-]+(\d{1,2})[.\s\/–-]+(202[6-9]|20[3-9]\d)/g)];
    const seen = new Set();
    for (const m of dateMatches) {
      const dateText = m[0].trim();
      const year = m[3];
      const month = m[2].padStart(2, '0');
      const day = m[1].padStart(2, '0');
      const isoDate = `${year}-${month}-${day}`;
      if (seen.has(isoDate)) continue;
      seen.add(isoDate);
      results.push({
        name: festivalName.toUpperCase(),
        date: isoDate,
        dateDisplay: dateText.substring(0, 40),
        location: defaultLocation,
        genre: genres,
        url,
        soldOut: false,
        description: '',
        _source: url
      });
    }
    return results;
  };
}

// ─── HELPERS ───

function hasRelevantGenre(text) {
  return GENRE_KEYWORDS.some(kw => text.includes(kw));
}

function isClubEvent(location) {
  return CLUB_ONLY_PATTERN.test(location);
}

function parseDate(dateText) {
  if (!dateText) return null;
  const clean = dateText.replace(/[^\d./-]/g, ' ').trim();
  const m1 = clean.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (m1) return `${m1[3]}-${m1[2].padStart(2,'0')}-${m1[1].padStart(2,'0')}`;
  const m2 = clean.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m2) return m2[0];
  return null;
}

function extractGenres(genreText, name) {
  const combined = (genreText + ' ' + name).toLowerCase();
  const genres = [];
  if (combined.includes('hard techno') || combined.includes('hardtechno')) genres.push('Hard Techno');
  if (combined.includes('schranz')) genres.push('Schranz');
  if (combined.includes('hardcore')) genres.push('Hardcore');
  if (combined.includes('hardstyle')) genres.push('Hardstyle');
  if (combined.includes('psytrance') || combined.includes('psy trance')) genres.push('Psytrance');
  if (combined.includes('trance') && !genres.includes('Psytrance')) genres.push('Trance');
  if (combined.includes('techno') && !genres.includes('Hard Techno')) genres.push('Techno');
  if (genres.length === 0) genres.push('Techno');
  return genres;
}

function normalizeEntry({ name, dateText, location, genreText, link, source, allowForeign = false }) {
  if (!name) return null;
  const date = parseDate(dateText);
  if (!date) return null;

  // Nur Events innerhalb der nächsten 365 Tage
  const eventDate = new Date(date);
  const today = new Date();
  const cutoff = new Date();
  cutoff.setDate(today.getDate() + DAYS_AHEAD);
  if (eventDate < today || eventDate > cutoff) return null;

  // Ausland ausschließen (außer wenn allowForeign)
  if (!allowForeign) {
    const foreignIndicators = ['austria', 'österreich', 'schweiz', 'switzerland', 'belgium', 'netherlands', 'france', 'uk ', 'united kingdom', 'croatia', 'belgien'];
    if (foreignIndicators.some(f => (location + ' ' + name).toLowerCase().includes(f))) return null;
  }

  const genres = extractGenres(genreText, name);
  return {
    name: name.toUpperCase().substring(0, 80),
    date,
    dateDisplay: dateText.substring(0, 40),
    location: location || 'Deutschland',
    genre: genres,
    url: link && link.startsWith('http') ? link : (link ? `https://${source}${link}` : ''),
    soldOut: false,
    description: '',
    _source: source
  };
}

// ─── BESTEHENDE FESTIVALS LADEN ───

async function loadExistingFestivals() {
  try {
    const filePath = path.resolve(__dirname, '../data/festivals.js');
    // Cache-buster damit Node nicht die gecachte Version nimmt
    const fileUrl = new URL(`file:///${filePath.replace(/\\/g, '/')}`);
    fileUrl.searchParams.set('v', Date.now());
    const mod = await import(fileUrl.href);
    const festivals = mod.default || [];
    return Array.isArray(festivals) ? festivals : [];
  } catch (err) {
    console.warn('⚠️  Konnte bestehende festivals.js nicht laden:', err.message);
    return [];
  }
}

// ─── MERGE — nur neue Events hinzufügen ───

function mergeNewFestivals(existing, scraped) {
  // Erstelle einen Key aus Name+Datum für Duplikat-Erkennung
  const existingKeys = new Set(
    existing.map(f => nameKey(f.name) + f.date)
  );

  const newEntries = [];
  for (const entry of scraped) {
    const key = nameKey(entry.name) + entry.date;
    if (!existingKeys.has(key)) {
      existingKeys.add(key);
      newEntries.push(entry);
    }
  }
  return newEntries;
}

function nameKey(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20);
}

// ─── OUTPUT ───

async function writeOutput(festivals) {
  const today = new Date().toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  const js = `// Daten zuletzt aktualisiert: ${today}
// Automatisch gepflegt von scraper/fetch_festivals.js — manuelle Einträge bleiben erhalten.

const festivals = ${JSON.stringify(festivals, null, 2)};

export default festivals;
`;
  const outPath = path.resolve(__dirname, '../data/festivals.js');
  await fs.writeFile(outPath, js, 'utf-8');
  console.log(`\n✅ ${festivals.length} Festivals nach ${outPath} geschrieben.`);
}

// ─── MAIN ───

async function main() {
  console.log('🔍 Rave into Grave — Festival Scraper\n');

  // 1. Bestehende Festivals laden
  const existing = await loadExistingFestivals();
  console.log(`📂 Bestehende Einträge geladen: ${existing.length}`);

  // 2. Alle Quellen scrapen
  const allScraped = [];
  const allSources = [...LIST_SOURCES, ...SPECIFIC_SOURCES];

  for (const source of allSources) {
    console.log(`▶ ${source.name}`);
    try {
      const results = await source.scrape(source.url);
      console.log(`  → ${results.length} Einträge gefunden`);
      allScraped.push(...results);
    } catch (err) {
      console.warn(`  ⚠️  Fehler: ${err.message}`);
    }
  }

  // 3. Nur neue Events hinzufügen
  const newEntries = mergeNewFestivals(existing, allScraped);
  console.log(`\n🆕 Neue Events gefunden: ${newEntries.length}`);

  if (newEntries.length === 0) {
    console.log('✅ Keine neuen Events — festivals.js bleibt unverändert.');
    return;
  }

  // 4. Merge und nach Datum sortieren
  const merged = [...existing, ...newEntries];
  merged.sort((a, b) => new Date(a.date) - new Date(b.date));

  newEntries.forEach(e => console.log(`  + ${e.name} (${e.date}) — ${e.location}`));

  await writeOutput(merged);
  console.log('\n⚡ Fertig!');
}

main().catch(console.error);
