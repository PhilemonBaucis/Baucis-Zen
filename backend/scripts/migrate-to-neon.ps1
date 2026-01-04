# Neon Migration Script
# Run from: baucis-backend folder
# Usage: .\scripts\migrate-to-neon.ps1

Write-Host "=== Railway to Neon Migration ===" -ForegroundColor Cyan

# Add PostgreSQL to PATH
$env:Path = "C:\Program Files\PostgreSQL\17\bin;$env:Path"

# Load .env file
$envFile = Get-Content .env
foreach ($line in $envFile) {
    if ($line -match "^([^#][^=]+)=(.*)$") {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        Set-Item -Path "Env:$name" -Value $value
    }
}

# Check if DATABASE_URL exists (Railway)
if (-not $env:DATABASE_URL) {
    Write-Host "ERROR: DATABASE_URL not found in .env" -ForegroundColor Red
    exit 1
}

# Check if NEON_CONNECTION exists
if (-not $env:NEON_CONNECTION) {
    Write-Host "ERROR: NEON_CONNECTION not found in .env" -ForegroundColor Red
    exit 1
}

Write-Host "`nSource (Railway): $env:DATABASE_URL" -ForegroundColor Yellow
Write-Host "Target (Neon):    $env:NEON_CONNECTION" -ForegroundColor Cyan

# Confirm before proceeding
$confirm = Read-Host "`nProceed with migration? (y/n)"
if ($confirm -ne "y") {
    Write-Host "Migration cancelled." -ForegroundColor Yellow
    exit 0
}

# Step 1: Export from Railway
Write-Host "`n[Step 1/2] Exporting from Railway PostgreSQL..." -ForegroundColor Green
$backupFile = "medusa_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').dump"

pg_dump $env:DATABASE_URL --no-owner --no-acl --format=custom --file=$backupFile

if ($LASTEXITCODE -eq 0) {
    Write-Host "SUCCESS: Backup saved to $backupFile" -ForegroundColor Green
    Write-Host "File size: $((Get-Item $backupFile).Length / 1MB) MB"
} else {
    Write-Host "ERROR: pg_dump failed. Make sure PostgreSQL tools are installed." -ForegroundColor Red
    Write-Host "Install with: winget install PostgreSQL.PostgreSQL" -ForegroundColor Yellow
    exit 1
}

# Use NEON_CONNECTION from .env
$neonUrl = $env:NEON_CONNECTION

# Step 2: Import to Neon
Write-Host "`n[Step 2/2] Importing to Neon..." -ForegroundColor Green
pg_restore $neonUrl --no-owner --no-acl --single-transaction $backupFile

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n========================================" -ForegroundColor Green
    Write-Host "SUCCESS: Database migrated to Neon!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "`n=== Next Steps ===" -ForegroundColor Cyan
    Write-Host "1. Go to Railway Dashboard -> Your Backend -> Variables"
    Write-Host "2. Update DATABASE_URL to:" -ForegroundColor Yellow
    Write-Host "   $neonUrl" -ForegroundColor White
    Write-Host "`n3. Verify in Neon Dashboard -> Tables"
    Write-Host "4. Test your app (admin + storefront)"
    Write-Host "5. Remove PostgreSQL add-on from Railway (keep Redis)"
} else {
    Write-Host "`nWARNING: pg_restore completed with warnings (this is usually OK)" -ForegroundColor Yellow
    Write-Host "Check Neon Dashboard -> Tables to verify data was imported."
}

Write-Host "`nBackup file saved: $backupFile" -ForegroundColor Gray
Write-Host "You can delete this file after verifying the migration worked.`n" -ForegroundColor Gray

