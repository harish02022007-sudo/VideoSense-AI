# Features and Functionality Reference

This document provides a thorough functional breakdown of every feature and capability in the **VideoSense AI** platform. It describes user-facing interactions, architectural integration, and source code references.

---

## 1. Feature Map & Functional Matrix

```text
VideoSense AI Platform
├── Workspace Modules
│   ├── Command Center (Dashboard Overview)
│   ├── Upload Center (Ingestion & Format Validation)
│   ├── Video Library (Asset Catalog & Search)
│   └── Timeline Explorer (Synchronized Playback & Bounding Box Overlays)
├── AI Intelligence Engines
│   ├── AI Processing Console (Stage-by-Stage Pipeline Observability)
│   ├── Semantic Search Console (Cross-Modal Natural Language Search)
│   ├── AI Chat & Copilot (Retrieval-Augmented Video Conversation & Summaries)
│   └── Visual Product Discovery (E-Commerce Vector Catalog Matching)
├── Analytics & Governance
│   ├── Analytics Hub (Entity Metrics, Distributions, & Heatmaps)
│   ├── Reports Center (Automated Executive PDF Dossier Generation)
│   ├── Notification Center (Pipeline & System Event Alerts)
│   └── AI Models Registry (Provider Specs, Status, & Resource Profiles)
└── System Administration & Overlays
    ├── System Monitor (Hardware Telemetry, CPU, RAM, & Latency)
    ├── Activity Logs (Execution Tracing & Correlation IDs)
    ├── Command Palette (Universal Ctrl+K Navigation & Action Menu)
    └── Floating AI Assistant (Always-Accessible Floating Widget)
```

---

## 2. Workspace Modules

