# ADR-003: Choice of Vector Store (FAISS)

## Status
Approved

## Context
VideoSense AI performs text-to-video search and product discovery using CLIP embeddings (512-dimensional vectors). Since the application is designed to run offline on developer/consumer environments without external cloud services, we need a lightweight, fast, and local vector indexing system.

## Decision
We select **FAISS (Facebook AI Similarity Search)** as the default vector engine, wrapped in a modular interface to allow future adapters (Chroma, Qdrant).

## Alternatives Considered
1. **Pinecone**: Cloud-only; violates privacy/offline-first requirement.
2. **Qdrant / Milvus (as standalone servers)**: Requires spinning up additional Docker containers, which increases resources usage for basic local setups.

## Consequences
- **Zero-Dependency Startup**: FAISS loads as a direct Python C++ binding library without requiring external port bindings.
- **Fast Similarity Math**: Highly optimized L2 and cosine distance searches.
- **Modularity**: The database actions are abstracted behind a `VectorDBInterface`, enabling seamless swaps to Chroma or Qdrant later.
