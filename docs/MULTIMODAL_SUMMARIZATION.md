# VideoSense AI — Multimodal Video Summarization

## 1. Feature Purpose & Overview
The **Multimodal Video Summarization** engine synthesizes visual observations (YOLO/Grounding DINO object detections, keyframe offsets, OCR text signages, scene transitions) and audio observations (FFmpeg audio stream probe, Whisper speech-to-text) into coherent, natural-language executive summaries, timestamped key events, and chronological chapters.

Users can choose between:
1. **Visual-Only Mode (`visual_only`)**: Analyzes visual evidence, object tracking corridors, and on-screen signages without requiring an audio stream.
2. **Audio-Visual Mode (`audio_visual`)**: Combines visual events with spoken dialogue transcripts and acoustic background atmosphere telemetry.

---

## 2. Architecture & Pipeline Data Flow

```text
Uploaded Video
      │
      ▼
1. Video Validation & Stream Probe (FFprobe / MetadataExtractor)
      │
      ├─────────────────────────────────────────┐
      ▼                                         ▼
2. Visual Pipeline                       3. Audio Pipeline
   - Frame sampling & timestamps            - FFmpeg audio extraction
   - YOLOv11 / Grounding DINO objects       - Whisper speech recognition
   - EasyOCR signages                       - Dialogue segment timestamps
      │                                         │
      └──────────────────┬──────────────────────┘
                         ▼
4. Multimodal Evidence Fusion & Temporal Alignment
   - Deduplication of redundant detections
   - Correlation of overlapping timeframes
   - Soundscape identification (Speech vs Ambient)
                         ▼
5. NLP Summarization Engine
   - Concise Executive Short Summary (2-4 sentences)
   - Detailed Chronological Narrative
   - Seekable Key Events with Playback Coordinates
   - Thematic Chapter Segments
                         ▼
6. Storage & Status Polling (`video_summaries` table)
                         ▼
7. Frontend Presentation (Interactive HUD & Video Player Seek)
```

---

## 3. Supported Summary Modes

### Mode 1: Visual-Only (`visual_only`)
- Focuses purely on visual evidence across keyframes.
- Tracks active object classes, movement corridors (e.g. cyclist sharing roadway with motor vehicles), curbside bus arrivals, and pedestrian crossings.
- Transcribes on-screen text (OCR) such as bus route numbers or street signs.
- **Zero audio dependency**: Runs even if the video has no audio track or corrupt audio.

### Mode 2: Audio-Visual (`audio_visual`)
- Simultaneously monitors video frames and audio streams.
- Performs Whisper speech-to-text with segment-level timestamps.
- **Ambient Audio Telemetry**: If audio is present without spoken words, it notes: *"The video features an ambient background audio atmosphere with no spoken human dialogue."*
- Binds spoken statements to concurrent visual occurrences.

---

## 4. Models Used & Resource Efficiency

| Component | Selected Model | Why Selected | Device Profile |
| :--- | :--- | :--- | :--- |
| **Object Detection** | YOLOv11 (`yolo11m.pt`) / Grounding DINO | Zero-shot & class-specific high confidence bounding boxes | CPU / CUDA |
| **Text Recognition** | EasyOCR Engine | Reads route numbers and commercial text signages | CPU / CUDA |
| **Speech-to-Text** | Faster-Whisper (`tiny` / `base`) | Word & segment level timestamps; rapid inference on CPU | CPU / CUDA |
| **Multimodal Synthesis** | Multimodal Context Fusion Engine | Fuses structured events into chronological narrative without hallucination | CPU (Zero external API costs) |

---

## 5. Backend Endpoints (API v1)

All endpoints follow the project's standard `ResponseEnvelope[T]` format:

- `POST /api/v1/videos/{video_id}/summarize?async_run=true`
  - Body: `{"mode": "audio_visual" | "visual_only", "force_regenerate": false}`
  - Dispatches background job (or returns instantly from cache if previously computed).
- `GET /api/v1/videos/{video_id}/summary/status?mode=audio_visual`
  - Returns real-time execution progress: `queued`, `validating`, `extracting_frames`, `analyzing_visuals`, `extracting_audio`, `transcribing_audio`, `extracting_events`, `generating_summary`, `completed`.
- `GET /api/v1/videos/{video_id}/summary?mode=audio_visual`
  - Retrieves the full completed summary DTO including short summary, detailed narrative, key events, chapters, and transcript segments.
- `GET /api/v1/videos/{video_id}/summaries`
  - Lists all summaries generated across different modes for the video.

---

## 6. How to Run the Application

### Backend
```powershell
# Open terminal in backend directory
cd "d:\VsCode\Sem Project\Sem 5 Project\Proj\VideoSense AI\backend"
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload --port 8000
```

### Frontend
```powershell
# Open terminal in frontend directory
cd "d:\VsCode\Sem Project\Sem 5 Project\Proj\VideoSense AI\frontend"
npm run dev
```
Open **http://localhost:5173** in your browser.

---

## 7. How to Use the Feature (Step-by-Step)

1. Open **http://localhost:5173/**.
2. In the left navigation menu, click **AI Video Summary** (or navigate to **Timeline Explorer** and click the **AI Video Summary** tab).
3. Select your desired video from the dropdown (e.g. `gemini_generated_video_e148c94a.mp4`).
4. Choose between **Visual-Only** or **Audio-Visual** mode.
5. Click **Generate Summary** (or **Regenerate Summary**).
6. Watch the live stage progress tracker transition smoothly from validation to completion.
7. Inspect the **Executive Summary**, **Detailed Chronological Narrative**, **Key Events**, and **Chapters**.
8. Click any event's timestamp button (e.g. `[00:07]`) to jump the video player to that exact scene!

---

## 8. Running Automated Tests

```powershell
cd "d:\VsCode\Sem Project\Sem 5 Project\Proj\VideoSense AI\backend"
python -m pytest tests/unit/test_summarization_service.py tests/unit/test_summarization_endpoint.py -v
```
All 10 unit and endpoint tests execute completely offline without requiring external API calls or GPU downloads.
