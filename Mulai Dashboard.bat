@echo off
title Dashboard Hargi HT2
echo =========================================
echo   Memulai Dashboard Hargi HT2 (Dev Mode)
echo =========================================
echo.
cd /d "%~dp0app"

echo Membuka browser secara otomatis...
start /b cmd /c "timeout /t 8 /nobreak >nul && start http://localhost:3200"

echo Menjalankan server Next.js di port 3200...
echo (Tekan Ctrl+C di jendela ini jika ingin mematikan server)
echo.
npm run dev -- --port 3200
