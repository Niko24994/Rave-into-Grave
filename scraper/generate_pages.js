#!/usr/bin/env node
/**
 * Rave into Grave — Detailseiten-Generator
 *
 * Baut für jedes Festival in data/festivals.js eine eigene statische Seite
 * unter /festival/<slug>/index.html — eigene URL, eigene Meta-Tags, eigenes
 * JSON-LD Event-Schema. Aktualisiert sitemap.xml entsprechend.
 *
 * Läuft automatisch nach dem Scraper (siehe .github/workflows/daily-update.yml).
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const FESTIVALS_PATH = path.join(ROOT, 'data/festivals.js');
const SITE_URL = 'https://niko24994.github.io/Rave-into-Grave/';

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const SKIP_FETCH_DOMAINS = new Set([
  'eventbrite.de', 'eventbrite.com', 'eventbrite.nl', 'ra.co', 'holypriest.os.fan'
]);

async function fetchRichDescription(url) {
  if (!url) return null;
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    if ([...SKIP_FETCH_DOMAINS].some(d => domain === d || domain.endsWith('.' + d))) return null;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const $ = cheerio.load(html);
    const isGeneric = t => /offiz\. website zur veranstalt|infos zum lineup, tickets, anreise/i.test(t);
    const og = $('meta[property="og:description"]').attr('content')?.trim();
    if (og && og.length > 40 && !isGeneric(og)) return og;
    const meta = $('meta[name="description"]').attr('content')?.trim();
    if (meta && meta.length > 40 && !isGeneric(meta)) return meta;
    $('nav, footer, header, script, style, [class*="cookie"], [class*="nav"]').remove();
    const paras = [];
    $('p').each((_, el) => {
      const t = $(el).text().replace(/\s+/g, ' ').trim();
      if (t.length >= 60 && t.length <= 500 && !/cookie|impressum|datenschutz|privacy/i.test(t)) paras.push(t);
    });
    return paras.length > 0 ? paras.slice(0, 2).join(' ') : null;
  } catch { return null; }
}

const TAG_CLASS = {
  'Hard Techno': 'tag-hard-techno', 'Schranz': 'tag-schranz', 'Techno': 'tag-techno',
  'Hardcore': 'tag-hardcore', 'Hardstyle': 'tag-hardstyle', 'Trance': 'tag-trance',
  'Psytrance': 'tag-psytrance', 'EDM': 'tag-edm', 'Experimental': 'tag-experimental',
  'House': 'tag-house'
};

function renderPage(f, slug, richDesc) {
  const isNL = f.location.includes('(NL)') || f.location.toLowerCase().includes('amsterdam') || f.location.toLowerCase().includes('netherlands');
  const tags = f.genre.map(g =>
    `<span class="genre-tag ${TAG_CLASS[g] || ''}">${escapeHtml(g.toUpperCase())}</span>`
  ).join('');

  const displayDesc = richDesc || f.description;
  const title = `${f.name} – ${f.dateDisplay} in ${f.location} | Rave into Grave`;
  const desc = `${displayDesc} ${f.dateDisplay} in ${f.location}.`.trim().slice(0, 300);
  const pageUrl = `${SITE_URL}festival/${slug}/`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    "name": f.name,
    "startDate": f.date,
    "description": f.description || `${f.name} — ${f.location}`,
    "url": pageUrl,
    "eventStatus": "https://schema.org/EventScheduled",
    "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
    "location": {
      "@type": "Place",
      "name": f.location,
      "address": {
        "@type": "PostalAddress",
        "addressLocality": f.location.split(',').pop().trim(),
        "addressCountry": isNL ? "NL" : "DE"
      }
    },
    "organizer": {
      "@type": "Organization",
      "name": f.name.replace(/\s*\d{4}\s*$/, '').trim(),
      "url": f.url || ""
    }
  };

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(desc)}" />

  <meta property="og:title" content="${escapeHtml(f.name)} | Rave into Grave" />
  <meta property="og:description" content="${escapeHtml(desc)}" />
  <meta property="og:image" content="${SITE_URL}og-image.svg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:url" content="${pageUrl}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Rave into Grave" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(f.name)} | Rave into Grave" />
  <meta name="twitter:description" content="${escapeHtml(desc)}" />
  <meta name="twitter:image" content="${SITE_URL}og-image.svg" />

  <!-- Google Analytics -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-1H6JCW8DEJ"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-1H6JCW8DEJ');
  </script>

  <link rel="canonical" href="${pageUrl}" />
  <link rel="icon" type="image/png" href="../../apple-touch-icon.png" />
  <link rel="apple-touch-icon" sizes="180x180" href="../../apple-touch-icon.png" />
  <link rel="stylesheet" href="../../style.css" />

  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body>

  <div class="video-bg">
    <video autoplay muted loop playsinline>
      <source src="../../bg.mp4" type="video/mp4" />
    </video>
  </div>
  <div class="video-overlay"></div>

  <header class="detail-header">
    <a href="../../" class="back-link">← ALLE FESTIVALS</a>
  </header>

  <main class="detail-main">
    <article class="card detail-card" id="detail-card">
      <div class="card-inner">
        <div class="card-header">
          <h1 class="card-name">${escapeHtml(f.name)}</h1>
          <span class="card-status-badge" id="status-badge"></span>
        </div>
        <div class="genre-tags">${tags}</div>
        <div class="card-meta">
          <div class="meta-row">
            <span class="meta-icon">▶</span>
            <span class="meta-value">${escapeHtml(f.dateDisplay)}</span>
          </div>
          <div class="meta-row">
            <span class="meta-icon">◈</span>
            <span class="meta-value">${escapeHtml(f.location)}</span>
          </div>
        </div>
        <p class="card-description">${escapeHtml(displayDesc)}</p>
        <div class="card-footer">
          <span class="countdown" id="countdown"></span>
          <div style="display:flex;gap:0.5rem;align-items:center">
            <button class="visit-btn" id="share-btn-detail" type="button">↗ TEILEN</button>
            ${f.url ? `<a class="visit-btn" href="${escapeHtml(f.url)}" target="_blank" rel="noopener noreferrer">WEBSITE →</a>` : ''}
          </div>
        </div>
      </div>
    </article>
  </main>

  <footer>
    <img class="footer-skull" src="../../apple-touch-icon.png" alt="Rave into Grave" />
    <p class="footer-disclaimer">Alle Angaben ohne Gewähr. Immer die offizielle Festival-Website checken.</p>
  </footer>

  <script>
    (function () {
      var date = ${JSON.stringify(f.date)};
      var soldOut = ${JSON.stringify(!!f.soldOut)};
      var today = new Date(); today.setHours(0,0,0,0);
      var d = new Date(date); d.setHours(0,0,0,0);
      var days = Math.round((d - today) / 86400000);

      var status, badgeText, badgeClass;
      if (soldOut)        { status = 'sold-out'; badgeText = 'AUSVERKAUFT';  badgeClass = 'badge-sold-out'; }
      else if (days < 0)  { status = 'past';      badgeText = 'VERGANGEN';    badgeClass = 'badge-past'; }
      else if (days <= 30){ status = 'soon';      badgeText = 'BALD';         badgeClass = 'badge-soon'; }
      else                 { status = 'upcoming';  badgeText = 'BEVORSTEHEND'; badgeClass = 'badge-upcoming'; }

      document.getElementById('detail-card').classList.add('status-' + status);
      var badge = document.getElementById('status-badge');
      badge.textContent = badgeText;
      badge.classList.add(badgeClass);

      var countdownText;
      if (days < 0) countdownText = 'vor ' + Math.abs(days) + ' Tagen';
      else if (days === 0) countdownText = 'HEUTE !!!';
      else if (days === 1) countdownText = 'MORGEN';
      else countdownText = 'in ' + days + ' Tagen';

      var countdownClass = '';
      if (days < 0) countdownClass = 'past';
      else if (days <= 7) countdownClass = 'very-soon';
      else if (days <= 30) countdownClass = 'soon';

      var cd = document.getElementById('countdown');
      cd.textContent = countdownText;
      if (countdownClass) cd.classList.add(countdownClass);

      document.getElementById('share-btn-detail').addEventListener('click', function () {
        var text = ${JSON.stringify(f.name)} + '\\n📅 ' + ${JSON.stringify(f.dateDisplay)} + '\\n📍 ' + ${JSON.stringify(f.location)};
        var url = location.href;
        if (navigator.share) {
          navigator.share({ title: ${JSON.stringify(f.name)}, text: text, url: url }).catch(function(){});
        } else {
          window.open('https://wa.me/?text=' + encodeURIComponent('🎵 ' + text + '\\n\\n' + url), '_blank');
        }
      });
    })();
  </script>
</body>
</html>
`;
}

async function main() {
  const fileUrl = new URL(`file:///${FESTIVALS_PATH.replace(/\\/g, '/')}`);
  fileUrl.searchParams.set('v', Date.now());
  const mod = await import(fileUrl.href);
  const festivals = mod.default || [];

  const festivalDir = path.join(ROOT, 'festival');
  await fs.rm(festivalDir, { recursive: true, force: true });
  await fs.mkdir(festivalDir, { recursive: true });

  // 1. Slugs berechnen
  const usedSlugs = new Set();
  const entries = [];
  for (const f of festivals) {
    let slug = slugify(f.name);
    if (usedSlugs.has(slug)) slug = slugify(`${f.name}-${f.date}`);
    usedSlugs.add(slug);
    entries.push({ f, slug });
  }

  // 2. Beschreibungen von Festival-Websites holen (parallel, Batches à 6)
  process.stdout.write('📖 Beschreibungen abrufen');
  const richDescs = new Map();
  const BATCH = 6;
  for (let i = 0; i < entries.length; i += BATCH) {
    const batch = entries.slice(i, i + BATCH);
    const results = await Promise.all(batch.map(({ f }) => fetchRichDescription(f.url)));
    batch.forEach(({ slug }, j) => { if (results[j]) richDescs.set(slug, results[j]); });
    process.stdout.write('.');
  }
  console.log(` ${richDescs.size}/${entries.length} gefunden`);

  // 3. HTML-Seiten schreiben
  for (const { f, slug } of entries) {
    const dir = path.join(festivalDir, slug);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, 'index.html'), renderPage(f, slug, richDescs.get(slug) || null), 'utf-8');
  }

  const urlEntries = [
    `  <url>\n    <loc>${SITE_URL}</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>`,
    ...entries.map(({ slug }) =>
      `  <url>\n    <loc>${SITE_URL}festival/${slug}/</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`
    )
  ];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlEntries.join('\n')}\n</urlset>\n`;
  await fs.writeFile(path.join(ROOT, 'sitemap.xml'), sitemap, 'utf-8');

  console.log(`✅ ${entries.length} Detailseiten generiert + sitemap.xml aktualisiert.`);
}

main().catch(err => {
  console.error('❌ Fehler beim Generieren der Detailseiten:', err);
  process.exit(1);
});
