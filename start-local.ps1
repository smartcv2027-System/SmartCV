<#
.SYNOPSIS
    SmartCV One-Click PowerShell Launcher
.DESCRIPTION
    Launches both FastAPI Backend (port 8000) and Next.js Frontend (port 3000)
    and opens the default web browser to the SmartCV application.
#>

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host ""
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "   SmartCV: Explainable AI System for Resume Screening and Job Matching" -ForegroundColor White
Write-Host "   King Khalid University — College of Computer Science" -ForegroundColor Yellow
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check Backend Venv
$BackendPython = Join-Path $ScriptDir "backend\.venv\Scripts\python.exe"
if (-not (Test-Path $BackendPython)) {
    Write-Host "[ERROR] Backend Python virtual environment not found at backend\.venv\" -ForegroundColor Red
    Write-Host "Please set up the virtual environment first." -ForegroundColor Yellow
    exit 1
}

# 2. Check Frontend node_modules
$FrontendModules = Join-Path $ScriptDir "frontend\node_modules"
if (-not (Test-Path $FrontendModules)) {
    Write-Host "[INFO] frontend\node_modules missing. Installing packages..." -ForegroundColor Yellow
    Push-Location (Join-Path $ScriptDir "frontend")
    npm install
    Pop-Location
}

# 3. Launch Backend in new window
Write-Host "[1/3] Launching FastAPI Backend (:8000)..." -ForegroundColor Green
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "cd '$ScriptDir\backend'; .\.venv\Scripts\activate; uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

Start-Sleep -Seconds 3

# 4. Launch Frontend in new window
Write-Host "[2/3] Launching Next.js Frontend (:3000)..." -ForegroundColor Green
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "cd '$ScriptDir\frontend'; npm run dev"

Start-Sleep -Seconds 3

# 5. Open Browser
Write-Host "[3/3] Opening Web Browser..." -ForegroundColor Green
Start-Process "http://localhost:3000"

Write-Host ""
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "  SmartCV is running successfully!" -ForegroundColor White
Write-Host "  - Frontend Portal:  http://localhost:3000" -ForegroundColor Green
Write-Host "  - Swagger API Docs: http://127.0.0.1:8000/docs" -ForegroundColor Green
Write-Host ""
Write-Host "  Demo Personas (Password: password123 / admin123):" -ForegroundColor Yellow
Write-Host "  - Recruiter:  sarah_recruiter" -ForegroundColor White
Write-Host "  - Applicant:  fahad_applicant" -ForegroundColor White
Write-Host "  - Admin:      laila_admin" -ForegroundColor White
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host ""
