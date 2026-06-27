#!/usr/bin/env node
/**
 * Rave into Grave — Festival Scraper
 * Führe aus mit: node fetch_festivals.js
 * Aktualisiert ../data/festivals.js mit neuen Festival-Daten
 */

import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── KONFIGURATION ───

const GENRE_KEYWORDS = ['techno', 'hard techno', 'hardtechno', 'schranz', 'hardcore', 'hard core'];
const EXCLUDE_VENUE_KEYWORDS = ['club', 'bar', 'lounge', 'disco', 'kneipe', 'kulturzentrum', 'halle', 'werk'];
// Hinweis: Hallen/Kulturzentren werden NICHT ausgeschlossen, nur reine Clubs

const CLUB_ONLY_PATTERN = /\b(club|bar|lounge)\b/i;

const SOURCES = [
  {
    name: 'dein-festival.de',
    url: 'https://www.dein-festival.de/festivals/techno-festivals-2026',
    scrape: scrapeDeinFestival
  },
  {
    name: 'dein-festival.de (Hard Techno)',
    url: 'https://www.dein-festival.de/festivals/hard-techno-festivals',
    scrape: scrapeDeinFestival
  },
  {
    name: 'festival-alarm.com',
    url: 'https://www.festival-alarm.com/Kategorien/Electro-Festivals/year/2026',
    scrape: scrapeFestivalAlarm
  },
  {
    name: 'festival-alarm.com (2027)',
    url: 'https://www.festival-alarm.com/Kategorien/Electro-Festivals/year/2027',
    scrape: scrapeFestivalAlarm
  },
  {
    name: 'hardtours.de',
    url: 'https://www.hardtours.de/festivals',
    scrape: scrapeHardtours
  },
  {
    name: 'festivalticker.de',
    url: 'https://www.festivalticker.de/festivals/genre/elektronische_festivals/',
    scrape: scrapeFestivalTicker
  },
  {
    name: 'festivalticker.de (techno)',
    url: 'https://www.festivalticker.de/festivals/genre/techno/',
    scrape: scrapeFestivalTicker
  },
  {
    name: 'festivalhopper.de',
    url: 'https://www.festivalhopper.de/festivals/suche/?genre%5B%5D=Techno&land=DE',
    scrape: scrapeFestivalHopper
  },
  {
    name: 'festivalhopper.de (hard techno)',
    url: 'https://www.festivalhopper.de/festivals/suche/?genre%5B%5D=Hard+Techno&land=DE',
    scrape: scrapeFestivalHopper
  },
  {
    name: 'festivalguide.de',
    url: 'https://www.festivalguide.de/festivals/techno',
    scrape: scrapeFestivalGuide
  },
  {
    name: 'goabase.net',
    url: 'https://www.goabase.net/party/list/?country=de&genre=techno',
    scrape: scrapeGoabase
  },
  {
    name: 'eventbrite.de (techno)',
    url: 'https://www.eventbrite.de/d/germany/techno-festival/',
    scrape: scrapeEventbrite
  },
  {
    name: 'eventbrite.de (hard techno)',
    url: 'https://www.eventbrite.de/d/germany/hard-techno-festival/',
    scrape: scrapeEventbrite
  },
  {
    name: 'eventbrite.de (schranz)',
    url: 'https://www.eventbrite.de/d/germany/schranz-festival/',
    scrape: scrapeEventbrite
  },
  {
    name: 'eventbrite.de (electronic outdoor)',
    url: 'https://www.eventbrite.de/d/germany/electronic-open-air/',
    scrape: scrapeEventbrite
  }
];

// ─── SCRAPER-FUNKTIONEN ───

async function fetchPage(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RaveIntoGraveScraper/1.0; +https://github.com/Niko24994/Rave-into-Grave)',
        'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8'
      },
      timeout: 10000
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (err) {
    console.warn(`  ⚠️  Fehler beim Laden von ${url}: ${err.message}`);
    return null;
  }
}

