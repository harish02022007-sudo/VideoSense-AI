# ADR-002: Choice of Frontend Stack (React + Vite)

## Status
Approved

## Context
The user interface needs to immediately impress the user with vibrant dashboards, real-time visual progress bars, interactive timeline synchronizations (clicking transcripts jumps playback playhead), and an AI chat assistant. We need a framework that compiles quickly and renders fluidly.

## Decision
We select **React.js** scaffolded with **Vite** and styled with **Tailwind CSS**.

## Alternatives Considered
1. **Next.js**: Server-Side Rendering (SSR) is not required since the platform runs locally and offline as an AI analytical desktop hub.
2. **Traditional Webpack/Create React App**: Extremely slow rebuild times during development compared to Vite's native ES module bundling.

## Consequences
- **Instant Hot Reloading (HMR)**: Vite updates modified components in milliseconds.
- **Component-Driven UI**: Highly reusable timeline and chat layout sections.
- **Tailwind Utility Styling**: Fast, clean glassmorphism styling parameters.
