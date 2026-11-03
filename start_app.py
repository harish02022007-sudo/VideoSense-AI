#!/usr/bin/env python3
"""
=============================================================================
 VideoSense AI - Unified Application Launcher
=============================================================================
Starts the FastAPI Backend and the Vite React Frontend concurrently.
Automatically manages virtual environments, ports, and clean process shutdowns.

Usage:
    python start_app.py                 # Starts both Backend and Frontend
    python start_app.py --backend       # Starts Backend only (port 8000)
    python start_app.py --frontend      # Starts Frontend only (port 5173)
    python start_app.py --port 8080     # Custom backend port
=============================================================================
"""

import os
import sys
import time
import signal
import shutil
import re
import argparse
import subprocess
import threading
from pathlib import Path

# ANSI Color Codes for terminal output
CYAN = "\033[96m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
MAGENTA = "\033[95m"
BOLD = "\033[1m"
RESET = "\033[0m"

# Project Directories
ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend"
FRONTEND_DIR = ROOT_DIR / "frontend"
VENV_DIR = ROOT_DIR / ".venv"


def get_python_executable() -> str:
    """Finds the virtualenv python executable if available, otherwise current python."""
    if os.name == "nt":
        venv_python = VENV_DIR / "Scripts" / "python.exe"
    else:
        venv_python = VENV_DIR / "bin" / "python"

    if venv_python.exists():
        return str(venv_python)
    return sys.executable


def get_npm_executable() -> str:
    """Finds the npm binary on Windows or Unix."""
    npm_cmd = shutil.which("npm.cmd") if os.name == "nt" else shutil.which("npm")
    if not npm_cmd:
        npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
    return npm_cmd


def get_cloudflared_executable() -> str:
    """Finds cloudflared in PATH, or in .tools/, or downloads it automatically."""
    cmd = shutil.which("cloudflared.exe") if os.name == "nt" else shutil.which("cloudflared")
    if cmd:
        return cmd

    tools_dir = ROOT_DIR / ".tools"
    exe_name = "cloudflared.exe" if os.name == "nt" else "cloudflared"
    local_bin = tools_dir / exe_name
    if local_bin.exists():
        return str(local_bin)

    print(f"{CYAN}[TUNNEL] cloudflared not found. Downloading portable binary...{RESET}")
    tools_dir.mkdir(parents=True, exist_ok=True)

    if os.name == "nt":
        url = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
    elif sys.platform == "darwin":
        url = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-amd64"
    else:
        url = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64"

    try:
        import urllib.request
        urllib.request.urlretrieve(url, str(local_bin))
        if os.name != "nt":
            local_bin.chmod(0o755)
        print(f"{GREEN}[TUNNEL] cloudflared downloaded to {local_bin}{RESET}")
        return str(local_bin)
    except Exception as e:
        print(f"{RED}[ERROR] Could not download cloudflared: {e}{RESET}")
        return ""


