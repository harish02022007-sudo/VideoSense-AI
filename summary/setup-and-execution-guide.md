# Setup and Execution Guide

## Executive Summary
This guide provides complete, step-by-step instructions for installing, configuring, running, and maintaining the **VideoSense AI** platform. It covers prerequisites, backend Python environment setup, frontend Node.js configuration, environment variables, multi-port execution, and troubleshooting procedures.

---

## 1. System Prerequisites

Before setting up VideoSense AI, ensure your development or host machine meets the following minimum requirements:

| Component | Minimum Specification | Recommended Specification |
| :--- | :--- | :--- |
| **Operating System** | Windows 10/11 (64-bit), Ubuntu 22.04 LTS, or macOS 13+ | Windows 11 or Ubuntu 22.04 LTS |
| **Python** | Python `3.10` or `3.11` | Python `3.10.12` |
| **Node.js & npm** | Node.js `v18.0.0` or `v20.0.0+` | Node.js `v20.x` LTS with npm `v10.x` |
| **System RAM** | 8 GB RAM | 16 GB+ RAM |
| **Storage** | 10 GB free SSD disk space | 50 GB+ NVMe SSD |
| **FFmpeg** | FFmpeg installed and available in system `PATH` | FFmpeg 5.x or 6.x |
| **Hardware Acceleration** | CPU Only (Functional fallback supported) | NVIDIA GPU (4GB+ VRAM) with CUDA 12.x |

> [!IMPORTANT]
> **FFmpeg** is required for frame extraction and audio conversion. Ensure `ffmpeg -version` executes successfully in your terminal before launching the backend.

---

## 2. Backend Installation & Environment Setup

### Step 2.1: Open Terminal & Navigate to Project Root
```powershell
# Windows PowerShell
cd "d:\VsCode\Sem Project\Sem 5 Project\Proj\VideoSense AI"
```

### Step 2.2: Create and Activate Python Virtual Environment
```powershell
# Create virtual environment named '.venv'
python -m venv .venv

# Activate on Windows PowerShell
.\.venv\Scripts\Activate.ps1

# (Alternative) Activate on Linux/macOS
# source .venv/bin/activate
```

### Step 2.3: Upgrade Pip & Install Dependencies
```powershell
python -m pip install --upgrade pip setuptools wheel
pip install -r backend/requirements.txt
```

### Step 2.4: Configure Backend Environment Variables
Create a file named `.env` in the `backend/` directory (or verify `backend/.env`):
```env
# Application Settings
APP_TITLE="VideoSense AI"
APP_DEBUG=true
ENVIRONMENT="development"

# Server Host & Port
HOST="0.0.0.0"
PORT=8001

# Storage Paths (Relative to backend directory)
UPLOAD_DIR="./storage/uploads"
FRAME_DIR="./storage/frames"

# Database Configuration
DATABASE_URL="sqlite+aiosqlite:///./storage/videosense.db"

# Vector Store Path
VECTOR_STORE_PATH="./storage/vector_store.idx"
VECTOR_METADATA_PATH="./storage/vector_metadata.json"

# AI Inference Settings
DEFAULT_FPS=1.0
ENABLE_GPU=false
```

---

## 3. Frontend Installation & Environment Setup

### Step 3.1: Navigate to Frontend Directory
```powershell
cd frontend
```

### Step 3.2: Install NPM Dependencies
```powershell
npm install
```

### Step 3.3: Configure Frontend Environment Variables
Create or verify `frontend/.env`:
```env
# Primary Backend Gateway URL
VITE_API_URL="http://localhost:8001"
```

---

## 4. Running the Application

### 4.1 Launching the Backend API Server
Open a dedicated terminal, activate the virtual environment, and launch **Uvicorn**:

```powershell
# From project root
.\.venv\Scripts\Activate.ps1
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```
- The backend server will initialize on **`http://localhost:8001`**.
- OpenAPI / Swagger documentation is available at **`http://localhost:8001/docs`**.
- Alternative Redoc documentation is available at **`http://localhost:8001/redoc`**.

### 4.2 Launching the Frontend Development Server
Open a second terminal:

```powershell
# From project root
cd frontend
npm run dev
```
- Vite will launch the development server on **`http://localhost:5173`** (or next available port).
- Open **`http://localhost:5173`** in Google Chrome, Brave, or Microsoft Edge.

---

## 5. Dual-Port Resilience & Port Failover Behavior

The frontend is engineered with an automated **Port Failover Interceptor** (`frontend/src/services/api.js`):
- If the backend is running on port **`8001`**, all requests connect seamlessly.
- If port `8001` is busy and you start the backend on port **`8000`**, the frontend Axios client detects the network timeout, pings `http://localhost:8000/api/v1/health/`, automatically updates its base URL to `8000`, caches the preference in `localStorage`, and retries the request with zero user intervention.

To manually run the backend on port 8000:
```powershell
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 6. Verification & Health Checks

### Step 1: Check Backend Health
In your browser or terminal, query the health endpoint:
```powershell
curl http://localhost:8001/api/v1/health/
```
Expected response:
```json
{
  "status": "healthy",
  "system": { "cpu_usage_percent": 12.5, "memory_usage_percent": 35.0 },
  "services": {
    "database": { "status": "healthy", "latency_ms": 0.4 },
    "vector_database": { "status": "healthy", "engine": "FAISS-CPU" }
  }
}
```

### Step 2: Test End-to-End Ingestion
1. Open the web UI at `http://localhost:5173`.
2. Navigate to **Upload Center** via the sidebar.
3. Click one of the bundled sample video triggers or drop an MP4 file.
4. Watch the 6-stage progress stepper update in real time.
5. Once completed, click **Launch Studio** to inspect detected bounding boxes, speech transcripts, and OCR text in the **Timeline Explorer**.

---

## 7. Common Troubleshooting & FAQs

### Problem 1: `WinError 10048: Only one usage of each socket address is normally permitted`
- **Cause**: Port 8001 or 8000 is already occupied by a previously running process.
- **Solution**:
  ```powershell
  # Find PID occupying port 8001
  netstat -ano | findstr :8001
  # Terminate process (replace 12345 with actual PID)
  taskkill /PID 12345 /F
  ```
  Or simply launch Uvicorn on port `8000`—the frontend will automatically failover.

### Problem 2: `FileNotFoundError: [WinError 2] The system cannot find the file specified: 'ffmpeg'`
- **Cause**: FFmpeg is not installed or not present in your system `PATH`.
- **Solution**:
  1. Download FFmpeg from [gyan.dev](https://www.gyan.dev/ffmpeg/builds/) or install via winget:
     ```powershell
     winget install Gyan.FFmpeg
     ```
  2. Restart your terminal and verify with `ffmpeg -version`.

### Problem 3: `ImportError: DLL load failed while importing _sqlite3` or SQLite Locked
- **Cause**: SQLite database file locked by another running instance.
- **Solution**: Stop all backend processes, ensure only one Uvicorn instance is active, or delete `storage/videosense.db` to trigger a clean database recreation.

### Problem 4: High CPU Usage During Pipeline Execution
- **Cause**: All 6 AI pipeline stages are running concurrently on the CPU.
- **Solution**: In `backend/app/core/config.py` or `.env`, adjust `DEFAULT_FPS=0.5` (samples 1 keyframe every 2 seconds instead of 1.0 fps) to cut extraction and inference load in half.
