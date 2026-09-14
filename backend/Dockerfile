# ==============================================================================
# SmartCV Backend Dockerfile (Python 3.11 + FastAPI + Sentence-BERT)
# King Khalid University — College of Computer Science
# Compatible with Hugging Face Spaces, Render, and Local Docker
# ==============================================================================

FROM python:3.11-slim AS base

# System environment variables (defaults to 7860 for Hugging Face Spaces)
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=7860 \
    UPLOAD_DIR=/app/uploads

# Install system dependencies & healthcheck tool
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    curl \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies (Using CPU-optimized PyTorch wheel for speed and lean memory)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch --extra-index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r requirements.txt

# Pre-cache NLTK tokenizers and Sentence-BERT model weights into Docker layer
# This guarantees 100% offline-ready container startup without HuggingFace runtime delays
RUN python -c "import nltk; nltk.download('punkt', quiet=True); nltk.download('punkt_tab', quiet=True); nltk.download('stopwords', quiet=True)" && \
    python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')"

# Copy application source code
COPY . .

# Ensure upload directory exists and has full permissions for non-root users (UID 1000 on HF Spaces)
RUN mkdir -p /app/uploads && \
    chmod -R 777 /app/uploads && \
    chmod +x /app/entrypoint.sh

# Expose API ports (7860 for Hugging Face Spaces, 8000 for local/Render)
EXPOSE 7860 8000

# Container healthcheck
HEALTHCHECK --interval=20s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:${PORT:-7860}/health || exit 1

# Launch via entrypoint
ENTRYPOINT ["/app/entrypoint.sh"]
