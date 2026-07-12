# ADR-001: Choice of Backend Web Framework (FastAPI)

## Status
Approved

## Context
VideoSense AI requires an asynchronous, high-performance API server to coordinate file uploads, stream progress ticks via WebSockets, and run CPU/GPU-intensive AI models (YOLO, Whisper, CLIP, LLM). The framework must integrate cleanly with Python-based ML libraries and support robust request validation.

## Decision
We choose **FastAPI** as the core backend web framework.

## Alternatives Considered
1. **Django**: Too heavy; standard synchronous request-response architecture creates overhead for real-time WebSocket progress updates.
2. **Flask**: Minimalist, but lacks native async request handling and typed Pydantic parameter casting out of the box, requiring many third-party plugins.

## Consequences
- **Asynchronous Execution**: Native async support allows non-blocking file streaming and reactive progress logs broadcasts.
- **Auto API Documentation**: Auto-generates OpenAPI (`/docs` swagger) definitions.
- **Pydantic Validation**: Strong compile-time type validation for settings and REST schemas.
