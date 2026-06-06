# Restart FARUMASI API on port 8000 with latest code.
$port = 8000
$conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($conn) {
    Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}
Set-Location (Split-Path $PSScriptRoot -Parent)
Write-Host "Starting API on http://127.0.0.1:$port ..."
python -m uvicorn app.main:app --host 127.0.0.1 --port $port
