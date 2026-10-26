# API and Backend Documentation

## Executive Summary
The **VideoSense AI** backend exposes a comprehensive RESTful API built on **FastAPI**. All endpoints are versioned under `/api/v1`, enforce strict Pydantic V2 request/response validation, support CORS and distributed request tracing via `CorrelationIdMiddleware`, and return consistent JSON response envelopes.

---

## 1. Unified Response Envelope & HTTP Status Codes

Every API endpoint wraps its payload inside a standard response envelope schema:

```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "correlation_id": "c7a8e23f-92bd-4a11-89e4-8a47291a13bc",
  "timestamp": "2026-10-25T11:20:00Z"
}
```

### Error Envelope Example:
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VIDEO_NOT_FOUND",
    "message": "The video with ID 3fa85f64-5717-4562-b3fc-2c963f66afa6 does not exist.",
    "details": {}
  },
  "correlation_id": "c7a8e23f-92bd-4a11-89e4-8a47291a13bc",
  "timestamp": "2026-10-25T11:20:00Z"
}
```

### Standard Status Codes:
- `200 OK`: Request succeeded.
- `201 Created`: Resource successfully created (e.g., file uploaded).
- `400 Bad Request`: Validation failure or unsupported codec.
- `404 Not Found`: Target entity UUID does not exist.
- `422 Unprocessable Entity`: Pydantic schema validation error.
- `500 Internal Server Error`: Unhandled server exception with correlation ID.

---

## 2. Core API Endpoint Catalog

### 2.1 System & Diagnostics Endpoints

#### `GET /api/v1/health/`
- **Description**: Returns live server operational state, CPU utilization, memory allocation, and database connectivity.
- **Response**:
  ```json
  {
    "status": "healthy",
    "system": {
      "cpu_usage_percent": 14.2,
      "memory_usage_percent": 38.5,
      "disk_usage_percent": 22.0
    },
    "services": {
      "database": { "status": "healthy", "latency_ms": 0.4 },
      "vector_database": { "status": "healthy", "engine": "FAISS-CPU" }
    }
  }
  ```

#### `GET /api/v1/system/telemetry`
- **Description**: Detailed host machine hardware specifications, GPU availability (CUDA), active background worker threads, and storage capacity.

#### `GET /api/v1/system/models`
- **Description**: Returns registry status, inference execution counts, and memory footprint of all installed AI engines.

---

### 2.2 Video Management Endpoints (`/api/v1/videos`)

#### `POST /api/v1/videos/upload`
- **Description**: Multipart stream upload for new video files. Automatically initiates background validation and metadata extraction.
- **Headers**: `Content-Type: multipart/form-data`
- **Form Data**:
  - `file`: Binary video stream (`mp4`, `avi`, `mov`, `mkv`, `webm`).
  - `title` *(optional)*: Custom human-readable label.
- **Response (201 Created)**:
  ```json
  {
    "success": true,
    "data": {
      "video_id": "d98f7e21-3b4c-4a12-98e1-5f210d79e831",
      "filename": "traffic_surveillance_cam01.mp4",
      "job_id": "j41b8a92-23c1-4b77-8021-99af08a2130e",
      "status": "queued",
      "size_bytes": 14859210
    }
  }
  ```

#### `GET /api/v1/videos`
- **Description**: Lists all ingested videos with resolution, duration, FPS, upload timestamp, and processing status.
- **Query Parameters**:
  - `limit` (int, default 50)
  - `offset` (int, default 0)
  - `status` (string, optional: `queued`, `running`, `completed`, `failed`)

#### `GET /api/v1/videos/{video_id}`
- **Description**: Returns complete metadata dossier for a single video record.

#### `GET /api/v1/videos/{video_id}/stream`
- **Description**: Progressive HTTP range streaming (`206 Partial Content`) allowing seekable video playback directly in HTML5 `<video>` tags.

#### `GET /api/v1/videos/{video_id}/thumbnail`
- **Description**: Returns the pre-computed poster thumbnail image (`image/jpeg`).

#### `GET /api/v1/videos/{video_id}/processing`
- **Description**: Real-time status poller for the background AI pipeline. Returns current stage, progress percentage, and error logs if failed.
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "video_id": "d98f7e21-3b4c-4a12-98e1-5f210d79e831",
      "job_id": "j41b8a92-23c1-4b77-8021-99af08a2130e",
      "status": "running",
      "current_stage": "object_detection",
      "progress": 68,
      "estimated_remaining_seconds": 12
    }
  }
  ```

