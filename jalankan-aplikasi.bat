@echo off
setlocal enabledelayedexpansion
title Menara Nobu - Buku Tamu Digital (Local Dev)
color 0A

echo =====================================================================
echo          BUKU TAMU DIGITAL - MENARA NOBU (BANK NOBU)
echo               Script Peluncur Otomatis Lingkungan Lokal
echo =====================================================================
echo.

:: 1. Deteksi Package Manager (Bun atau Node.js / npm)
set PKG_MGR=
set RUN_CMD=

where bun >nul 2>nul
if %ERRORLEVEL% equ 0 (
    set PKG_MGR=bun
    set RUN_CMD=bun run dev
    echo [OK] Terdeteksi runtime: Bun (Sangat Cepat ^& Rekomendasi Utama)
    goto :check_env
)

where npm >nul 2>nul
if %ERRORLEVEL% equ 0 (
    set PKG_MGR=npm
    set RUN_CMD=npm run dev
    echo [OK] Terdeteksi runtime: Node.js / npm
    goto :check_env
)

:: Jika tidak ada Bun maupun Node.js
color 0C
echo [ERROR] Komputer Anda belum memiliki Bun ataupun Node.js / npm!
echo.
echo Silakan unduh dan pasang salah satu dari opsi berikut:
echo  1. Bun (Direkomendasikan, tercepat): Buka PowerShell, ketik:
echo     powershell -c "irm bun.sh/install.ps1 | iex"
echo  2. Node.js LTS: Unduh dari https://nodejs.org
echo.
echo Setelah instalasi selesai, buka kembali file .bat ini.
echo.
pause
exit /b 1

:check_env
:: 2. Periksa apakah file konfigurasi .env sudah ada
echo.
if not exist ".env" (
    if exist ".env.example" (
        echo [INFO] File .env belum ditemukan. Menyalin dari template .env.example...
        copy ".env.example" ".env" >nul
        echo [OK] File .env berhasil dibuat otomatis!
    ) else (
        echo [WARNING] File .env dan .env.example tidak ditemukan.
    )
) else (
    echo [OK] File konfigurasi .env sudah tersedia.
)

:: 3. Periksa dependensi node_modules
echo.
if not exist "node_modules\" (
    echo [INFO] Dependensi belum terpasang. Menjalankan proses instalasi...
    echo Mohon tunggu sebentar, ini hanya dilakukan sekali di awal...
    echo.
    if "%PKG_MGR%"=="bun" (
        call bun install
    ) else (
        call npm install
    )
    if %ERRORLEVEL% neq 0 (
        color 0C
        echo.
        echo [ERROR] Gagal memasang dependensi! Pastikan koneksi internet aktif.
        pause
        exit /b 1
    )
    echo [OK] Seluruh dependensi berhasil terpasang!
) else (
    echo [OK] Dependensi node_modules sudah terpasang.
)

:: 4. Jalankan Development Server dan buka browser otomatis
echo.
echo =====================================================================
echo  Menjalankan server lokal Menara Nobu di: http://localhost:3000
echo  Aplikasi otomatis dibuka di browser default Anda...
echo  Untuk menghentikan server, tekan tombol [Ctrl + C] di jendela ini.
echo =====================================================================
echo.

:: Tunggu 3 detik di latar belakang lalu buka browser ke port 3000
start "" cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:3000"

:: Jalankan server dev
if "%PKG_MGR%"=="bun" (
    call bun run dev
) else (
    call npm run dev
)

pause
