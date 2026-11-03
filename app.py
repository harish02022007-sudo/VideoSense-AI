import sys
import os

# Ensure backend directory is in Python path for all module imports
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(current_dir, "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import uvicorn
import gradio as gr
from app.main import app as fastapi_app

# Create a clean status dashboard for visitors navigating to the Space URL directly
with gr.Blocks(title="VideoSense AI API") as demo:
    gr.Markdown(
        """
        # 🚀 VideoSense AI - High-Performance Backend
        
        Welcome to the **VideoSense AI Multi-Agent Video Analytics Engine**, hosted on **Hugging Face Spaces (16 GB RAM)**.
        
        ---
        
        ### ⚡ System Status
        * **API Gateway:** `Online`
        * **FastAPI Endpoints:** Active at `/api/v1`
        * **Interactive Documentation:** [Explore Swagger UI (/docs)](/docs)
        * **Health Check:** [/api/v1/health/](/api/v1/health/)
        
        ---
        *Connected to your Render Frontend and PostgreSQL database.*
        """
    )

# Mount Gradio onto the existing FastAPI application at `/dashboard`
# This allows all original FastAPI routes (`/api/v1/...`) and `/docs` to remain at the root
app = gr.mount_gradio_app(fastapi_app, demo, path="/dashboard")

if __name__ == "__main__":
    port = int(os.getenv("PORT", 7860))
    print(f"Starting VideoSense AI on port {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port)
