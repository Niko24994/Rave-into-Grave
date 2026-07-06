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
const SECONDS_PER_PAGE = 6;

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

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Rajdhani:wght@600;700;800&display=swap');`;

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function pageHtml(group, pageNum, totalPages, monthLabel, yearLabel) {
  const rows = group.map(f => {
    const shortDate = f.dateDisplay.replace(new RegExp(`\\s*${yearLabel}$`), '').replace(/\s*–\s*/, '–');
    return `
      <div class="row">
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
    .header { position:relative; z-index:1; padding: 150px 90px 20px; text-align:center; }
    .wordmark { font-family:'Share Tech Mono',monospace; font-size:32px; letter-spacing:9px; color:#fff; margin-bottom:22px; }
    .wordmark .accent { color:#ff2d00; }
    .title { font-weight:800; font-size:72px; color:#fff; text-transform:uppercase; line-height:1.05; text-shadow:0 0 20px rgba(255,45,0,0.4); }
    .title .accent { color:#ff9900; }
    .subtitle { margin-top:14px; font-family:'Share Tech Mono',monospace; font-size:26px; letter-spacing:3px; color:#ff9900; }
    .list { position:relative; z-index:1; padding: 6px 90px 0; }
    .row { display:flex; align-items:center; gap:22px; border:2px solid #ff2d00; border-radius:6px; background: rgba(255,45,0,0.06); padding: 20px 26px; margin-bottom: 16px; }
    .row-date { font-family:'Share Tech Mono',monospace; font-size:28px; color:#ff9900; font-weight:700; white-space:nowrap; min-width: 168px; }
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
    <div class="header">
      <div class="wordmark">RAVE <span class="accent">INTO</span> GRAVE</div>
      <div class="title">FESTIVALS IM <span class="accent">${escapeHtml(monthLabel.toUpperCase())}</span></div>
      <div class="subtitle">${escapeHtml(yearLabel)} — SEITE ${pageNum}/${totalPages}</div>
    </div>
    <div class="list">${rows}</div>
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

  const perPage = Math.ceil(festivals.length / 3);
  const groups = [
    festivals.slice(0, perPage),
    festivals.slice(perPage, perPage * 2),
    festivals.slice(perPage * 2),
  ].filter(g => g.length > 0);
  const totalPages = groups.length;

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

  const totalDuration = totalPages * SECONDS_PER_PAGE;
  const bgVideo = path.join(ROOT, 'bg.mp4');
  const outVideo = path.join(OUT_DIR, `${yearMonth}_reel.mp4`);

  const inputs = ['-stream_loop', '-1', '-i', bgVideo];
  pageFiles.forEach(f => inputs.push('-loop', '1', '-t', String(totalDuration), '-i', f));

  let filter = `[0:v]scale=-2:${H},crop=${W}:${H},eq=brightness=-0.06:saturation=0.9[bg];`;
  let prev = 'bg';
  pageFiles.forEach((_, i) => {
    const start = i * SECONDS_PER_PAGE;
    const end = start + SECONDS_PER_PAGE;
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
