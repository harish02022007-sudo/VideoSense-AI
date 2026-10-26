# Technology Stack

## Executive Summary
The **VideoSense AI** platform is engineered using modern, production-grade technologies across its entire stack. The architecture decouples a high-responsiveness frontend client built on **React 19** and **Vite** from a high-throughput asynchronous backend powered by **FastAPI**, **SQLAlchemy**, and an ensemble of multimodal deep learning engines. Dense vector embeddings and similarity searches are driven by **FAISS**, providing sub-second retrieval across large media catalogs.

---

## 1. Frontend Technology Stack

```text
┌────────────────────────────────────────────────────────────────────────┐
│ REACT 19 SPA (React 19.2.7 + Vite 8.1.1)                               │
├────────────────────────────────┬───────────────────────────────────────┤
│ Styling & Motion               │ Networking & Data Visualization       │
│ • Tailwind CSS 3.4.19          │ • Axios 1.7.9 (Port Failover Client)  │
│ • Framer Motion 11.18.2        │ • Recharts 2.15.0 (Analytics Charts)  │
│ • Lucide React 0.473.0 (Icons) │ • React Router DOM 6.29.0             │
│ • PostCSS 8.5.16               │ • Native HTML5 Canvas & Video API     │
└────────────────────────────────┴───────────────────────────────────────┘
```

### 1.1 Core Frontend Framework & Build System
| Technology | Exact Version | Architecture Role & Purpose |
| :--- | :--- | :--- |
| **React** | `^19.2.7` | Core UI library powering the reactive component tree, hook lifecycle, and virtual DOM diffing. |
| **React DOM** | `^19.2.7` | Direct DOM rendering engine for the single-page application. |
| **Vite** | `^8.1.1` | Next-generation frontend build tool and development server providing lightning-fast Hot Module Replacement (HMR) and optimized Rollup production bundling. |
| **@vitejs/plugin-react** | `^6.0.3` | Babel/SWC integration for React JSX transformation and Fast Refresh in Vite. |

### 1.2 Styling, Design System & Iconography
| Technology | Exact Version | Architecture Role & Purpose |
| :--- | :--- | :--- |
| **Tailwind CSS** | `^3.4.19` | Utility-first CSS framework configured with custom dark palette tokens, 16px glassmorphism blur filters, and glowing shadow elevations. |
| **PostCSS** | `^8.5.16` | CSS processing pipeline enabling Tailwind CSS compilation and autoprefixing. |
| **Autoprefixer** | `^10.5.2` | Automatically appends vendor prefixes to modern CSS properties (e.g., `-webkit-backdrop-filter`). |
| **Framer Motion** | `^11.18.2` | Production motion library powering fluid page transitions, hero banner animations, and modal entrances. |
| **Lucide React** | `^0.473.0` | Comprehensive SVG icon system providing uniform, modern visual glyphs across all 16 navigation tabs and controls. |

### 1.3 State, Networking & Data Visualization
| Technology | Exact Version | Architecture Role & Purpose |
| :--- | :--- | :--- |
| **Axios** | `^1.7.9` | Promise-based HTTP client equipped with an automatic port failover interceptor (switching dynamically between `8001` and `8000`). |
| **Recharts** | `^2.15.0` | Declarative charting library built on SVG elements, rendering real-time entity frequency histograms and temporal distribution curves. |
| **React Router DOM** | `^6.29.0` | Client-side routing primitives supporting deep-linking and stateful navigation. |

---

## 2. Backend Technology Stack

