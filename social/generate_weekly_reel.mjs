#!/usr/bin/env node
/**
 * Rave into Grave — Wöchentliches Reel generieren
 *
 * Erzeugt ein 9:16-Video (1080x1920) mit allen Festivals einer Woche
 * (Montag–Sonntag), im gleichen Design wie der Monatsreel, über das
 * Website-Hintergrundvideo (bg.mp4) gelegt.
 *
 * Nutzung:
 *   node social/generate_weekly_reel.mjs [YYYY-MM-DD]
 *   (Datum = Montag der Zielwoche; ohne Argument: kommender/aktueller Montag)
 *
 * Voraussetzungen: Google Chrome + ffmpeg müssen installiert sein
 * (ffmpeg via: winget install --id Gyan.FFmpeg -e).
 *
 * Ergebnis liegt in social/output/<YYYY-MM-DD>_week_reel.mp4 (stumm — Trend-
 * Audio kommt erst beim Hochladen in der Instagram/TikTok-App dazu).
 */

import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(__dirname, 'output');
const WORK_DIR = path.join(__dirname, '.work');
const W = 1080, H = 1920;
const SHORT_SECONDS = 4;
const SHORT_THRESHOLD = 3;
const PER_PAGE = 9;

// Nur eine Seite insgesamt -> mehr Zeit zum Lesen/Screenshotten, da nichts
// weiter folgt (8s). Mehrere Seiten -> etwas knapper pro Seite, damit das
// Video nicht unnoetig lang wird (7s). Seite 1 laeuft immer die volle
// Standardzeit (auch wenn eine Woche mal duenn besetzt ist). Nur eine
// noetige Folgeseite (Hochsaison, >PER_PAGE Festivals) wird kuerzer
// angezeigt, wenn sie kaum noch Content hat.
function pageDurations(groups) {
  const defaultSeconds = groups.length === 1 ? 8 : 7;
  return groups.map((g, i) => {
    if (i === 0) return defaultSeconds;
    const isLast = i === groups.length - 1;
    return isLast && g.length <= SHORT_THRESHOLD ? SHORT_SECONDS : defaultSeconds;
  });
}

// ─── Chrome & ffmpeg finden ───

function findChrome() {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ];
  for (const p of candidates) if (fs.existsSync(p)) return p;
  throw new Error('Chrome nicht gefunden. Bitte Pfad in findChrome() ergänzen.');
}

function findFfmpeg() {
  const wingetBase = path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WinGet', 'Packages');
  if (fs.existsSync(wingetBase)) {
    const pkg = fs.readdirSync(wingetBase).find(d => d.startsWith('Gyan.FFmpeg_'));
    if (pkg) {
      const bin = fs.readdirSync(path.join(wingetBase, pkg)).find(d => d.startsWith('ffmpeg-'));
      if (bin) return path.join(wingetBase, pkg, bin, 'bin', 'ffmpeg.exe');
    }
  }
  throw new Error('ffmpeg nicht gefunden. Installieren mit: winget install --id Gyan.FFmpeg -e');
}

// ─── Festivals laden ───

