# Source Code Explanation

## Executive Summary
This document provides a comprehensive walkthrough of the **VideoSense AI** source code organization, mapping physical file locations to their architectural responsibilities, data structures, and core functions.

---

## 1. Project Directory Structure

```text
VideoSense-AI/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── endpoints/
│   │   │       │   ├── analysis.py      # Frame inspection & on-demand class detection
│   │   │       │   ├── analytics.py     # Aggregated chart metrics & video stats
│   │   │       │   ├── chat.py          # Multi-persona conversational RAG agent
│   │   │       │   ├── health.py        # System health, CPU/RAM, and service status
│   │   │       │   ├── jobs.py          # Background processing job queue controls
│   │   │       │   ├── mlops.py         # Model registry & inference latency
│   │   │       │   ├── search.py        # Multimodal hybrid vector search
│   │   │       │   ├── system.py        # Host telemetry, storage, and specs
│   │   │       │   └── videos.py        # Multipart video uploads, streaming, CRUD
│   │   │       └── router.py            # APIRouter mounting all v1 endpoints
│   │   ├── core/
│   │   │   ├── config.py                # Pydantic V2 application settings
│   │   │   ├── exceptions.py            # Standardized domain exceptions
│   │   │   └── logging.py               # Structured logger with correlation ID
│   │   ├── database/
│   │   │   └── session.py               # SQLAlchemy async engine & declarative base
│   │   ├── middleware/
│   │   │   ├── correlation.py           # X-Correlation-ID request tracing
│   │   │   └── exception_handler.py     # Global error trap & JSON envelope
│   │   ├── models/
│   │   │   ├── analysis.py              # Video, Job, Frame, OCRResult, Transcript, Scene, Object
│   │   │   ├── embedding.py             # VideoEmbedding relational model
│   │   │   ├── pipeline.py              # Pipeline execution config models
│   │   │   └── worker.py                # Worker node heartbeat tracking
│   │   ├── processing/
│   │   │   ├── audio_extractor.py       # 16kHz mono WAV audio extraction
│   │   │   ├── embedding_generator.py   # Sentence-Transformers vector encoder
│   │   │   ├── frame_extractor.py       # OpenCV keyframe sampling (1.0 fps)
│   │   │   ├── ocr_scanner.py           # EasyOCR multilingual text reader
│   │   │   ├── pipeline_coordinator.py  # 6-stage async pipeline orchestrator
│   │   │   ├── scene_detector.py        # PySceneDetect shot cut analyzer
│   │   │   ├── speech_transcriber.py    # Faster-Whisper speech-to-text
│   │   │   └── visual_detector.py       # Deep learning visual target localization
│   │   ├── repositories/
│   │   │   ├── unit_of_work.py          # Transactional Unit of Work coordinator
│   │   │   ├── video_repository.py      # Video CRUD operations
│   │   │   ├── job_repository.py        # Job queue state transitions
│   │   │   ├── frame_repository.py      # Keyframe and thumbnail queries
│   │   │   └── analysis_repository.py   # OCR, Object, Transcript queries
│   │   ├── schemas/
│   │   │   ├── common.py                # Standard API response envelope
│   │   │   ├── video.py                 # Video upload & metadata schemas
│   │   │   ├── search.py                # Search request & candidate schemas
│   │   │   └── chat.py                  # Chat prompt, response & citation schemas
│   │   ├── services/
│   │   │   ├── video_service.py         # File ingestion & metadata validation
│   │   │   ├── search_service.py        # Hybrid vector & relational query logic
│   │   │   ├── chat_service.py          # Multi-persona prompt & RAG synthesizer
│   │   │   └── analytics_service.py     # Metric aggregation for charts
│   │   ├── vector_db/
│   │   │   └── faiss_store.py           # FAISS index manager (add, search, persist)
│   │   ├── workers/
│   │   │   └── worker_manager.py        # Background thread queue consumer
│   │   └── main.py                      # FastAPI application entrypoint
│   ├── alembic/                         # Database migration scripts
│   ├── storage/                         # Uploaded videos, keyframes, thumbnails
│   └── requirements.txt                 # Backend Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── analytics/               # AnalyticsDashboard.jsx
│   │   │   ├── auth/                    # AuthPage.jsx
│   │   │   ├── chat/                    # VideoChatPanel.jsx
│   │   │   ├── common/                  # Navbar.jsx, Sidebar.jsx, BackgroundBlobs.jsx
│   │   │   ├── dashboard/               # Overview.jsx
│   │   │   ├── landing/                 # LandingPage.jsx
│   │   │   ├── library/                 # VideoLibrary.jsx
│   │   │   ├── onboarding/              # OnboardingFlow.jsx
│   │   │   ├── reports/                 # ReportsManager.jsx
│   │   │   ├── search/                  # SemanticSearchConsole.jsx
│   │   │   ├── timeline/                # VideoTimeline.jsx
│   │   │   ├── ui/                      # AIProcessingConsole, CommandPalette, FloatingAssistant
│   │   │   └── upload/                  # UploadPanel.jsx
│   │   ├── services/
│   │   │   └── api.js                   # Axios client with auto port failover
│   │   ├── styles/
│   │   │   └── index.css                # Glass panel utilities & 7-layer canvas
│   │   ├── App.jsx                      # Root component & tab state machine
│   │   └── main.jsx                     # Vite DOM mount point
│   ├── package.json                     # Frontend dependencies
│   ├── tailwind.config.js               # Tailwind tokens, shadows, animations
│   └── vite.config.js                   # Vite configuration
└── summary/                             # Comprehensive project documentation
```