```text
┌────────────────────────────────────────────────────────────────────────┐
│ FASTAPI GATEWAY (FastAPI 0.110.0 + Uvicorn 0.28.0)                     │
├────────────────────────────────┬───────────────────────────────────────┤
│ Data & Persistence             │ Media & Audio Processing              │
│ • SQLAlchemy 2.0.28 (ORM)      │ • OpenCV Headless 4.9.0.80            │
│ • aiosqlite 0.20.0             │ • PySceneDetect 0.6.4                 │
│ • Alembic 1.11.0 (Migrations)  │ • ReportLab 4.1.0 (PDF Engine)        │
├────────────────────────────────┴───────────────────────────────────────┤
│ AI & Multimodal Intelligence                                           │
│ • PyTorch 2.2.1 & Torchvision 0.17.1 (Deep Learning Framework)         │
│ • Visual Target Detection & Localization Engine                        │
│ • Faster-Whisper 1.0.0 (Speech-to-Text Transcription)                  │
│ • EasyOCR 1.7.1 (Multilingual Optical Character Recognition)           │
│ • Sentence-Transformers 2.5.1 (Dense Vector Embeddings)                │
│ • FAISS-CPU 1.8.0 (High-Speed Vector Similarity Indexing)              │
└────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Web Framework, Server & API Layer
| Technology | Exact Version | Architecture Role & Purpose |
| :--- | :--- | :--- |
| **FastAPI** | `>=0.110.0` | High-performance Python async web framework providing OpenAPI autodocumentation, dependency injection, and endpoint validation. |
| **Uvicorn** | `>=0.28.0` | Lightning-fast ASGI web server implementation based on `uvloop` and `httptools`. |
| **Pydantic** | `>=2.6.4` | Data validation and settings management using Python type hints with native V2 Rust core speed. |
| **Pydantic-Settings**| `>=2.2.1` | Environment variable and `.env` file configuration parser. |
| **Python-Multipart**| `>=0.0.9` | Streaming parser handling large binary video chunk uploads (`multipart/form-data`). |
| **HTTPX** | `>=0.27.0` | Asynchronous HTTP client for server-to-server health checks and external REST communications. |

### 2.2 Data Persistence & Database Layer
| Technology | Exact Version | Architecture Role & Purpose |
| :--- | :--- | :--- |
| **SQLAlchemy** | `>=2.0.28` | Enterprise-grade Object Relational Mapper (ORM) using the 2.0 declarative style and Unit of Work pattern. |
| **aiosqlite** | `>=0.20.0` | Async driver for SQLite, allowing non-blocking database queries in async route handlers. |
| **Alembic** | `>=1.11.0` | Database schema migration tool managing schema evolution and version control. |
| **Psycopg2-Binary** | `>=2.9.9` | PostgreSQL database adapter for production environments requiring high concurrency. |

### 2.3 Computer Vision & Media Slicing
| Technology | Exact Version | Architecture Role & Purpose |
| :--- | :--- | :--- |
| **OpenCV (Headless)**| `>=4.9.0.80`| Video frame decoding, spatial transforms, bounding box rendering, and image resizing without X11 GUI overhead. |
| **PySceneDetect** | `>=0.6.4` | Automated scene cut detection analyzing threshold differences to identify logical video shot boundaries. |
| **Pillow (PIL)** | `>=10.2.0` | High-fidelity image manipulation, thumbnail generation, and color space conversion. |
| **NumPy** | `>=1.26.4` | High-performance N-dimensional array processing for video tensors and vector math. |
| **Pandas** | `>=2.2.1` | Tabular data structures and analytics data aggregation for statistical charts. |

---

## 3. Multimodal Artificial Intelligence Engines

### 3.1 AI Inference & Search Stack
| Technology / Engine | Exact Version | Role in VideoSense AI Architecture |
| :--- | :--- | :--- |
| **PyTorch (`torch`)** | `>=2.2.1` | Deep learning computation framework powering GPU/CPU tensor graphs and neural inference. |
| **Torchvision** | `>=0.17.1` | Vision models, tensor transforms, and image preprocessing primitives. |
| **Visual Detection Engine** | Modern DL Engine | Detects, classifies, and tracks spatial objects across sampled video keyframes with bounding box coordinates. |
| **Faster-Whisper** | `>=1.0.0` | Optimized CTranslate2 re-implementation of Whisper for speech recognition, delivering 4x faster transcription. |
| **EasyOCR** | `>=1.7.1` | Deep learning optical character recognition detecting alphanumeric text on signs, apparel, and video displays. |
| **Sentence-Transformers** | `>=2.5.1` | Computes dense vector embeddings across video captions, OCR text, and spoken dialogue. |
| **FAISS-CPU** | `>=1.8.0` | High-density vector similarity search engine executing L2 and cosine vector retrieval in sub-5ms latency. |
| **Hugging Face Transformers**| `>=4.38.2` | Model weights manager and tokenizer pipeline. |
| **Accelerate** | `>=0.27.2` | Multi-device execution optimization and mixed-precision inference acceleration. |

---

## 4. Security, Utilities & Document Generation

| Technology | Exact Version | Purpose & Implementation Details |
| :--- | :--- | :--- |
| **ReportLab** | `>=4.1.0` | PDF document rendering engine generating formal intelligence dossiers, compliance reports, and keyframe snapshots. |
| **Python-Jose** | `>=3.3.0` | JavaScript Object Signing and Encryption (JOSE) library handling JWT tokens for user authentication. |
| **Passlib (Bcrypt)** | `>=1.7.4` | Cryptographic password hashing and verification. |
| **PyYAML** | `>=6.0.1` | YAML configuration file parser for processing pipelines and model registry parameters. |
| **Pytest & Pytest-Asyncio** | `>=8.1.1` | Automated test suite framework for backend unit and integration testing. |

---

## 5. Technology Stack Mapping Matrix

```text
┌─────────────────────────────┬──────────────────────────────────────────────────────────┐
│ Application Capability      │ Technologies Powering the Feature                        │
├─────────────────────────────┼──────────────────────────────────────────────────────────┤
│ Cyber-Glassmorphic UI       │ React 19, Tailwind CSS 3.4, Framer Motion, Lucide React   │
│ Client-Side Resiliency      │ Axios Interceptors (Dynamic Port Failover 8001 <-> 8000) │
│ Analytics Visualizations    │ Recharts 2.15 (SVG Heatmaps, Bar Charts, Density Curves) │
│ Asynchronous API Gateway    │ FastAPI, Uvicorn ASGI, Pydantic V2                       │
│ Frame Slicing & Sampling    │ OpenCV-Python-Headless (1.0 FPS extraction)              │
│ Scene Boundary Detection    │ PySceneDetect (Adaptive Threshold Detector)              │
│ Audio Dialogue Extraction   │ Faster-Whisper (CTranslate2 Whisper Engine)              │
│ On-Screen Text Recognition  │ EasyOCR (Multilingual Deep Learning OCR)                 │
│ Visual Object Localization  │ PyTorch, Deep Learning Visual Detection Framework        │
│ Dense Vector Encoding       │ Sentence-Transformers (MiniLM / CLIP Embeddings)         │
│ Sub-Second Semantic Search  │ FAISS-CPU Vector Index (L2 / Cosine Similarity)          │
│ Relational Data & Jobs      │ SQLAlchemy 2.0 ORM, aiosqlite, Alembic Migrations        │
│ Automated PDF Dossiers      │ ReportLab 4.1                                            │
└─────────────────────────────┴──────────────────────────────────────────────────────────┘
```
