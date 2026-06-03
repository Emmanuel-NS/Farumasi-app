# Stop every process listening on port 8000, then start a single uvicorn instance.
$ErrorActionPreference = "SilentlyContinue"
$listeners = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty OwningProcess -Unique
foreach ($procId in $listeners) {
  if ($procId -and $procId -ne 0) {
    Write-Host "Stopping PID $procId on port 8000..."
    Stop-Process -Id $procId -Force
  }
}
Start-Sleep -Seconds 2
$remaining = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
if ($remaining) {
  Write-Host "WARNING: port 8000 still in use"
  exit 1
}
Write-Host "Port 8000 is free. Starting API..."
Set-Location (Join-Path $PSScriptRoot "..")
Start-Process -WindowStyle Minimized python -ArgumentList "-m","uvicorn","app.main:app","--host","127.0.0.1","--port","8000","--reload"
Start-Sleep -Seconds 8
try {
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  $r = Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/v1/openapi.json" -UseBasicParsing -TimeoutSec 15
  $sw.Stop()
  $secs = [math]::Round($sw.Elapsed.TotalSeconds, 2)
  Write-Host "API OK status $($r.StatusCode) in ${secs}s"
  exit 0
} catch {
  Write-Host "API failed to start"
  Write-Host $_.Exception.Message
  exit 1
}
