#!/usr/bin/env node
/**
 * Rave into Grave — Monatliches Instagram-Reel generieren
 *
 * Erzeugt ein 9:16-Video (1080x1920) mit allen Festivals eines Monats,
 * aufgeteilt auf ~3 Seiten à ~9-10 Festivals, über das Website-Hintergrund-
 * video (bg.mp4) gelegt. Bereits vergangene Festivals werden automatisch
 * ausgeschlossen.
 *
 * Nutzung:
 *   node social/generate_monthly_reel.mjs [YYYY-MM]
 *   (ohne Argument: aktueller Monat)
 *
 * Voraussetzungen: Google Chrome + ffmpeg müssen installiert sein
 * (ffmpeg via: winget install --id Gyan.FFmpeg -e).
 *
 * Ergebnis liegt in social/output/<YYYY-MM>_reel.mp4 (stumm — Trend-Audio
 * kommt erst beim Hochladen in der Instagram-App dazu, das ist auf dem
 * Desktop/Web nicht möglich).
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
const DEFAULT_SECONDS = 8;
const SHORT_SECONDS = 4;
const SHORT_THRESHOLD = 3;
const PER_PAGE = 9;

// Jede volle Seite laeuft die Standardzeit. Nur die letzte Seite (Rest-
// Content) wird kuerzer angezeigt, wenn kaum noch Festivals draufpassen —
// auch wenn diese "letzte" Seite zufaellig die einzige Seite ist.
function pageDurations(groups) {
  return groups.map((g, i) => {
    const isLast = i === groups.length - 1;
    return isLast && g.length <= SHORT_THRESHOLD ? SHORT_SECONDS : DEFAULT_SECONDS;
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

async function loadMonthFestivals(yearMonth) {
  const src = fs.readFileSync(path.join(ROOT, 'data', 'festivals.js'), 'utf-8');
  const match = src.match(/const festivals = (\[[\s\S]*?\]);/);
  const festivals = JSON.parse(match[1]);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return festivals
    .filter(f => {
      const d = new Date(f.date); d.setHours(0, 0, 0, 0);
      return f.date.startsWith(yearMonth) && d >= today;
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

// ─── HTML-Seiten rendern ───

// Lokal eingebettete Fonts (statt Google Fonts über Netz) — vermeidet
// Font-Ladefehler/Race-Conditions, die bei separaten Chrome-Prozessen pro
// Seite dazu führten, dass manche Seiten auf eine Fallback-Schrift
// zurückfielen und dadurch anders/größer aussahen als andere.
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

function pageHtml(group, pageNum, totalPages, monthLabel, yearLabel) {
  // Weniger Zeilen auf der Seite -> etwas mehr Abstand dazwischen, damit es
  // nicht nur "zentriert mit Leerraum drumherum" wirkt, sondern die Seite
  // insgesamt voller. Bei maximaler Belegung (PER_PAGE) bleibt der Abstand
  // knapper, damit die Karten niemals bis in Pagedots/Footer hineinragen.
  const rowGap = Math.min(32, 12 + Math.max(0, PER_PAGE - group.length) * 4);

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
    .title { font-weight:800; font-size:72px; color:#fff; text-transform:uppercase; line-height:1.05; text-shadow:0 0 20px rgba(255,45,0,0.4); }
    .title .accent { color:#ff9900; }
    .subtitle { margin-top:14px; font-family:'Share Tech Mono',monospace; font-size:26px; letter-spacing:3px; color:#ff9900; }
    .list { flex:1; min-height:0; display:flex; flex-direction:column; justify-content:center; overflow:hidden; padding: 6px 90px 0; }
    .row { display:flex; align-items:center; gap:22px; border:2px solid #ff2d00; border-radius:6px; background: rgba(255,45,0,0.06); padding: 20px 26px; }
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
        <div class="title">FESTIVALS IM <span class="accent">${escapeHtml(monthLabel.toUpperCase())}</span></div>
        <div class="subtitle">${escapeHtml(yearLabel)} — SEITE ${pageNum}/${totalPages}</div>
      </div>
      <div class="list">${rows}</div>
    </div>
    <div class="pagedots">${Array.from({ length: totalPages }, (_, i) => `<span class="dot${i === pageNum - 1 ? ' active' : ''}"></span>`).join('')}</div>
    <div class="footer">mehr auf raveintograve.de</div>
  </body></html>`;
}

const MONTH_NAMES = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

async function main() {
  const arg = process.argv[2];
  const now = new Date();
  const yearMonth = arg || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [year, month] = yearMonth.split('-');
  const monthLabel = MONTH_NAMES[parseInt(month, 10) - 1];

  const chrome = findChrome();
  const ffmpeg = findFfmpeg();

  const festivals = await loadMonthFestivals(yearMonth);
  if (festivals.length === 0) {
    console.log(`Keine (verbleibenden) Festivals für ${yearMonth} gefunden.`);
    return;
  }
  console.log(`${festivals.length} Festivals für ${monthLabel} ${year}.`);

  // Gleichmässig auf Seiten verteilen, max. PER_PAGE Zeilen pro Seite — sonst
  // koennen die Karten bei vielen Festivals im Monat in Pagedots/Footer
  // hineinwachsen (fixe 3-Seiten-Aufteilung hatte kein Limit nach oben).
  const totalPages = Math.max(1, Math.ceil(festivals.length / PER_PAGE));
  const perPageEven = Math.ceil(festivals.length / totalPages);
  const groups = [];
  for (let i = 0; i < totalPages; i++) {
    groups.push(festivals.slice(i * perPageEven, (i + 1) * perPageEven));
  }

  fs.mkdirSync(WORK_DIR, { recursive: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const htmlFile = path.join(WORK_DIR, 'page.html');

  const pageFiles = [];
  for (let i = 0; i < groups.length; i++) {
    fs.writeFileSync(htmlFile, pageHtml(groups[i], i + 1, totalPages, monthLabel, year), 'utf-8');
    const outFile = path.join(WORK_DIR, `page_${i + 1}.png`);
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
  const outVideo = path.join(OUT_DIR, `${yearMonth}_reel.mp4`);

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
  console.log('   Stumm — Trend-Audio erst in der Instagram-App beim Hochladen hinzufügen.');
}

main().catch(err => { console.error('❌ Fehler:', err.message); process.exit(1); });
