@echo off
setlocal
cd /d "%~dp0"
echo ==========================================================
echo  VideoSense AI - Starting with Cloudflare Public Tunnel
echo ==========================================================
if exist ".venv\Scripts\python.exe" (
    ".venv\Scripts\python.exe" start_app.py --tunnel %*
) else (
    python start_app.py --tunnel %*
)