---

## 2. Key Backend Modules & Source Code Analysis

### 2.1 Application Entrypoint (`backend/app/main.py`)
- **Responsibilities**:
  - Initializes the `FastAPI` application instance using parameters from `settings.app`.
  - Configures CORS middleware supporting credentialed cross-origin requests.
  - Registers the `CorrelationIdMiddleware` for request tracking.
  - Registers global exception handlers for `BaseAppException` and generic `Exception`.
  - Mounts the versioned API router at `/api/v1`.
  - Mounts static file directories: `/uploads` for video streaming, keyframes, and thumbnails; `/sample_videos` for demonstration clips.
  - Dispatches startup event hooks: `initialize_model_registry()` and `WorkerManager.start_worker()`.

### 2.2 Relational Domain Models (`backend/app/models/analysis.py`)
All entities inherit from SQLAlchemy declarative `Base`:

1. **`Video`**:
   - Primary entity representing an ingested video file.
   - Fields: `id` (UUID), `filename`, `filepath`, `mime_type`, `duration`, `fps`, `width`, `height`, `codec`, `size_bytes`, `sha256_hash`, `uploaded_at`.
   - Relationships: One-to-One with `Job`, One-to-Many with `Frame`, `OCRResult`, `Transcript`, `Scene`, `Object`.
2. **`Job`**:
   - Represents the background processing lifecycle of a video.
   - Fields: `id`, `video_id`, `status` (`queued`, `running`, `completed`, `failed`), `progress` (0–100), `current_stage`, `priority`, `retry_count`, `error_code`, `error_message`.
3. **`Frame`**:
   - Represents a keyframe sampled from the video.
   - Fields: `id`, `video_id`, `frame_number`, `timestamp_offset_ms`, `filepath`, `thumbnail_path`, `is_keyframe`, `quality_score`.
4. **`Object`**:
   - Visual object localized on a specific video keyframe.
   - Fields: `id`, `video_id`, `frame_id`, `class_label` (indexed), `confidence`, `box_x_min`, `box_y_min`, `box_x_max`, `box_y_max`, `tracking_id`.
5. **`Transcript`**:
   - Spoken audio segment recognized from the video soundtrack.
   - Fields: `id`, `video_id`, `text` (indexed), `confidence`, `start_time_ms`, `end_time_ms`, `speaker_label`, `language`.
6. **`OCRResult`**:
   - On-screen text detected within a frame.
   - Fields: `id`, `video_id`, `frame_id`, `text` (indexed), `confidence`, `box_x_min`, `box_y_min`, `box_x_max`, `box_y_max`, `frame_timestamp`.
7. **`Scene`**:
   - Temporal boundary defining a distinct camera shot.
   - Fields: `id`, `video_id`, `scene_number`, `start_time_ms`, `end_time_ms`.

### 2.3 Video Processing Pipeline (`backend/app/processing/`)
The ingestion pipeline is broken down into modular stage workers coordinated by `pipeline_coordinator.py`:

- **`frame_extractor.py`**:
  Uses OpenCV (`cv2.VideoCapture`) to sample frames at regular intervals (default: 1.0 fps). Writes high-resolution keyframes and compressed thumbnail images to disk.
- **`scene_detector.py`**:
  Uses `scenedetect.detect` with adaptive content thresholding to pinpoint cut transitions between camera angles.
- **`audio_extractor.py`**:
  Extracts audio streams into 16kHz mono 16-bit PCM WAV format optimal for speech recognition.
- **`speech_transcriber.py`**:
  Initializes `Faster-Whisper` model to transcribe spoken dialogue into timestamped text segments with word confidence.
- **`ocr_scanner.py`**:
  Runs `EasyOCR` on sampled keyframes to extract printed and stylized alphanumeric text.
- **`visual_detector.py`**:
  Executes the deep learning visual detection model over keyframes, extracting classified bounding boxes with normalized coordinates `[x_min, y_min, x_max, y_max]`.
- **`embedding_generator.py`**:
  Encodes keyframe scene summaries and text transcriptions into 384-dimensional dense vectors using `Sentence-Transformers`.

### 2.4 Vector Search Engine (`backend/app/vector_db/faiss_store.py`)
- **Responsibilities**:
  - Initializes FAISS vector indices (`IndexFlatIP` for cosine similarity or `IndexFlatL2`).
  - Implements `add_vectors(vectors, metadata)` to ingest multi-dimensional embedding arrays.
  - Implements `search(query_vector, top_k, filter_dict)` to retrieve top-k nearest neighbors with cosine similarity scoring.
  - Serializes and deserializes the index to disk for persistence across server restarts.

### 2.5 Resilient API Client (`frontend/src/services/api.js`)
- **Responsibilities**:
  - Configures the primary Axios instance pointing to `API_V1` (defaulting to port `8001`).
  - Implements the automatic port failover response interceptor:
    If a network error occurs on port 8001, it tests `http://localhost:8000/api/v1/health/`. On success, it permanently updates `API_BASE_URL` to 8000, caches the preference in `localStorage`, and retries the failed request seamlessly.
  - Exposes strongly-typed API method wrappers for video uploads, processing queries, keyframes, timeline data, semantic search, and chat.
