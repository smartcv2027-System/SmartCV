#!/bin/sh
set -e

echo "=== Starting SmartCV Backend Service ==="
echo "Python Version: $(python --version)"
echo "Target Port: ${PORT:-7860}"

# Ensure upload directory exists
mkdir -p uploads

# Check if database auto-seed is required
if [ "$SEED_ON_STARTUP" = "true" ]; then
    echo "Initializing and seeding database with KKU benchmark corpus..."
    python -m app.seed || echo "Seed completed or skipped."
else
    echo "Starting server with existing database. Set SEED_ON_STARTUP=true to force-reseed."
fi

echo "Launching FastAPI server on 0.0.0.0:${PORT:-7860}..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-7860}" --workers "${WORKERS:-1}"