### 2.1 Command Center (Dashboard Overview)
* **File Reference**: [Overview.jsx](file:///d:/VsCode/Sem%20Project/Sem%205%20Project/Proj/VideoSense%20AI/frontend/src/components/dashboard/Overview.jsx)
* **Purpose**: Serves as the operational cockpit of the platform, summarizing processing throughput, total indexed hours, entity detection tallies, and active system health.
* **User Experience & Interactions**:
  * **Metric KPI Cards**: Top row displaying *Total Videos Ingested*, *Processed Hours*, *Detected Entities Count*, and *Active Multimodal Indexes*. Each card features glowing gradient borders and trend indicators.
  * **Quick Ingestion Shortcut**: Prominent call-to-action button (*Upload New Video*) routing directly to the Upload Center.
  * **Recent Video Strip**: Carousel of recently analyzed videos featuring generated thumbnail posters, duration chips, keyframe counts, and status badges (`Ready`, `Processing`, `Failed`).
  * **System Health Widget**: Real-time snapshot of the backend API heartbeat, CPU load, and memory allocation.
  * **Action Triggers**: Clicking any video card automatically loads its context and routes the operator to the Timeline Explorer or AI Chat.

---

### 2.2 Upload Center
* **File Reference**: [UploadPanel.jsx](file:///d:/VsCode/Sem%20Project/Sem%205%20Project/Proj/VideoSense%20AI/frontend/src/components/upload/UploadPanel.jsx)
* **Purpose**: Manages secure video asset intake, client-side format checks, upload streaming with progress reporting, and job dispatching.
* **User Experience & Interactions**:
  * **Interactive Dropzone**: Drag-and-drop boundary with dashed borders and hover glow states. Accepts standard video MIME types (`video/mp4`, `video/quicktime`, `video/x-msvideo`, `video/x-matroska`).
  * **Pre-Loaded Sample Picker**: For testing and demonstration, users can select from curated video samples with a single click, eliminating the need to locate local test media.
  * **Upload Progress Visualization**: Animated radial and linear progress meters reflecting real-time byte transfer percentages via `axios` upload hooks.
  * **Post-Upload Action**: Once the file is received and the backend assigns a Job ID, the UI offers instant options: *Inspect Pipeline in Real-Time* or *Upload Another Video*.

---

### 2.3 Video Library
* **File Reference**: [VideoLibrary.jsx](file:///d:/VsCode/Sem%20Project/Sem%205%20Project/Proj/VideoSense%20AI/frontend/src/components/library/VideoLibrary.jsx)
* **Purpose**: Comprehensive asset management grid offering search, sorting, filtering, and batch operations across all ingested media.
* **User Experience & Interactions**:
  * **Search & Filter Bar**: Instant client-side search filtering by video title, file format, duration, or processing status.
  * **View Mode Toggler**: Switch between an information-dense table view and a visual grid card view with video thumbnail posters.
  * **Asset Meta Tags**: Cards display codec information (`H.264`, `AAC`), frame rate (`FPS: 30`), resolution dimensions (`1080x1920`, `1920x1080`), file size, and upload timestamps.
  * **Contextual Menu**: Options to launch Timeline Explorer, open Semantic Search pre-scoped to that video, trigger AI Chat, or delete the video asset and associated vector indexes.

---

### 2.4 Timeline Explorer
* **File Reference**: [VideoTimeline.jsx](file:///d:/VsCode/Sem%20Project/Sem%205%20Project/Proj/VideoSense%20AI/frontend/src/components/timeline/VideoTimeline.jsx)
* **Purpose**: Core multimodal inspection workspace synchronizing video playback with keyframes, bounding box overlays, and multi-track metadata.
* **User Experience & Interactions**:
  * **Split-View Canvas**: Left side features an HTML5 video player with custom transport controls; right side houses the *AI Keyframe Studio* rendering high-resolution keyframe snapshots with vector bounding boxes.
  * **Dynamic Bounding Box Overlays**: Detected objects are rendered on the keyframe canvas with color-coded borders, confidence percentage badges, and spatial reticles. Hovering over any object pill highlights its corresponding bounding box on the video frame.
  * **Class & Confidence Filtering**:
    * *Confidence Slider*: Range input dynamically filtering displayed boxes from 0% to 100%.
    * *Class Filter Dropdown*: Allows operators to isolate specific entities (e.g., viewing only *worker*, *helmet*, or *vehicle*).
  * **Extracted Keyframe Timeline Strip**: Horizontally scrollable strip displaying every extracted scene keyframe with timestamp chips. Clicking any keyframe seeks the video player to that exact timestamp and updates the bounding box inspector.
  * **Multi-Track Insights Tabs**:
    * *Detected Objects*: Comprehensive chronological list of localized entities with coordinates and confidence scores.
    * *Spoken Transcripts*: Full speech transcription with clickable timestamps that seek playback to the speaker's words.
    * *Screen Text (OCR)*: On-screen text extractions with bounding box coordinates.
    * *Scene Segments*: Visual scene cuts identified by transition algorithms.

---

## 3. AI Intelligence Engines

### 3.1 AI Processing Console
* **File Reference**: [AIProcessingConsole.jsx](file:///d:/VsCode/Sem%20Project/Sem%205%20Project/Proj/VideoSense%20AI/frontend/src/components/ui/AIProcessingConsole.jsx)
* **Purpose**: Provides real-time visibility into the asynchronous multimodal processing pipeline.
* **User Experience & Interactions**:
  * **Stage-by-Stage Workflow Stepper**: Visual progress tracker detailing the 6 pipeline stages:
    1. *Video Ingestion & Validation* (Integrity hashing & metadata probe)
    2. *Scene & Keyframe Decomposition* (Structural transition cuts)
    3. *Visual Entity Detection* (Deep learning object localization)
    4. *Optical Character Recognition* (Text spatial parsing)
    5. *Acoustic Speech Transcription* (Audio speech-to-text)
    6. *Multimodal Embedding Generation* (High-dimensional vector indexing)
  * **Live Terminal Log Feed**: Monospace log stream showing exact execution timestamps, log levels (`INFO`, `WARN`, `ERROR`), and stage execution times.
  * **Pipeline Controls**: Action buttons to pause, retry failed stages, or cancel running processing jobs.

---

### 3.2 Semantic Search & Natural Language Timestamp Retrieval
* **File Reference**: [SemanticSearchConsole.jsx](file:///d:/VsCode/Sem%20Project/Sem%205%20Project/Proj/VideoSense%20AI/frontend/src/components/search/SemanticSearchConsole.jsx), [search.py](file:///d:/VsCode/Sem%20Project/Sem%205%20Project/Proj/VideoSense%20AI/backend/app/api/v1/endpoints/search.py), [agent_orchestrator.py](file:///d:/VsCode/Sem%20Project/Sem%205%20Project/Proj/VideoSense%20AI/backend/app/ai_agents/agent_orchestrator.py)
* **Purpose**: Cross-modal neural search engine allowing operators to discover specific video moments using open-vocabulary natural language descriptions (e.g. *"Where did I leave my red backpack?"*, *"Find the moment a dog runs across the street"*), spoken keywords, or visual concepts.
* **Underlying Agentic Orchestration**:
  * An **Agent Orchestrator** parses the query syntax to identify intent:
    * Questions about dialog route with priority to **Audio Transcripts** (Acoustic layer).
    * Questions about signage, license plates, or badges route to **OCR Streams** (Spatial text layer).
    * Descriptive visual actions route to **Keyframe Vector Embeddings & Object Reticles** (Vision layer).
    * Complex queries trigger **Hybrid Multi-Vector Fusion** across all three modalities concurrently.
* **User Experience & Interactions**:
  * **Universal Search Input**: Search bar with real-time query parsing supporting natural language queries.
  * **Modality Filter Chips**: Toggle buttons allowing users to scope retrieval across:
    * `All Modalities` (Unified hybrid ranking combining vision + audio + OCR)
    * `Visual Entities` (Visual detections only)
    * `Spoken Audio` (Speech transcripts only)
    * `Screen Text` (OCR extractions only)
  * **Video Scope Selector**: Allows searching globally across the entire video library or constraining queries to a specific video.
  * **Precise Timestamp Result Cards**: Rich cards displaying keyframe thumbnails, exact timestamp intervals (`[01:12 - 01:18]`), relevance score meters (`96% Match`), matched modalities, and snippet excerpts.
  * **Instant Playback Jump**: Clicking any result card navigates directly to the Timeline Explorer and automatically seeks to the exact millisecond of the match.

---

### 3.3 AI Video Chat & Multimodal Copilot
* **File Reference**: [VideoChatPanel.jsx](file:///d:/VsCode/Sem%20Project/Sem%205%20Project/Proj/VideoSense%20AI/frontend/src/components/chat/VideoChatPanel.jsx), [chat.py](file:///d:/VsCode/Sem%20Project/Sem%205%20Project/Proj/VideoSense%20AI/backend/app/api/v1/endpoints/chat.py), [video_understanding.py](file:///d:/VsCode/Sem%20Project/Sem%205%20Project/Proj/VideoSense%20AI/backend/app/services/video_understanding.py)
* **Purpose**: Conversational video intelligence powered by a true Multimodal Understanding Engine. Rather than simply listing isolated labels, the system synthesizes visual detections, acoustic speech, OCR text, and temporal duration into coherent narrative understanding.
* **User Experience & Interactions**:
  * **AI Persona Selector**: Toggle between specialized analytical personas:
    * *Surveillance & Security Analyst*: Rigorous chronological audit with spatial coordinates and timestamps.
    * *Executive Briefing Specialist*: Concise high-level summaries and action items.
    * *Forensic Investigator*: Detailed entity tracking, anomalies, and safety compliance checks.
  * **Narrative Scene Synthesis**: Generates full natural language stories explaining what is happening chronologically across the video.
  * **Factual Citations & Timestamp Verification**: Every AI response cites precise timestamps (e.g., `[00:08] (8.0s)`) and entity confidence ratings.
  * **Interactive Citation Cards**: Clicking citations renders a floating preview thumbnail and seeks the video player to the exact frame.
  * **One-Click Video Summarization**: Preset buttons to generate instant comprehensive summaries of the entire video or specific chapters.
  * **Suggested Follow-Up Prompts**: Contextually generated prompts displayed after each answer to guide deeper exploration.

---

### 3.4 Visual Product Discovery
* **File Reference**: [App.jsx](file:///d:/VsCode/Sem%20Project/Sem%205%20Project/Proj/VideoSense%20AI/frontend/src/App.jsx#L161-L200)
* **Purpose**: Bridges video analysis with commercial catalog discovery by matching visual entities in video frames against vector catalog databases.
* **User Experience & Interactions**:
  * **Catalog Matching Grid**: Cards displaying identified items (footwear, apparel, accessories, equipment) with visual similarity percentages (`94% Similarity`).
  * **Product Metadata**: Displays brand name, item title, product category, and price.
  * **Catalog Inspector Trigger**: Deep link button allowing operators to inspect matching e-commerce inventory details.

---

## 4. Analytics & Governance Modules

### 4.1 Analytics Hub
* **File Reference**: [AnalyticsDashboard.jsx](file:///d:/VsCode/Sem%20Project/Sem%205%20Project/Proj/VideoSense%20AI/frontend/src/components/analytics/AnalyticsDashboard.jsx)
* **Purpose**: Comprehensive telemetry and statistical reporting dashboard for video repositories.
* **User Experience & Interactions**:
  * **Class Distribution Bar Charts**: Interactive horizontal and vertical bar charts illustrating the frequency and occurrence of detected object classes.
  * **Timeline Activity Heatmap**: Visual density graph showing entity concentrations across the video's timeline to identify peaks in activity.
  * **Top OCR Signage Keywords**: Ranked badge list of most frequently occurring on-screen words and phrases.
  * **Scene Cut Velocity**: Analysis of average scene lengths and editing pacing.

---

### 4.2 Reports Center
* **File Reference**: [ReportsManager.jsx](file:///d:/VsCode/Sem%20Project/Sem%205%20Project/Proj/VideoSense%20AI/frontend/src/components/reports/ReportsManager.jsx)
* **Purpose**: Document generation hub for exporting executive intelligence dossiers.
* **User Experience & Interactions**:
  * **Report Template Selector**: Options to generate Security Audits, Executive Summaries, Compliance Reports, or Complete Forensic Dossiers.
  * **One-Click PDF Export**: Invokes backend ReportLab PDF compilation to deliver formatted, branded PDF files with embedded keyframe tables, object charts, and metadata summaries.

---

### 4.3 Notification Center & System Monitor
* **File References**: [NotificationCenter.jsx](file:///d:/VsCode/Sem%20Project/Sem%205%20Project/Proj/VideoSense%20AI/frontend/src/components/ui/NotificationCenter.jsx), [SystemMonitor.jsx](file:///d:/VsCode/Sem%20Project/Sem%205%20Project/Proj/VideoSense%20AI/frontend/src/components/ui/SystemMonitor.jsx)
* **Purpose**: Operational health monitoring and event notification management.
* **User Experience & Interactions**:
  * **System Telemetry**: Real-time meters for CPU utilization, RAM consumption, disk storage quota, and active background worker threads.
  * **Notification Feed**: Chronological list of pipeline milestones, completion notices, and system alerts with severity indicators (`Success`, `Warning`, `Error`).

---

## 5. Universal Overlays & Navigation Controls

### 5.1 Command Palette (`Ctrl+K`)
* **File Reference**: [CommandPalette.jsx](file:///d:/VsCode/Sem%20Project/Sem%205%20Project/Proj/VideoSense%20AI/frontend/src/components/ui/CommandPalette.jsx)
* **Purpose**: Power-user keyboard navigation and action launcher accessible from anywhere via `Ctrl+K` or `Cmd+K`.
* **User Experience & Interactions**:
  * **Search & Filter**: Real-time filtering across all platform views, quick actions, and open videos.
  * **Keyboard Navigation**: Up/Down arrow selection, `Enter` to navigate, `Escape` to close.
  * **Category Badges**: Distinct grouping tags (`Navigation`, `Actions`, `AI Tools`).

---

### 5.2 Floating AI Assistant
* **File Reference**: [FloatingAssistant.jsx](file:///d:/VsCode/Sem%20Project/Sem%205%20Project/Proj/VideoSense%20AI/frontend/src/components/ui/FloatingAssistant.jsx)
* **Purpose**: Persistent, accessible copilot icon anchored in the bottom-right viewport.
* **User Experience & Interactions**:
  * **Floating Trigger**: Glowing circular icon with a pulsing brain graphic.
  * **Expandable Chat Popover**: Clicking expands a streamlined conversational window with quick-prompt chips for instant queries without leaving the current view.
