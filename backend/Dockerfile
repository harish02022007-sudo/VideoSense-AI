FROM python:3.11-slim

# Prevent writing pyc files and buffer streams
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Memory optimizations for cloud containers (prevent glibc and PyTorch thread memory fragmentation)
ENV MALLOC_ARENA_MAX=2
ENV OMP_NUM_THREADS=1
ENV MKL_NUM_THREADS=1
ENV OPENBLAS_NUM_THREADS=1
ENV TORCH_NUM_THREADS=1
ENV PYTHONMALLOC=malloc
ENV LOW_MEMORY_MODE=true

WORKDIR /app

# Install system dependencies for OpenCV, FFmpeg, Tesseract OCR, and build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
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

# Create required runtime directories
RUN mkdir -p /app/uploads /app/outputs /app/cache /app/storage/embeddings

EXPOSE 8000

# Entry execution command with single-worker and concurrency limit to keep RAM < 512MB
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1 --limit-concurrency 10"]
