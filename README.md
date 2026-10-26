# VideoSense AI

An Intelligent Multimodal Video Understanding, Search, Analytics, and Visual Product Discovery Platform.

VideoSense AI uses Computer Vision, Natural Language Processing, and Agentic AI to analyze, index, search, and chat with video feeds.

---

## Folder Structure

```text
videosense-ai/
├── .github/workflows/          # CI/CD pipelines
├── configs/                    # Environment YAML profiles (dev, test, prod, demo)
├── docs/adr/                   # Architecture Decision Records
├── backend/                    # FastAPI Web Server & Multi-Agent AI
│   ├── app/
│   │   ├── api/                # Endpoints (v1 versioned)
│   │   ├── core/               # App configuration & Event Bus
│   │   ├── agents/             # Decoupled AI agents
│   │   ├── database/           # SQLite / PostgreSQL connections
│   │   ├── models/             # SQLAlchemy schemas
│   │   ├── vector_db/          # FAISS adapters
│   │   └── utils/              # Structured logger & caching
│   └── Dockerfile
├── frontend/                   # React.js SPA (Vite + Tailwind CSS)
│   ├── src/
│   │   ├── components/         # Common layouts, timelines, uploader
│   │   └── styles/             # Tailwind & Glassmorphism definitions
│   └── Dockerfile
├── docker/                     # Docker Compose environments
├── README.md                   # Main documentation
├── CHANGELOG.md                # Release versions log
└── PROJECT_PROGRESS.md         # Phase completions tracker
```

---

## Quickstart Guide

### 1. Prerequisite Installations
- **Python 3.10+**
- **Node.js 20+**
- **FFmpeg** (Ensure FFmpeg is installed and added to your System PATH)

---

### 2. Run the Backend
Navigate to the backend directory and install dependencies:
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate   # Windows
# source .venv/bin/activate  # Unix/macOS
pip install -r requirements.txt
```

Set the active configuration profile (options: `development`, `testing`, `production`, `demo`):
```bash
# Windows (PowerShell)
$env:VIDEOSENSE_ENV="development"
# Unix/macOS
export VIDEOSENSE_ENV=development
```

Start the FastAPI development server:
```bash
uvicorn app.main:app --reload
```
- Interactive Swagger documentation: http://localhost:8000/docs
- Health diagnostics check: http://localhost:8000/api/v1/health/

---

### 3. Run the Frontend
Navigate to the frontend directory:
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:5173 in your browser.

---

## Container Deployment (Docker)

To run the application using Docker Compose (Development):
```bash
docker compose -f docker/docker-compose.dev.yml up --build
```

To run using production configurations (PostgreSQL database service):
```bash
docker compose -f docker/docker-compose.prod.yml up --build
```


<!-- to start
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload --port 8000 -->