# Run from repo root OR farumasi_api/ after setting MTN_MOMO_PRIMARY_KEY in .env
$ApiRoot = if (Test-Path (Join-Path $PSScriptRoot "..\.env")) {
    (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
} else {
    $PSScriptRoot
}
Set-Location $ApiRoot

if (-not (Test-Path ".env")) {
    Write-Host "Create farumasi_api/.env and set MTN_MOMO_PRIMARY_KEY first." -ForegroundColor Red
    exit 1
}

Write-Host "Working directory: $ApiRoot" -ForegroundColor DarkGray
Write-Host "Provisioning MTN MoMo sandbox credentials..." -ForegroundColor Cyan
python scripts/provision_mtn_momo.py @args
exit $LASTEXITCODE
