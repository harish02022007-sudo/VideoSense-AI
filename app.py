"""
=============================================================================
 VideoSense AI - FastAPI Application Gateway & Runner
=============================================================================
 Root entry point to launch the FastAPI backend server:
     python app.py
=============================================================================
"""

import os
import sys
from pathlib import Path

# Configure safe UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Ensure backend directory is prioritized at the front of sys.path
CURRENT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = CURRENT_DIR / "backend"

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# Prevent root app.py from shadowing backend/app package directory
if "app" in sys.modules and getattr(sys.modules["app"], "__file__", None) == __file__:
    del sys.modules["app"]

# Import the FastAPI application from backend/app/main.py
from app.main import app  # noqa: E402

__all__ = ["app"]

if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")

    print("\n" + "=" * 65)
    print(" [VideoSense AI] FastAPI Backend Server")
    print("=" * 65)
    print(f" * API Server:     http://localhost:{port}")
    print(f" * Swagger Docs:  http://localhost:{port}/docs")
    print(f" * Health Check:  http://localhost:{port}/api/v1/health/")
    print("=" * 65 + "\n")

    uvicorn.run("app.main:app", host=host, port=port, reload=True)
