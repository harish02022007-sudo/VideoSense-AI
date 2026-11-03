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

# Create non-root user UID 1000 for Hugging Face Spaces & security
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

EXPOSE 7860 8000

# Entry execution command defaulting to 7860 (Hugging Face Spaces) with fallback to PORT env var
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-7860} --workers 1"]
