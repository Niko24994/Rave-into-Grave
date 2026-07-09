# Rave into Grave - woechentlicher Reel, automatisiert per Windows-Aufgabenplanung.
# Laeuft jeden Freitag 10:00 (lokale/deutsche Zeit). Generiert den Reel fuer die
# kommende Woche (Montag-Sonntag) und legt das fertige Video auf dem Desktop ab.

$repo = "C:\Users\nikos\OneDrive\Desktop\Github\Rave into Grave"
$desktop = "C:\Users\nikos\OneDrive\Desktop"
$log = Join-Path $repo "social\automation\weekly_reel.log"

function Log($msg) {
    $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $msg"
    Add-Content -Path $log -Value $line -Encoding utf8
}

Set-Location $repo

Log "Start: git pull"
$pullOutput = git pull --ff-only origin main 2>&1 | Out-String
Log $pullOutput.Trim()
if ($LASTEXITCODE -ne 0) {
    Log "FEHLER: git pull fehlgeschlagen (Exit $LASTEXITCODE) - fahre trotzdem mit lokalem Stand fort."
}

Log "Start: generate_weekly_reel.mjs"
$genOutput = node social/generate_weekly_reel.mjs 2>&1 | Out-String
Log $genOutput.Trim()
if ($LASTEXITCODE -ne 0) {
    Log "FEHLER: generate_weekly_reel.mjs fehlgeschlagen (Exit $LASTEXITCODE)."
    exit 1
}

$latest = Get-ChildItem (Join-Path $repo "social\output\*_week_reel.mp4") -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending | Select-Object -First 1

if ($latest) {
    $stem = $latest.BaseName -replace '_week_reel', ''
    $dest = Join-Path $desktop "RaveIntoGrave_Wochenreel_$stem.mp4"
    Copy-Item $latest.FullName $dest -Force
    Log "Fertig: $dest"
} else {
    Log "Kein Video gefunden (evtl. keine Festivals in der Zielwoche) - nichts kopiert."
}
