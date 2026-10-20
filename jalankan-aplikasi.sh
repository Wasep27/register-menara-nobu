#!/usr/bin/env bash
# =====================================================================
#          BUKU TAMU DIGITAL - MENARA NOBU (BANK NOBU)
#             Script Peluncur Otomatis Lingkungan Lokal (macOS/Linux)
# =====================================================================

set -e

# Warna output terminal
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=====================================================================${NC}"
echo -e "${GREEN}          BUKU TAMU DIGITAL - MENARA NOBU (BANK NOBU)               ${NC}"
echo -e "${GREEN}               Script Peluncur Otomatis Lingkungan Lokal             ${NC}"
echo -e "${BLUE}=====================================================================${NC}\n"

# 1. Deteksi Package Manager (Bun atau Node.js/npm)
PKG_MGR=""
if command -v bun >/dev/null 2>&1; then
    PKG_MGR="bun"
    echo -e "${GREEN}[OK] Terdeteksi runtime: Bun (Sangat Cepat & Rekomendasi Utama)${NC}"
elif command -v npm >/dev/null 2>&1; then
    PKG_MGR="npm"
    echo -e "${GREEN}[OK] Terdeteksi runtime: Node.js / npm${NC}"
else
    echo -e "${RED}[ERROR] Komputer Anda belum memiliki Bun ataupun Node.js / npm!${NC}\n"
    echo "Silakan unduh dan pasang salah satu dari opsi berikut:"
    echo " 1. Bun (Direkomendasikan, tercepat): curl -fsSL https://bun.sh/install | bash"
    echo " 2. Node.js LTS: https://nodejs.org"
    exit 1
fi

# 2. Periksa file konfigurasi .env
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo -e "${YELLOW}[INFO] File .env belum ditemukan. Menyalin dari template .env.example...${NC}"
        cp .env.example .env
        echo -e "${GREEN}[OK] File .env berhasil dibuat otomatis!${NC}"
    fi
else
    echo -e "${GREEN}[OK] File konfigurasi .env sudah tersedia.${NC}"
fi

# 3. Periksa node_modules
if [ ! -d "node_modules" ]; then
    echo -e "\n${YELLOW}[INFO] Dependensi belum terpasang. Menjalankan proses instalasi...${NC}"
    if [ "$PKG_MGR" = "bun" ]; then
        bun install
    else
        npm install
    fi
    echo -e "${GREEN}[OK] Seluruh dependensi berhasil terpasang!${NC}"
else
    echo -e "${GREEN}[OK] Dependensi node_modules sudah terpasang.${NC}"
fi

# 4. Jalankan dev server
echo -e "\n${BLUE}=====================================================================${NC}"
echo -e "${GREEN} Menjalankan server lokal Menara Nobu di: http://localhost:3000      ${NC}"
echo -e " Untuk menghentikan server, tekan [Ctrl + C]                         "
echo -e "${BLUE}=====================================================================${NC}\n"

# Buka browser secara otomatis di background
(sleep 2 && (command -v xdg-open >/dev/null && xdg-open http://localhost:3000 || command -v open >/dev/null && open http://localhost:3000)) >/dev/null 2>&1 &

if [ "$PKG_MGR" = "bun" ]; then
    bun run dev
else
    npm run dev
fi