async function scrapeDeinFestival(url) {
  const html = await fetchPage(url);
  if (!html) return [];
  const $ = cheerio.load(html);
  const results = [];

  // Generisches Parsing — Struktur ggf. anpassen wenn Site sich ändert
  $('article, .festival-item, .event-item, [class*="festival"]').each((_, el) => {
    const name = $(el).find('[class*="title"], h2, h3').first().text().trim();
    const dateText = $(el).find('[class*="date"], time, .datum').first().text().trim();
    const location = $(el).find('[class*="location"], [class*="ort"], .city').first().text().trim();
    const genreText = $(el).find('[class*="genre"], [class*="tag"], .kategorie').text().toLowerCase();
    const link = $(el).find('a').first().attr('href') || '';

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
    const name = $(el).find('h2, h3, .name, [class*="title"]').first().text().trim();
    const dateText = $(el).find('.date, time, [class*="date"]').first().text().trim();
    const location = $(el).find('.location, .ort, .venue, [class*="location"]').first().text().trim();
    const genreText = $(el).find('.genre, .tags, [class*="genre"]').text().toLowerCase();
    const link = $(el).find('a').first().attr('href') || '';

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

  // hardtours.de ist spezialisiert auf Hard Music — alle Einträge sind relevant
  $('table tr, .event-row, .festival-row, article').each((_, el) => {
    const cells = $(el).find('td');
    let name, dateText, location, genreText, link;

    if (cells.length >= 3) {
      dateText = $(cells[0]).text().trim();
      name = $(cells[1]).text().trim();
      location = $(cells[2]).text().trim();
      genreText = $(cells[3] || cells[1]).text().toLowerCase();
      link = $(cells[1]).find('a').attr('href') || $(el).find('a').first().attr('href') || '';
    } else {
      name = $(el).find('[class*="title"], h2, h3, strong').first().text().trim();
      dateText = $(el).find('[class*="date"], time').first().text().trim();
      location = $(el).find('[class*="location"], [class*="ort"]').first().text().trim();
      genreText = $(el).find('[class*="genre"]').text().toLowerCase();
      link = $(el).find('a').first().attr('href') || '';
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
    const name = $(el).find('h2, h3, .title, [class*="name"]').first().text().trim();
    const dateText = $(el).find('time, .date, [class*="date"]').first().text().trim();
    const location = $(el).find('.location, .ort, [class*="venue"]').first().text().trim();
    const genreText = $(el).find('.genre, .tag, [class*="genre"]').text().toLowerCase();
    const link = $(el).find('a').first().attr('href') || '';

    if (!name || name.length < 3) return;
    if (!hasRelevantGenre(genreText + ' ' + name.toLowerCase())) return;
    if (isClubEvent(location)) return;

    results.push(normalizeEntry({ name, dateText, location, genreText, link, source: 'festivalticker.de' }));
  });

  return results.filter(Boolean);
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

  // DD.MM.YYYY
  const m1 = clean.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (m1) return `${m1[3]}-${m1[2].padStart(2,'0')}-${m1[1].padStart(2,'0')}`;

  // YYYY-MM-DD
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

function normalizeEntry({ name, dateText, location, genreText, link, source }) {
  if (!name) return null;
  const date = parseDate(dateText);
  const genres = extractGenres(genreText, name);
  if (!date) return null;

  // Nur Deutschland-Festivals (grobe Heuristik — keine Länder-Keywords)
  const foreignIndicators = ['austria', 'österreich', 'schweiz', 'switzerland', 'belgium', 'netherlands', 'netherlands', 'france', 'uk ', 'united kingdom'];
  if (foreignIndicators.some(f => (location + ' ' + name).toLowerCase().includes(f))) return null;

  return {
    name: name.toUpperCase().substring(0, 80),
    date,
    dateDisplay: dateText.substring(0, 40),
    location: location || 'Deutschland',
    genre: genres,
    url: link.startsWith('http') ? link : `https://${source}${link}`,
    soldOut: false,
    description: '',
    _source: source
  };
}

async function scrapeFestivalHopper(url) {
  const html = await fetchPage(url);
  if (!html) return [];
  const $ = cheerio.load(html);
  const results = [];

  $('.festival, .festival-item, article, [class*="festival"]').each((_, el) => {
    const name = $(el).find('h2, h3, .title, [class*="name"]').first().text().trim();
    const dateText = $(el).find('time, .date, [class*="date"], [class*="zeit"]').first().text().trim();
    const location = $(el).find('.location, .ort, .city, [class*="location"]').first().text().trim();
    const genreText = $(el).find('.genre, .tag, [class*="genre"], [class*="stile"]').text().toLowerCase();
    const link = $(el).find('a').first().attr('href') || '';

    if (!name || name.length < 3) return;
    if (!hasRelevantGenre(genreText + ' ' + name.toLowerCase())) return;
    if (isClubEvent(location)) return;

    results.push(normalizeEntry({ name, dateText, location, genreText: genreText || 'techno', link, source: 'festivalhopper.de' }));
  });

  return results.filter(Boolean);
}

async function scrapeFestivalGuide(url) {
  const html = await fetchPage(url);
  if (!html) return [];
  const $ = cheerio.load(html);
  const results = [];

  $('article, .festival-card, .event, [class*="festival"]').each((_, el) => {
    const name = $(el).find('h1, h2, h3, [class*="title"]').first().text().trim();
    const dateText = $(el).find('time, [class*="date"], [class*="datum"]').first().text().trim();
    const location = $(el).find('[class*="location"], [class*="ort"], [class*="venue"]').first().text().trim();
    const genreText = $(el).find('[class*="genre"], [class*="tag"]').text().toLowerCase();
    const link = $(el).find('a').first().attr('href') || '';

    if (!name || name.length < 3) return;
    if (!hasRelevantGenre(genreText + ' ' + name.toLowerCase())) return;
    if (isClubEvent(location)) return;

    results.push(normalizeEntry({ name, dateText, location, genreText: genreText || 'techno', link, source: 'festivalguide.de' }));
  });

  return results.filter(Boolean);
}

async function scrapeEventbrite(url) {
  const results = [];
  // Eventbrite hat 11+ Seiten — wir scrapen die ersten 4
  for (let page = 1; page <= 4; page++) {
    const pageUrl = page === 1 ? url : `${url}?page=${page}`;
    const html = await fetchPage(pageUrl);
    if (!html) continue;
    const $ = cheerio.load(html);

    $('[data-testid="event-card"], .eds-event-card, article, .search-event-card').each((_, el) => {
      const name = $(el).find('h2, h3, [data-testid="event-card-title"], .eds-event-card__formatted-name').first().text().trim();
      const dateText = $(el).find('time, [data-testid="event-card-date"], .eds-event-card__sub-title').first().text().trim();
      const location = $(el).find('[data-testid="event-card-venue"], .card-text--truncated__one').first().text().trim();
      const link = $(el).find('a').first().attr('href') || '';

      if (!name || name.length < 3) return;
      // Nur echte Festivals — mindestens "festival", "open air", "open-air" im Namen
      const nameLower = name.toLowerCase();
      if (!nameLower.includes('festival') && !nameLower.includes('open air') && !nameLower.includes('open-air')) return;
      if (isClubEvent(location)) return;
      if (!hasRelevantGenre(nameLower)) return;

      results.push(normalizeEntry({
        name, dateText, location,
        genreText: 'techno',
        link: link.startsWith('http') ? link : `https://www.eventbrite.de${link}`,
        source: 'eventbrite.de'
      }));
    });
  }
  return results.filter(Boolean);
}

async function scrapeGoabase(url) {
  const html = await fetchPage(url);
  if (!html) return [];
  const $ = cheerio.load(html);
  const results = [];

  // goabase.net hat Tabellen-Layout
  $('table tr, .party-item, .event-row').each((_, el) => {
    const name = $(el).find('a, .name, td:nth-child(2)').first().text().trim();
    const dateText = $(el).find('td:first-child, .date, time').first().text().trim();
    const location = $(el).find('td:nth-child(3), .location, .city').first().text().trim();
    const genreText = $(el).find('td:nth-child(4), .genre').text().toLowerCase();
    const link = $(el).find('a').first().attr('href') || '';

    if (!name || name.length < 3) return;
    if (!hasRelevantGenre(genreText + ' ' + name.toLowerCase())) return;
    if (isClubEvent(location)) return;

    results.push(normalizeEntry({ name, dateText, location, genreText: genreText || 'techno', link, source: 'goabase.net' }));
  });

  return results.filter(Boolean);
}

// ─── DEDUPLICATION ───

function deduplicate(entries) {
  const seen = new Map();
  for (const entry of entries) {
    const key = entry.name.replace(/\s+/g, '').toLowerCase() + entry.date;
    if (!seen.has(key)) {
      seen.set(key, entry);
    }
  }
  return [...seen.values()];
}

// ─── OUTPUT ───

async function writeOutput(festivals) {
  const today = new Date().toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  const js = `// Daten zuletzt aktualisiert: ${today} — Daten immer auf der offiziellen Website prüfen
// Automatisch generiert von scraper/fetch_festivals.js

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
  console.log('Scraping Quellen...\n');

  const allResults = [];

  for (const source of SOURCES) {
    console.log(`▶ ${source.name}`);
    try {
      const results = await source.scrape(source.url);
      console.log(`  → ${results.length} Einträge gefunden`);
      allResults.push(...results);
    } catch (err) {
      console.warn(`  ⚠️  Fehler: ${err.message}`);
    }
  }

  const deduped = deduplicate(allResults);
  console.log(`\n📊 Gesamt vor Dedup: ${allResults.length}, nach Dedup: ${deduped.length}`);

  // Nach Datum sortieren
  deduped.sort((a, b) => new Date(a.date) - new Date(b.date));

  if (deduped.length === 0) {
    console.log('\n⚠️  Keine neuen Daten gefunden. Die bestehende festivals.js wird NICHT überschrieben.');
    console.log('   Hinweis: Websites ändern ihr HTML-Markup häufig. Ggf. Scraper anpassen.');
    return;
  }

  await writeOutput(deduped);
  console.log('\n⚡ Fertig! Seite neu laden um Änderungen zu sehen.');
}

main().catch(console.error);
