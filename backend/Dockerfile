FROM python:3.11-slim

# Prevent writing pyc files and buffer streams
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies for OpenCV, FFmpeg, and build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgl1 \
    libglib2.0-0 \
    ffmpeg \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install python packages
COPY requirements.txt /app/
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copy backend files
COPY . /app/

# Create required runtime directories
RUN mkdir -p /app/uploads /app/outputs /app/cache /app/storage/embeddings

EXPOSE 8000

# Entry execution command with dynamic Render $PORT fallback
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
