#!/usr/bin/env python3
"""
Convenience launcher to start only the VideoSense AI Backend Server (FastAPI / Uvicorn).
Equivalent to: python start_app.py --backend
"""
import sys
from start_app import main

if __name__ == "__main__":
    # Inject --backend flag if no other mode is specified
    if not any(arg in sys.argv for arg in ["--backend", "-b", "--frontend", "-f"]):
        sys.argv.append("--backend")
    main()