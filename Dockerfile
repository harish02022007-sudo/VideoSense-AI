# ============================================================
# VideoSense AI - Hugging Face Spaces & Cloud Container Image
# ============================================================
FROM python:3.11-slim

# Prevent Python from writing .pyc files and enable unbuffered standard I/O
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    MALLOC_ARENA_MAX=2 \
    PYTHONMALLOC=malloc \
    DEBIAN_FRONTEND=noninteractive \
    PORT=7860 \
    HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

# Install core Linux packages: FFmpeg for video processing, OpenGL/GLib for OpenCV, Tesseract OCR
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    git \
    ffmpeg \
    libgl1 \
    libglib2.0-0 \
    tesseract-ocr \
    tesseract-ocr-eng \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Hugging Face Spaces standard: container runs as non-root user with UID 1000
RUN useradd -m -u 1000 user

WORKDIR /app

# Install CPU PyTorch first (efficient caching layer)
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Copy and install python dependencies
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy backend application, configs, and sample video assets
COPY backend /app
COPY configs /app/configs
COPY Sample_Videos /app/Sample_Videos

# Prepare writable runtime directories with proper user permissions
RUN mkdir -p /app/uploads /app/outputs /app/cache /app/storage/embeddings /app/logs /home/user/.cache && \
    chown -R user:user /app /home/user

# Switch to non-root Hugging Face user
USER user

# Hugging Face Spaces expects traffic on port 7860
EXPOSE 7860

# Launch FastAPI via Uvicorn on 0.0.0.0:7860
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-7860} --workers 1"]