function toDateStr(d) {
  // Lokales Datum, nicht toISOString() (das rechnet auf UTC um und verschiebt
  // in CEST/CET das Datum einen Tag zurueck).
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function loadAllFestivals() {
  const src = fs.readFileSync(path.join(ROOT, 'data', 'festivals.js'), 'utf-8');
  const match = src.match(/const festivals = (\[[\s\S]*?\]);/);
  return JSON.parse(match[1]);
}

function festivalsInRange(festivals, monday, endDate) {
  return festivals
    .filter(f => {
      const d = new Date(f.date + 'T00:00:00');
      return d >= monday && d <= endDate;
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

// In flauen Phasen (z.B. Jan/Feb) reicht 1 Woche oft nicht für einen vollen
// Post. Fenster wird automatisch verlaengert, bis genug zusammenkommt (oder
// das Maximum erreicht ist) — keine manuelle Entscheidung pro Woche noetig.
const MIN_FESTIVALS = 3;
const WINDOW_STEPS_DAYS = [7, 14, 21, 30];

function loadWeekFestivals(mondayStr) {
  const festivals = loadAllFestivals();
  const monday = new Date(mondayStr + 'T00:00:00');

  let chosen = null;
  for (const days of WINDOW_STEPS_DAYS) {
    const endDate = new Date(monday); endDate.setDate(endDate.getDate() + days - 1);
    const found = festivalsInRange(festivals, monday, endDate);
    chosen = { days, endDate, festivals: found };
    if (found.length >= MIN_FESTIVALS) break;
  }
  return chosen;
}

// ─── HTML-Seiten rendern (gleiches Design wie der Monatsreel) ───

const FONTS_DIR = path.join(__dirname, 'fonts');
function fontFaceCss() {
  const b64 = (file) => fs.readFileSync(path.join(FONTS_DIR, file)).toString('base64');
  return `
    @font-face { font-family:'Rajdhani'; font-style:normal; font-weight:600; font-display:block; src:url(data:font/woff2;base64,${b64('rajdhani-600.woff2')}) format('woff2'); }
    @font-face { font-family:'Rajdhani'; font-style:normal; font-weight:700; font-display:block; src:url(data:font/woff2;base64,${b64('rajdhani-700.woff2')}) format('woff2'); }
    @font-face { font-family:'Rajdhani'; font-style:normal; font-weight:800; font-display:block; src:url(data:font/woff2;base64,${b64('rajdhani-700.woff2')}) format('woff2'); }
    @font-face { font-family:'Share Tech Mono'; font-style:normal; font-weight:400; font-display:block; src:url(data:font/woff2;base64,${b64('sharetechmono-400.woff2')}) format('woff2'); }
    @font-face { font-family:'Archivo Black'; font-style:normal; font-weight:400; font-display:block; src:url(data:font/woff2;base64,${b64('archivo-black.woff2')}) format('woff2'); }
  `;
}
const FONT_IMPORT = fontFaceCss();

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function pageHtml(group, pageNum, totalPages, weekLabel, yearLabel, dateRangeTitle) {
  // Weniger Zeilen auf der Seite -> etwas mehr Abstand dazwischen, damit es
  // nicht nur "zentriert mit Leerraum drumherum" wirkt, sondern die Seite
  // insgesamt voller. Bei maximaler Belegung (9) bleibt der Abstand wie bisher.
  const rowGap = Math.min(40, 16 + Math.max(0, PER_PAGE - group.length) * 4);

  const rows = group.map(f => {
    const shortDate = f.dateDisplay.replace(new RegExp(`\\s*${yearLabel}$`), '').replace(/\s*–\s*/, '–');
    return `
      <div class="row" style="margin-bottom:${rowGap}px">
        <div class="row-date">${escapeHtml(shortDate)}</div>
        <div class="row-main">
          <div class="row-name">${escapeHtml(f.name.replace(new RegExp(`\\s*${yearLabel}$`), ''))}</div>
          <div class="row-loc">${escapeHtml(f.location)}</div>
        </div>
      </div>`;
  }).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    ${FONT_IMPORT}
    * { margin:0; padding:0; box-sizing:border-box; }
    html,body { width:${W}px; height:${H}px; background:transparent; overflow:hidden; font-family:'Rajdhani',sans-serif; }
    .overlay { position:absolute; inset:0; background: rgba(6,4,4,0.82); z-index:0; }
    .content-area { position:relative; z-index:1; height: calc(100% - 230px); display:flex; flex-direction:column; }
    .header { flex-shrink:0; padding: 130px 90px 20px; text-align:center; }
    .wordmark-logo { width:360px; margin:0 auto 26px; display:block; filter: drop-shadow(0 0 16px rgba(255,34,0,0.45)); }
    .title { font-weight:800; font-size:66px; color:#fff; text-transform:uppercase; line-height:1.05; text-shadow:0 0 20px rgba(255,45,0,0.4); }
    .title .accent { color:#ff9900; }
    .subtitle { margin-top:14px; font-family:'Share Tech Mono',monospace; font-size:31px; letter-spacing:3px; color:#ff9900; }
    .list { flex:1; min-height:0; display:flex; flex-direction:column; justify-content:center; overflow:hidden; padding: 6px 90px 0; }
    .row { display:flex; align-items:center; gap:22px; border:2px solid #ff2d00; border-radius:6px; background: rgba(255,45,0,0.06); padding: 20px 26px; margin-bottom: 16px; }
    .row-date { font-family:'Share Tech Mono',monospace; font-size:28px; color:#ff9900; font-weight:700; white-space:nowrap; width: 17ch; flex-shrink:0; }
    .row-main { flex:1; min-width:0; }
    .row-name { font-weight:700; font-size:35px; color:#fff; text-transform:uppercase; line-height:1.15; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .row-loc { font-family:'Share Tech Mono',monospace; font-size:22px; color:#aaa; margin-top:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .footer { position:absolute; z-index:1; bottom:150px; left:0; right:0; text-align:center; font-family:'Share Tech Mono',monospace; font-size:28px; letter-spacing:2px; color:#ff2d00; }
    .pagedots { position:absolute; z-index:1; bottom:205px; left:0; right:0; text-align:center; }
    .dot { display:inline-block; width:16px; height:16px; border-radius:50%; margin:0 8px; background:#555; border:1px solid #777; }
    .dot.active { background:#ff2d00; }
  </style></head>
  <body>
    <div class="overlay"></div>
    <div class="content-area">
      <div class="header">
        <svg class="wordmark-logo" viewBox="0 0 400 260" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Rave into Grave">
          <text x="202" y="112" text-anchor="middle" font-family="'Archivo Black',Impact,Arial,sans-serif" font-size="78" font-weight="900" letter-spacing="12" fill="#ff2200" opacity="0.18">RAVE</text>
          <rect x="74" y="36" width="3" height="188" fill="#ff2200" opacity="0.9"/>
          <rect x="79" y="36" width="1" height="188" fill="#ff2200" opacity="0.4"/>
          <rect x="320" y="36" width="3" height="188" fill="#ff2200" opacity="0.9"/>
          <rect x="325" y="36" width="1" height="188" fill="#ff2200" opacity="0.4"/>
          <text x="200" y="114" text-anchor="middle" font-family="'Archivo Black',Impact,Arial,sans-serif" font-size="78" font-weight="900" letter-spacing="12" fill="#ffffff">RAVE</text>
          <text x="200" y="142" text-anchor="middle" font-family="'Arial Narrow',Arial,sans-serif" font-size="25" font-weight="700" letter-spacing="12" fill="#ff5c33">I N T O</text>
          <text x="198" y="208" text-anchor="middle" font-family="'Archivo Black',Impact,Arial,sans-serif" font-size="78" font-weight="900" letter-spacing="8" fill="#ff2200" opacity="0.15">GRAVE</text>
          <text x="200" y="210" text-anchor="middle" font-family="'Archivo Black',Impact,Arial,sans-serif" font-size="78" font-weight="900" letter-spacing="8" fill="#ffffff">GRAVE</text>
        </svg>
        <div class="title">FESTIVALS <span class="accent">${escapeHtml(dateRangeTitle)}</span></div>
        <div class="subtitle">WOCHENÜBERSICHT · ${escapeHtml(yearLabel)} — SEITE ${pageNum}/${totalPages}</div>
      </div>
      <div class="list">${rows}</div>
    </div>
    <div class="pagedots">${Array.from({ length: totalPages }, (_, i) => `<span class="dot${i === pageNum - 1 ? ' active' : ''}"></span>`).join('')}</div>
    <div class="footer">mehr auf raveintograve.de</div>
  </body></html>`;
}

const MONTH_NAMES = ['JAN', 'FEB', 'MÄR', 'APR', 'MAI', 'JUN', 'JUL', 'AUG', 'SEP', 'OKT', 'NOV', 'DEZ'];
const MONTH_NAMES_FULL = ['JANUAR', 'FEBRUAR', 'MÄRZ', 'APRIL', 'MAI', 'JUNI', 'JULI', 'AUGUST', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DEZEMBER'];

function nextOrCurrentMonday() {
  const d = new Date(); d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=So, 1=Mo, ...
  const diff = day === 1 ? 0 : (8 - day) % 7 || 7;
  d.setDate(d.getDate() + (day === 1 ? 0 : diff));
  return toDateStr(d);
}

async function main() {
  const arg = process.argv[2];
  const mondayStr = arg || nextOrCurrentMonday();
  const monday = new Date(mondayStr + 'T00:00:00');

  const { days, endDate: sunday, festivals } = loadWeekFestivals(mondayStr);

  if (festivals.length === 0) {
    console.log(`Keine Festivals im Zeitraum ab ${mondayStr} gefunden (auch nach Erweiterung auf ${WINDOW_STEPS_DAYS[WINDOW_STEPS_DAYS.length - 1]} Tage) — kein Reel fuer diesen Zeitraum.`);
    return;
  }
  if (days > 7) {
    console.log(`Nur wenige Festivals in 7 Tagen — Zeitraum automatisch auf ${days} Tage erweitert.`);
  }

  const fmt = (d) => `${d.getDate()}.${MONTH_NAMES[d.getMonth()]}`;
  const weekLabel = monday.getMonth() === sunday.getMonth()
    ? `${monday.getDate()}.–${sunday.getDate()}. ${MONTH_NAMES[monday.getMonth()]} ${monday.getFullYear()}`
    : `${fmt(monday)}–${fmt(sunday)} ${sunday.getFullYear()}`;
  const yearLabel = String(monday.getFullYear());

  // Zeitloser Datumsbereich für die Überschrift (statt "nächste Woche", das
  // beim späteren Durchscrollen alter Reels nicht mehr stimmt)
  const dateRangeTitle = monday.getMonth() === sunday.getMonth()
    ? `${monday.getDate()}.–${sunday.getDate()}. ${MONTH_NAMES_FULL[monday.getMonth()]}`
    : `${monday.getDate()}. ${MONTH_NAMES_FULL[monday.getMonth()]}–${sunday.getDate()}. ${MONTH_NAMES_FULL[sunday.getMonth()]}`;

  const chrome = findChrome();
  const ffmpeg = findFfmpeg();

  console.log(`${festivals.length} Festivals für ${weekLabel}.`);

  // Gleichmässig auf Seiten verteilen (keine fast leere Restseite)
  const totalPages = Math.max(1, Math.ceil(festivals.length / PER_PAGE));
  const perPageEven = Math.ceil(festivals.length / totalPages);
  const groups = [];
  for (let i = 0; i < totalPages; i++) {
    groups.push(festivals.slice(i * perPageEven, (i + 1) * perPageEven));
  }

  fs.mkdirSync(WORK_DIR, { recursive: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const htmlFile = path.join(WORK_DIR, 'week_page.html');

  const pageFiles = [];
  for (let i = 0; i < groups.length; i++) {
    fs.writeFileSync(htmlFile, pageHtml(groups[i], i + 1, totalPages, weekLabel, yearLabel, dateRangeTitle), 'utf-8');
    const outFile = path.join(WORK_DIR, `week_page_${i + 1}.png`);
    execFileSync(chrome, [
      '--headless', '--disable-gpu', '--hide-scrollbars',
      `--screenshot=${outFile}`,
      `--window-size=${W},${H}`,
      '--default-background-color=00000000',
      `file:///${htmlFile.replace(/\\/g, '/')}?v=${i}`,
    ], { stdio: 'ignore', timeout: 15000 });
    pageFiles.push(outFile);
    console.log(`Seite ${i + 1}/${groups.length} gerendert (${groups[i].length} Festivals).`);
  }

  const durations = pageDurations(groups);
  const totalDuration = durations.reduce((a, b) => a + b, 0);
  const bgVideo = path.join(ROOT, 'bg.mp4');
  const outVideo = path.join(OUT_DIR, `${mondayStr}_week_reel.mp4`);

  const inputs = ['-stream_loop', '-1', '-i', bgVideo];
  pageFiles.forEach(f => inputs.push('-loop', '1', '-t', String(totalDuration), '-i', f));

  let filter = `[0:v]scale=-2:${H},crop=${W}:${H},eq=brightness=-0.06:saturation=0.9[bg];`;
  let prev = 'bg';
  let cursor = 0;
  pageFiles.forEach((_, i) => {
    const start = cursor;
    const end = start + durations[i];
    cursor = end;
    const next = `v${i + 1}`;
    filter += `[${prev}][${i + 1}:v]overlay=enable='between(t,${start},${end})'[${next}];`;
    prev = next;
  });
  filter = filter.replace(/;$/, '');

  execFileSync(ffmpeg, [
    '-y', ...inputs,
    '-filter_complex', filter,
    '-map', `[${prev}]`,
    '-t', String(totalDuration), '-r', '30', '-pix_fmt', 'yuv420p',
    '-c:v', 'libx264', '-crf', '18', '-movflags', '+faststart',
    outVideo,
  ], { stdio: 'inherit' });

  console.log(`\n✅ Fertig: ${outVideo}`);
  console.log('   Stumm — Trend-Audio erst in der Instagram/TikTok-App beim Hochladen hinzufügen.');
}

main().catch(err => { console.error('❌ Fehler:', err.message); process.exit(1); });