def stream_tunnel_logs(pipe, color: str):
    """Streams tunnel output and prominently announces the public trycloudflare URL."""
    tunnel_url_announced = False
    try:
        for line in iter(pipe.readline, ""):
            if not line:
                break
            clean_line = line.rstrip()
            if not clean_line:
                continue

            match = re.search(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com", clean_line)
            if match and not tunnel_url_announced:
                tunnel_url = match.group(0)
                tunnel_url_announced = True
                print(f"\n{GREEN}{BOLD}" + "=" * 76 + f"{RESET}")
                print(f"{GREEN}{BOLD} 🎉 VideoSense AI is LIVE & Accessible Worldwide via Cloudflare Tunnel!{RESET}")
                print(f"{GREEN}{BOLD}" + "=" * 76 + f"{RESET}")
                print(f"  {BOLD}🌐 Public Web App:{RESET}      {CYAN}{BOLD}{tunnel_url}{RESET}")
                print(f"  {BOLD}📚 API Swagger Docs:{RESET}    {YELLOW}{tunnel_url}/docs{RESET}")
                print(f"  {BOLD}🩺 System Health:{RESET}       {GREEN}{tunnel_url}/api/v1/health/{RESET}")
                print(f"{GREEN}{BOLD}" + "=" * 76 + f"{RESET}")
                print(f"  {YELLOW}Anyone on mobile, tablet, or PC can access your live demo link!{RESET}")
                print(f"{GREEN}{BOLD}" + "=" * 76 + f"{RESET}\n")
            else:
                if any(k in clean_line for k in ["Registered tunnel connection", "Connection", "Your quick Tunnel"]):
                    print(f"{color}[TUNNEL]{RESET} {clean_line}")
    except (ValueError, IOError):
        pass


def print_banner(backend_port: int, frontend_port: int, mode: str):
    """Displays startup banner."""
    print(f"\n{CYAN}{BOLD}" + "=" * 70 + f"{RESET}")
    print(f"{CYAN}{BOLD}   🚀 VideoSense AI - Unified Application Launcher{RESET}")
    print(f"{CYAN}{BOLD}" + "=" * 70 + f"{RESET}")
    print(f"  {BOLD}Working Directory:{RESET}  {ROOT_DIR}")
    print(f"  {BOLD}Python Runtime:{RESET}     {get_python_executable()}")
    print(f"  {BOLD}Execution Mode:{RESET}     {GREEN}{mode.upper()}{RESET}")
    print("-" * 70)

    if mode in ["all", "backend"]:
        print(f"  {GREEN}●{RESET} {BOLD}FastAPI Backend:{RESET}   http://localhost:{backend_port}")
        print(f"    {YELLOW}↳ Swagger Docs:{RESET}     http://localhost:{backend_port}/docs")
        print(f"    {YELLOW}↳ Health Check:{RESET}     http://localhost:{backend_port}/api/v1/health")

    if mode in ["all", "frontend"]:
        print(f"  {MAGENTA}●{RESET} {BOLD}Vite Frontend:{RESET}     http://localhost:{frontend_port}")

    print("-" * 70)
    print(f"  {YELLOW}Press Ctrl + C anytime to stop all servers cleanly.{RESET}")
    print(f"{CYAN}{BOLD}" + "=" * 70 + f"{RESET}\n")


def stream_logs(pipe, prefix: str, color: str):
    """Streams process stdout/stderr with a colored prefix."""
    try:
        for line in iter(pipe.readline, ""):
            if not line:
                break
            clean_line = line.rstrip()
            if clean_line:
                print(f"{color}[{prefix}]{RESET} {clean_line}")
    except (ValueError, IOError):
        pass


def kill_process_tree(pid: int):
    """Cleanly terminates a process and all its children on Windows/Unix."""
    try:
        import psutil
        parent = psutil.Process(pid)
        children = parent.children(recursive=True)
        for child in children:
            try:
                child.terminate()
            except psutil.NoSuchProcess:
                pass
        parent.terminate()
        gone, alive = psutil.wait_procs(children + [parent], timeout=3)
        for p in alive:
            try:
                p.kill()
            except psutil.NoSuchProcess:
                pass
    except Exception:
        # Fallback for Windows taskkill if psutil fails
        if os.name == "nt":
            subprocess.run(
                ["taskkill", "/F", "/T", "/PID", str(pid)],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
        else:
            try:
                os.kill(pid, signal.SIGKILL)
            except OSError:
                pass


def main():
    parser = argparse.ArgumentParser(
        description="Launch VideoSense AI Backend and Frontend servers."
    )
    group = parser.add_mutually_exclusive_group()
    group.add_argument(
        "--backend", "-b", action="store_true", help="Launch Backend API server only."
    )
    group.add_argument(
        "--frontend", "-f", action="store_true", help="Launch Frontend dev server only."
    )
    parser.add_argument(
        "--port", "-p", type=int, default=8000, help="Port for Backend server (default: 8000)."
    )
    parser.add_argument(
        "--host", type=str, default="0.0.0.0", help="Host binding for Backend (default: 0.0.0.0)."
    )
    parser.add_argument(
        "--frontend-port", type=int, default=5173, help="Port for Frontend server (default: 5173)."
    )
    parser.add_argument(
        "--no-reload", action="store_true", help="Disable Uvicorn auto-reload."
    )
    parser.add_argument(
        "--tunnel", "-t", action="store_true", help="Launch Cloudflare Public Demo Tunnel (accessible worldwide)."
    )

    args = parser.parse_args()

    # Determine execution mode
    if args.backend:
        mode = "backend"
    elif args.frontend:
        mode = "frontend"
    else:
        mode = "all"

    print_banner(args.port, args.frontend_port, mode)

    python_bin = get_python_executable()
    npm_bin = get_npm_executable()

    processes = []
    threads = []

    # 1. Start Backend Server
    if mode in ["all", "backend"]:
        if not BACKEND_DIR.exists():
            print(f"{RED}[ERROR] Backend directory not found at: {BACKEND_DIR}{RESET}")
            sys.exit(1)

        uvicorn_cmd = [
            python_bin,
            "-m", "uvicorn",
            "app.main:app",
            "--host", args.host,
            "--port", str(args.port)
        ]
        if not args.no_reload:
            uvicorn_cmd.append("--reload")

        print(f"{GREEN}[SYSTEM] Starting FastAPI backend server...{RESET}")
        try:
            backend_proc = subprocess.Popen(
                uvicorn_cmd,
                cwd=str(BACKEND_DIR),
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                encoding="utf-8",
                errors="replace"
            )
            processes.append(("BACKEND", backend_proc))

            t_backend = threading.Thread(
                target=stream_logs,
                args=(backend_proc.stdout, "BACKEND", GREEN),
                daemon=True
            )
            t_backend.start()
            threads.append(t_backend)
        except Exception as e:
            print(f"{RED}[ERROR] Failed to start backend: {e}{RESET}")
            sys.exit(1)

    # 2. Start Frontend Server
    if mode in ["all", "frontend"]:
        if not FRONTEND_DIR.exists():
            print(f"{RED}[ERROR] Frontend directory not found at: {FRONTEND_DIR}{RESET}")
            sys.exit(1)

        npm_cmd = [npm_bin, "run", "dev"]
        print(f"{MAGENTA}[SYSTEM] Starting Vite frontend server...{RESET}")
        try:
            frontend_proc = subprocess.Popen(
                npm_cmd,
                cwd=str(FRONTEND_DIR),
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                encoding="utf-8",
                errors="replace",
                shell=(os.name == "nt")  # Windows requires shell=True for npm.cmd
            )
            processes.append(("FRONTEND", frontend_proc))

            t_frontend = threading.Thread(
                target=stream_logs,
                args=(frontend_proc.stdout, "FRONTEND", MAGENTA),
                daemon=True
            )
            t_frontend.start()
            threads.append(t_frontend)
        except Exception as e:
            print(f"{RED}[ERROR] Failed to start frontend: {e}{RESET}")
            sys.exit(1)

    # 3. Start Cloudflare Tunnel (if requested)
    if args.tunnel:
        cloudflared_bin = get_cloudflared_executable()
        if cloudflared_bin:
            time.sleep(2.0)  # Short pause to let Vite server bind to port
            target_port = args.frontend_port if mode in ["all", "frontend"] else args.port
            print(f"{CYAN}[SYSTEM] Launching Cloudflare Tunnel for port {target_port}...{RESET}")
            tunnel_cmd = [
                cloudflared_bin, "tunnel",
                "--url", f"http://localhost:{target_port}"
            ]
            try:
                tunnel_proc = subprocess.Popen(
                    tunnel_cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                    bufsize=1,
                    encoding="utf-8",
                    errors="replace"
                )
                processes.append(("TUNNEL", tunnel_proc))

                t_tunnel = threading.Thread(
                    target=stream_tunnel_logs,
                    args=(tunnel_proc.stderr, CYAN),
                    daemon=True
                )
                t_tunnel.start()
                threads.append(t_tunnel)
            except Exception as e:
                print(f"{RED}[ERROR] Failed to start Cloudflare Tunnel: {e}{RESET}")

    # Monitor processes and handle graceful shutdown
    try:
        while True:
            for name, proc in processes:
                ret = proc.poll()
                if ret is not None:
                    print(f"\n{YELLOW}[WARNING] {name} process exited with code {ret}.{RESET}")
                    raise KeyboardInterrupt
            time.sleep(0.5)

    except KeyboardInterrupt:
        print(f"\n{YELLOW}[SHUTDOWN] Stopping all VideoSense AI servers...{RESET}")
        for name, proc in processes:
            print(f"{YELLOW}  ↳ Terminating {name} (PID: {proc.pid})...{RESET}")
            kill_process_tree(proc.pid)

        print(f"{GREEN}[SUCCESS] All processes stopped cleanly. Goodbye!{RESET}\n")
        sys.exit(0)


if __name__ == "__main__":
    main()