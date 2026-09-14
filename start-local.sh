#!/usr/bin/env bash
# ==============================================================================
# SmartCV: Explainable AI System for Resume Screening and Job Matching
# King Khalid University — College of Computer Science
# Local Startup Script (Git Bash / Linux / macOS)
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=============================================================================="
echo "   SmartCV: Explainable AI System for Resume Screening and Job Matching"
echo "   King Khalid University — College of Computer Science"
echo "=============================================================================="
echo ""

# 1. Verify Virtual Environment
if [ -f "backend/.venv/Scripts/python.exe" ]; then
    PYTHON_EXE="backend/.venv/Scripts/python.exe"
elif [ -f "backend/.venv/bin/python" ]; then
    PYTHON_EXE="backend/.venv/bin/python"
else
    echo "[ERROR] Backend virtual environment not found in backend/.venv/"
    echo "Please set up the virtual environment first:"
    echo "  cd backend && python -m venv .venv && pip install -r requirements.txt"
    exit 1
fi

# 2. Check Frontend node_modules
if [ ! -d "frontend/node_modules" ]; then
    echo "[INFO] frontend/node_modules missing. Installing npm packages..."
    (cd frontend && npm install)
fi

echo "[1/3] Starting FastAPI Backend on http://127.0.0.1:8000 ..."
(cd backend && "$PYTHON_EXE" -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload) &
BACKEND_PID=$!

sleep 3

echo "[2/3] Starting Next.js Frontend on http://localhost:3000 ..."
(cd frontend && npm run dev) &
FRONTEND_PID=$!

sleep 3

echo "[3/3] Opening browser at http://localhost:3000 ..."
if command -v start >/dev/null 2>&1; then
    start http://localhost:3000 || true
elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open http://localhost:3000 || true
elif command -v open >/dev/null 2>&1; then
    open http://localhost:3000 || true
fi

echo ""
echo "=============================================================================="
echo "   SmartCV is running!"
echo "   - Web Portal:   http://localhost:3000"
echo "   - API Docs:     http://127.0.0.1:8000/docs"
echo ""
echo "   Demo Personas (password123 / admin123):"
echo "   - Recruiter:  sarah_recruiter"
echo "   - Applicant:  fahad_applicant"
echo "   - Admin:      laila_admin"
echo "=============================================================================="
echo "Press Ctrl+C to stop all servers."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM EXIT
wait
