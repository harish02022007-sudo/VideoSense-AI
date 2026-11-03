FROM python:3.11-slim

# Prevent writing pyc files and buffer streams
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Performance optimizations for cloud containers & Ampere A1 ARM64 (4 OCPU / 24 GB RAM)
ENV MALLOC_ARENA_MAX=2
ENV OMP_NUM_THREADS=4
ENV MKL_NUM_THREADS=4
ENV OPENBLAS_NUM_THREADS=4
ENV TORCH_NUM_THREADS=4
ENV PYTHONMALLOC=malloc
ENV LOW_MEMORY_MODE=false

# Create non-root application user UID 1000 for secure container operation
RUN useradd -m -u 1000 user

WORKDIR /app

# Install system dependencies for OpenCV, FFmpeg, Tesseract OCR, and build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    git \
    libgl1 \
    libglib2.0-0 \
    ffmpeg \
    tesseract-ocr \
    tesseract-ocr-eng \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install python packages
COPY requirements.txt /app/
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir -r requirements.txt

# Copy backend files and configs
COPY . /app/

# Create required runtime directories and set ownership for user 1000
RUN mkdir -p /app/uploads /app/outputs /app/cache /app/storage/embeddings /app/logs /home/user/.cache && \
    chown -R user:user /app /home/user

USER user

EXPOSE 8000

# Entry execution command defaulting to port 8000
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1"]
