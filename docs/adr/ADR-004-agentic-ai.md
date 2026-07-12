# ADR-004: Choice of Multi-Agent AI Architecture

## Status
Approved

## Context
Instead of a simple linear pipeline (which is brittle, hard to extend, and couples distinct deep learning libraries tightly), we require a structure where visual processing, transcript search, reasoning, and product catalogs can be swapped, scaled, or debugged in isolation.

## Decision
We adapt an **Agentic AI architecture** coordinated by a `PlannerAgent`.

## Alternatives Considered
1. **Monolithic Sequential Pipeline**: Hard to manage failures (e.g. if Whisper fails, the whole pipeline breaks). It also makes it difficult to implement multi-step chat logic like: *"Find where the user picked up a bag, then check what was written on the counter nearby."*

## Consequences
- **Decoupled Responsibilities**: Vision, Speech, OCR, and Reasoning exist as independent service agents.
- **Planner Orchestration**: The `PlannerAgent` splits incoming tasks, requests data from specific agents, and passes context variables to the `ReasoningAgent`.
- **Fault Isolation**: If one model agent fails, the planner can handle degraded operation gracefully (e.g., answering questions using only OCR and transcripts if visual frames are missing).
