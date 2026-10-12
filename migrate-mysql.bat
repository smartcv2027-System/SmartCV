@echo off
title SmartCV - MySQL Migration (XAMPP)
color 0b

echo ==============================================================================
echo   SmartCV: Migrate and Seed Database to MySQL (XAMPP Server)
echo   King Khalid University - College of Computer Science
echo ==============================================================================
echo.
echo Make sure MySQL is running in your XAMPP Control Panel.
echo.

cd /d "%~dp0backend"
if exist ".venv\Scripts\python.exe" (
    ".venv\Scripts\python.exe" migrate_to_mysql.py
) else (
    python migrate_to_mysql.py
)

echo.
echo ==============================================================================
echo Migration script finished.
echo Press any key to exit...
pause >nul
