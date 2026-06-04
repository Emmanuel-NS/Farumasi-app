# Safe local dev startup for FARUMASI (Windows)
# Running ALL portals + API with Turbopack at once can use 8GB+ RAM and freeze the display.
# Start only what you need, one terminal per service.

param(
    [ValidateSet("api", "patient", "pharmacist", "partner", "super", "status", "stop")]
    [string]$Target = "status"
)

$ErrorActionPreference = "SilentlyContinue"

function Show-Status {
    Write-Host "`nPort usage (8000=api, 3002=patient, 3003=pharmacist, 3004=partner, 3005=super):"
    netstat -ano | findstr ":8000 :3002 :3003 :3004 :3005"
    Write-Host "`nTip: run only ONE Next.js portal while testing unless you have 16GB+ free RAM."
}

function Stop-DevPorts {
    foreach ($port in 8000, 3002, 3003, 3004, 3005) {
        $lines = netstat -ano | findstr ":$port "
        foreach ($line in $lines) {
            if ($line -match '\s+(\d+)\s*$') {
                $pid = $Matches[1]
                if ($pid -and $pid -ne "0") { Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue }
            }
        }
    }
    Write-Host "Stopped processes on dev ports (if any)."
}

$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
if (-not (Test-Path "$root\farumasi_api")) { $root = "C:\Users\PC\Farumasi-app" }

switch ($Target) {
    "status" { Show-Status }
    "stop"   { Stop-DevPorts; Show-Status }
    "api" {
        Write-Host "Starting API on http://127.0.0.1:8000 (no --reload to save CPU; use restart_api.ps1 to restart)"
        Set-Location "$root\farumasi_api"
        python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
    }
    "patient" {
        Set-Location "$root\farumasi_patient_portal"
        npm run dev
    }
    "pharmacist" {
        Set-Location "$root\farumasi_pharmacist_portal"
        npm run dev
    }
    "partner" {
        Set-Location "$root\farumasi_partner_portal"
        npm run dev
    }
    "super" {
        Set-Location "$root\farumasi_super_admin"
        npm run dev
    }
}