#### `GET /api/v1/videos/{video_id}/frames`
- **Description**: Retrieves extracted keyframes along with spatial object bounding boxes and OCR text detected within each frame.
- **Response**:
  ```json
  {
    "success": true,
    "data": [
      {
        "frame_id": "f01-98e1",
        "frame_number": 1,
        "timestamp_ms": 1000.0,
        "image_url": "/uploads/frames/d98f7e21/frame_0001.jpg",
        "thumbnail_url": "/uploads/frames/d98f7e21/thumb_0001.jpg",
        "objects": [
          {
            "class_label": "car",
            "confidence": 0.942,
            "box": [0.12, 0.45, 0.38, 0.78]
          }
        ],
        "ocr": [
          {
            "text": "STOREFRONT CAFE",
            "confidence": 0.89,
            "box": [0.65, 0.15, 0.88, 0.25]
          }
        ]
      }
    ]
  }
  ```

#### `GET /api/v1/videos/{video_id}/insights`
- **Description**: Aggregates all multimodal findings: speech transcript segments, detected scene transitions, and visual entity counts.

#### `POST /api/v1/videos/{video_id}/detect-custom`
- **Description**: Runs on-demand open-vocabulary class detection over keyframes for user-specified prompts.
- **Payload**:
  ```json
  {
    "classes": ["fire extinguisher", "safety cone"],
    "threshold": 0.28
  }
  ```

---

### 2.3 Multimodal Semantic Search (`/api/v1/search`)

#### `POST /api/v1/search`
- **Description**: Queries the unified FAISS vector index across visual keyframes, spoken dialogue, and OCR text.
- **Payload**:
  ```json
  {
    "query": "delivery van turning left",
    "top_k": 25,
    "modality": "ALL",
    "video_id": null
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": [
      {
        "video_id": "d98f7e21-3b4c-4a12-98e1-5f210d79e831",
        "video_title": "traffic_surveillance_cam01.mp4",
        "timestamp_seconds": 14.2,
        "similarity_score": 0.912,
        "modality": "visual",
        "text_content": "Detected delivery van on roadway",
        "thumbnail_url": "/uploads/frames/d98f7e21/thumb_0014.jpg",
        "box": [0.25, 0.35, 0.62, 0.78]
      }
    ]
  }
  ```

---

### 2.4 Conversational AI Agent (`/api/v1/chat`)

#### `POST /api/v1/chat`
- **Description**: Interacts with the multi-persona conversational RAG agent. Synthesizes relevant keyframes, transcript segments, and OCR text into grounded natural-language responses.
- **Payload**:
  ```json
  {
    "message": "What vehicles appeared between seconds 10 and 20?",
    "video_id": "d98f7e21-3b4c-4a12-98e1-5f210d79e831",
    "persona": "analyst",
    "history": []
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "response": "Between 00:10 and 00:20, two distinct vehicles were detected:\n- **White Delivery Van** localized at [00:14.2] (confidence 94.2%).\n- **Passenger Sedan** traversing the intersection at [00:18.0] (confidence 88.7%).",
      "citations": [
        { "timestamp": 14.2, "label": "White Delivery Van", "frame_url": "/uploads/frames/.../thumb_0014.jpg" },
        { "timestamp": 18.0, "label": "Passenger Sedan", "frame_url": "/uploads/frames/.../thumb_0018.jpg" }
      ],
      "persona": "analyst"
    }
  }
  ```

---

### 2.5 Analytics & Reporting Endpoints

#### `GET /api/v1/analytics/overview`
- **Description**: Returns platform-wide KPI metrics, cumulative hours of video processed, and top detected object classes.

#### `GET /api/v1/analytics/video/{video_id}`
- **Description**: Returns statistical distributions for a single video: entity frequency histograms, temporal activity timeline curves, and detection confidence percentiles.

---

### 2.6 Pipeline Job Management (`/api/v1/jobs`)

#### `GET /api/v1/jobs`
- **Description**: Lists active, completed, and failed pipeline jobs.

#### `GET /api/v1/jobs/{job_id}/logs`
- **Description**: Retrieves streaming console stdout/stderr execution traces for a specific job.

#### `POST /api/v1/jobs/{job_id}/retry`
- **Description**: Re-enqueues a failed or cancelled processing job.

#### `POST /api/v1/jobs/{job_id}/cancel`
- **Description**: Immediately terminates an active video processing job.
