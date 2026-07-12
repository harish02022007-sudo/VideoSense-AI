# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] - 2026-07-11

### Added
- **Project Structure**: Created core multi-agent folders, configuration profiles, docker setups, and testing frameworks.
- **Backend Core Scaffolding**: 
  - Dynamic YAML settings loader for profiles (`development`, `testing`, `production`, `demo`).
  - Context-aware structured JSON/Text logger with trace `correlation_id` integration.
  - SQLAlchemy SQLite/PostgreSQL SessionLocal manager.
  - Versioned routing API prefix (`/api/v1`).
  - System diagnostics `/health` endpoint and `/videos/upload` upload placeholder routers.
- **Frontend Dashboard Shell**:
  - React.js scaffolding using Vite.
  - Tailwind CSS v3 styling config (custom color variables, animation behaviors, glows).
  - Floating radial background glows component.
  - Header Navbar tracking server status latency dynamically.
  - Sidebar navigation menu list.
  - Ingestion console upload layout tracking pipeline stages progress.
  - Interactive timeline player matching playback locations to transcript cues, objects, and OCR lists.
- **Architecture Documentation**: Added five Architecture Decision Records (ADRs) explaining FastAPI, React + Vite, FAISS, Agentic AI, and Event Bus choices.
- **DevOps Integrations**: Configured GitHub Actions workflows (`backend-ci`, `frontend-ci`, `docker`, `release`) and multi-stage Dockerfiles.
