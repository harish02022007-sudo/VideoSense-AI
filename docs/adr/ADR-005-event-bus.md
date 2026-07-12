# ADR-005: Choice of Internal Event Bus

## Status
Approved

## Context
Running several heavy AI agents (YOLO, OCR, Whisper, CLIP) in sequence blocks web threads. We need an asynchronous dispatch system that broadcasts progress updates and triggers downstream tasks (like embedding frames once they are extracted) without tightly coupling the caller and the receiver.

## Decision
We implement an **Internal Event Bus** running asynchronously within the FastAPI process space.

## Alternatives Considered
1. **Direct RPC Calls**: Requires the `VideoProcessingAgent` to directly import and trigger the `VisionAgent`, which violates Clean Architecture design.
2. **Celery with Redis**: Extremely robust, but introduces external infrastructure dependencies (Redis daemon), complicating local student/developer setups.

## Consequences
- **Decoupled Messaging**: Agents publish events (e.g., `FRAME_EXTRACTED`) and subscribe to target triggers asynchronously.
- **Progress Tracking**: WebSockets subscribe to events to stream real-time percentage indicators to the frontend.
- **Easy Upgrades**: Celery or RabbitMQ can easily replace the in-memory Event Bus later by just swapping the implementation class.
