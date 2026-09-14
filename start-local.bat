@echo off
title SmartCV Local Launcher
color 0A
cls

echo ==============================================================================
echo    SmartCV: Explainable AI System for Resume Screening and Job Matching
echo    King Khalid University - College of Computer Science
echo ==============================================================================
echo.

:: 1. Verify Virtual Environment
if not exist "backend\.venv\Scripts\python.exe" (
    echo [ERROR] Backend virtual environment not found at backend\.venv\
    echo Please run: cd backend ^&^& python -m venv .venv ^&^& .\.venv\Scripts\pip install -r requirements.txt
    pause
    exit /b 1
)

:: 2. Verify Frontend Dependencies
if not exist "frontend\node_modules" (
    echo [WARNING] frontend\node_modules not found. Running npm install...
    cd frontend && npm install && cd ..
)

echo [1/3] Launching FastAPI Backend on http://127.0.0.1:8000 ...
start "SmartCV Backend (FastAPI :8000)" cmd /k "cd /d %~dp0backend && .\.venv\Scripts\activate && uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

:: Brief wait for backend initial bind
timeout /t 3 /nobreak >nul

echo [2/3] Launching Next.js Frontend on http://localhost:3000 ...
start "SmartCV Frontend (Next.js :3000)" cmd /k "cd /d %~dp0frontend && npm run dev"

:: Brief wait for dev server compile
timeout /t 3 /nobreak >nul

echo [3/3] Opening SmartCV in default browser...
start http://localhost:3000

echo.
echo ==============================================================================
echo   SmartCV is now running!
echo.
echo   - Web Application: http://localhost:3000
echo   - Interactive API: http://127.0.0.1:8000/docs
echo.
echo   Demo Login Personas:
echo   1. Recruiter:  sarah_recruiter  / password123
echo   2. Applicant:  fahad_applicant  / password123
echo   3. Admin:      laila_admin      / admin123
echo ==============================================================================
echo.
echo Press any key in this window to close this launcher (servers will keep running).
pause >nul
