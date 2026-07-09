# Rave into Grave - monatlicher Reel, automatisiert per Windows-Aufgabenplanung.
# Laeuft taeglich, generiert aber nur, wenn heute genau 2 Tage vor dem 1. des
# naechsten Monats liegt (Monatslaenge variiert, daher taeglicher Check statt
# fixem Kalendertag). Legt das fertige Video auf dem Desktop ab.

$repo = "C:\Users\nikos\OneDrive\Desktop\Github\Rave into Grave"
$desktop = "C:\Users\nikos\OneDrive\Desktop"
$log = Join-Path $repo "social\automation\monthly_reel.log"

function Log($msg) {
    $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $msg"
    Add-Content -Path $log -Value $line -Encoding utf8
}

$today = (Get-Date).Date
$firstOfNextMonth = (Get-Date -Day 1).Date.AddMonths(1)
$daysUntil = ($firstOfNextMonth - $today).Days

if ($daysUntil -ne 2) {
    exit 0
}

$monthNamesDe = @{1="Januar";2="Februar";3="Maerz";4="April";5="Mai";6="Juni";7="Juli";8="August";9="September";10="Oktober";11="November";12="Dezember"}
$targetMonth = $firstOfNextMonth.ToString("yyyy-MM")

Set-Location $repo

Log "Start: git pull"
$pullOutput = git pull --ff-only origin main 2>&1 | Out-String
Log $pullOutput.Trim()
if ($LASTEXITCODE -ne 0) {
    Log "FEHLER: git pull fehlgeschlagen (Exit $LASTEXITCODE) - fahre trotzdem mit lokalem Stand fort."
}

Log "Start: generate_monthly_reel.mjs $targetMonth"
$genOutput = node social/generate_monthly_reel.mjs $targetMonth 2>&1 | Out-String
Log $genOutput.Trim()
if ($LASTEXITCODE -ne 0) {
    Log "FEHLER: generate_monthly_reel.mjs fehlgeschlagen (Exit $LASTEXITCODE)."
    exit 1
}

$out = Join-Path $repo ("social\output\" + $targetMonth + "_reel.mp4")
if (Test-Path $out) {
    $m = [int]$firstOfNextMonth.Month
    $y = $firstOfNextMonth.Year
    $dest = Join-Path $desktop ("RaveIntoGrave_Monatsreel_" + $monthNamesDe[$m] + $y + ".mp4")
    Copy-Item $out $dest -Force
    Log "Fertig: $dest"
} else {
    Log "Kein Video gefunden (evtl. keine Festivals im Zielmonat) - nichts kopiert."
}
