# ==============================================================================
# VideoSense AI - 1-Click Cloudflare Public Demo Tunnel
# ==============================================================================
# Starts Backend (FastAPI), Frontend (React Vite), and exposes a 100% FREE
# secure HTTPS public link worldwide with zero credit card required!
# ==============================================================================
$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

$PythonExe = if (Test-Path "$ScriptDir\.venv\Scripts\python.exe") { "$ScriptDir\.venv\Scripts\python.exe" } else { "python" }

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " 🚀 VideoSense AI - Starting with Cloudflare Public Tunnel" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

& $PythonExe "$ScriptDir\start_app.py" --tunnel @args

