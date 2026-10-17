import { encodeCode39, generateQrMatrix } from "@/lib/barcode";
import logoUrl from "@/assets/logo.png";

export interface BadgeDownloadPayload {
  name: string;
  institution: string;
  badgeCode: string;
  checkInTime: string;
  checkInDate: string;
  purposeName?: string | undefined;
  employeeName?: string | undefined;
  format?: "lanyard" | "compact" | undefined;
}

/**
 * Memuat gambar logo ke HTMLImageElement untuk di-render pada canvas.
 */
function loadLogoImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * Menghasilkan file gambar PNG resolusi tinggi (Retina 2x) dari kartu akses / pass tamu Menara Nobu
 * lengkap dengan Logo Bank Nobu resmi, QR code 2D, barcode 1D, dan data kunjungan.
 */
export async function downloadBadgeAsPng(payload: BadgeDownloadPayload): Promise<void> {
  const isLanyard = payload.format === "lanyard";
  const width = isLanyard ? 500 : 660;
  const height = isLanyard ? 780 : 440;

  const canvas = document.createElement("canvas");
  canvas.width = width * 2; // Retina 2x scale untuk ketajaman ultra HD
  canvas.height = height * 2;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context 2d tidak tersedia");

  ctx.scale(2, 2);

  // Load logo gambar asli
  const logoImg = await loadLogoImage(logoUrl);

  // 1. Background Card (Rounded modern corporate card)
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(0, 0, width, height, 20);
  ctx.fill();

  // Outer border dengan aksen halus
  ctx.strokeStyle = "#d6e7e0";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(1, 1, width - 2, height - 2, 20);
  ctx.stroke();

  // 2. Top Header Banner (Gradien Hijau Emerald Khas Nobu)
  const headerHeight = isLanyard ? 120 : 85;
  const grad = ctx.createLinearGradient(0, 0, width, 0);
  grad.addColorStop(0, "#07936E");
  grad.addColorStop(1, "#10D5A0");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(0, 0, width, headerHeight, [20, 20, 0, 0]);
  ctx.fill();

  // Lanyard hole punch indicator (jika format vertikal / lanyard)
  if (isLanyard) {
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.roundRect(width / 2 - 28, 12, 56, 10, 5);
    ctx.fill();
    ctx.strokeStyle = "rgba(0, 0, 0, 0.15)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // 3. Render Logo Nobu & Nama Gedung di Header
  const logoY = isLanyard ? 36 : 22;
  const logoHeight = isLanyard ? 32 : 28;

  if (logoImg) {
    // Rasio lebar logo Nobu
    const logoAspect = logoImg.naturalWidth / (logoImg.naturalHeight || 1);
    const logoWidth = logoHeight * logoAspect;
    const totalBrandWidth = logoWidth + 14 + 130; // logo + gap + text
    const startX = (width - totalBrandWidth) / 2;

    // Draw white background pill for pristine logo presentation
    ctx.fillStyle = "rgba(255, 255, 255, 0.96)";
    ctx.beginPath();
    ctx.roundRect(startX - 10, logoY - 4, logoWidth + 20, logoHeight + 8, 8);
    ctx.fill();

    // Gambar logo asli Nobu
    ctx.drawImage(logoImg, startX, logoY, logoWidth, logoHeight);

    // Teks Nama Gedung
    ctx.textAlign = "left";
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 20px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText("MENARA NOBU", startX + logoWidth + 14, logoY + logoHeight - 6);
  } else {
    // Fallback jika logo gagal dimuat
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 22px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText("MENARA NOBU", width / 2, logoY + 22);
  }

  // Subtitle Header
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
  ctx.font = "bold 11px sans-serif";
  ctx.letterSpacing = "2px";
  ctx.fillText("KARTU AKSES PENGUNJUNG · VISITOR PASS", width / 2, isLanyard ? 98 : 68);
  ctx.letterSpacing = "0px";

  // -------------------------------------------------------------
  // FORMAT A: LANYARD (VERTIKAL - 500 x 780)
  // -------------------------------------------------------------
  if (isLanyard) {
    // Status Badge Aktif Hari Ini & Waktu Check-In
    const statusY = 138;
    ctx.fillStyle = "#e3faf3";
    ctx.beginPath();
    ctx.roundRect(30, statusY, width - 60, 32, 10);
    ctx.fill();
    ctx.strokeStyle = "#c3d9d0";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = "#07936E";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`✓ CHECK-IN: ${payload.checkInTime} WIB`, 44, statusY + 21);

    ctx.textAlign = "right";
    ctx.fillText(`TANGGAL: ${payload.checkInDate}`, width - 44, statusY + 21);

    // Nama Tamu & Instansi
    const guestY = 215;
    ctx.textAlign = "center";
    ctx.fillStyle = "#708780";
    ctx.font = "bold 11px sans-serif";
    ctx.letterSpacing = "1.5px";
    ctx.fillText("NAMA PENGUNJUNG", width / 2, guestY);
    ctx.letterSpacing = "0px";

    ctx.fillStyle = "#10241E";
    ctx.font = "bold 24px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText(payload.name, width / 2, guestY + 30);

    ctx.fillStyle = "#07936E";
    ctx.font = "bold 15px sans-serif";
    ctx.fillText(payload.institution, width / 2, guestY + 54);

    // Box Rincian Keperluan & Staf yang Dituju
    const infoY = 295;
    ctx.fillStyle = "#f4fbf8";
    ctx.beginPath();
    ctx.roundRect(30, infoY, width - 60, 80, 12);
    ctx.fill();
    ctx.strokeStyle = "#d6e7e0";
    ctx.stroke();

    ctx.textAlign = "left";
    ctx.fillStyle = "#708780";
    ctx.font = "11px sans-serif";
    ctx.fillText("KEPERLUAN KUNJUNGAN", 48, infoY + 26);
    ctx.fillText("STAF YANG DITUJU", width / 2 + 10, infoY + 26);

    ctx.fillStyle = "#10241E";
    ctx.font = "bold 13px sans-serif";
    ctx.fillText(payload.purposeName || "Kunjungan Resmi", 48, infoY + 48);
    ctx.fillStyle = "#07936E";
    ctx.fillText(payload.employeeName || "Resepsionis Lobi", width / 2 + 10, infoY + 48);

    // BOX GANDA PEMINDAI: Barcode 1D + QR Code 2D
    const scanBoxY = 395;
    const scanBoxH = 220;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.roundRect(30, scanBoxY, width - 60, scanBoxH, 14);
    ctx.fill();
    ctx.strokeStyle = "#c3d9d0";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 1. Gambar QR Code 2D (Sisi Kanan)
    const qrMatrix = generateQrMatrix(
      `MENARA-NOBU:${payload.badgeCode}:${payload.name}:${payload.institution}`,
    );
    const qrSize = 135;
    const qrX = width - 30 - 20 - qrSize;
    const qrY = scanBoxY + 25;
    const moduleSize = qrSize / qrMatrix.length;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(qrX - 6, qrY - 6, qrSize + 12, qrSize + 12);

    ctx.fillStyle = "#10241E";
    for (let r = 0; r < qrMatrix.length; r++) {
      for (let c = 0; c < qrMatrix[r]!.length; c++) {
        if (qrMatrix[r]![c]) {
          ctx.fillRect(qrX + c * moduleSize, qrY + r * moduleSize, moduleSize, moduleSize);
        }
      }
    }

    ctx.textAlign = "center";
    ctx.fillStyle = "#708780";
    ctx.font = "bold 9px sans-serif";
    ctx.fillText("SCAN VERIFIKASI", qrX + qrSize / 2, qrY + qrSize + 18);

    // 2. Gambar Barcode 1D (Sisi Kiri)
    const { elements: barcodeElements, totalWidth: barcodeWidth } = encodeCode39(
      payload.badgeCode,
      2,
      5,
    );
    const barcodeBoxW = width - 60 - qrSize - 60;
    const barcodeStartX = 50;
    const barcodeStartY = scanBoxY + 45;
    const barcodeH = 50;
    const scaleX = barcodeBoxW / barcodeWidth;

    let currX = barcodeStartX;
    ctx.fillStyle = "#10241E";
    for (const el of barcodeElements) {
      const elWidth = el.width * scaleX;
      if (el.isBar) {
        ctx.fillRect(currX, barcodeStartY, elWidth, barcodeH);
      }
      currX += elWidth;
    }

    ctx.textAlign = "center";
    ctx.font = "bold 13px monospace";
    ctx.fillStyle = "#10241E";
    ctx.fillText(
      `*${payload.badgeCode}*`,
      barcodeStartX + barcodeBoxW / 2,
      barcodeStartY + barcodeH + 22,
    );

    ctx.fillStyle = "#07936E";
    ctx.font = "bold 10px sans-serif";
    ctx.fillText(
      "VALID UNTUK AKSES RESMI",
      barcodeStartX + barcodeBoxW / 2,
      barcodeStartY + barcodeH + 40,
    );

    // Divider pemisah Barcode & QR Code
    ctx.strokeStyle = "#eaf3ef";
    ctx.beginPath();
    ctx.moveTo(qrX - 16, scanBoxY + 15);
    ctx.lineTo(qrX - 16, scanBoxY + scanBoxH - 15);
    ctx.stroke();

    // Footer & Keamanan Gedung
    const footerY = 645;
    ctx.strokeStyle = "#eaf3ef";
    ctx.beginPath();
    ctx.moveTo(30, footerY);
    ctx.lineTo(width - 30, footerY);
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.fillStyle = "#10241E";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText(
      "Wajib dikalungkan / disematkan selama berada di Menara Nobu",
      width / 2,
      footerY + 24,
    );

    ctx.fillStyle = "#708780";
    ctx.font = "10px sans-serif";
    ctx.fillText(
      "Kembalikan visitor pass ke resepsionis lobi saat check-out · Keamanan: Ext. 101",
      width / 2,
      footerY + 42,
    );
    ctx.fillText(
      "© 2026 Menara Nobu · Sistem Buku Tamu & Registrasi Digital",
      width / 2,
      footerY + 58,
    );
  }

  // -------------------------------------------------------------
  // FORMAT B: COMPACT (HORIZONTAL / STIKER - 660 x 440)
  // -------------------------------------------------------------
  else {
    // Sisi Kiri: Informasi Tamu & Barcode
    const leftW = 380;

    // Status Pill
    ctx.fillStyle = "#e3faf3";
    ctx.beginPath();
    ctx.roundRect(25, 100, leftW - 20, 26, 8);
    ctx.fill();

    ctx.fillStyle = "#07936E";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`✓ AKTIF · ${payload.checkInDate} · ${payload.checkInTime} WIB`, 36, 117);

    // Nama Tamu & Instansi
    ctx.fillStyle = "#10241E";
    ctx.font = "bold 22px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText(payload.name, 25, 155);

    ctx.fillStyle = "#07936E";
    ctx.font = "bold 14px sans-serif";
    ctx.fillText(payload.institution, 25, 178);

    // Keperluan & Staf
    ctx.fillStyle = "#f4fbf8";
    ctx.beginPath();
    ctx.roundRect(25, 195, leftW - 20, 55, 10);
    ctx.fill();
    ctx.strokeStyle = "#d6e7e0";
    ctx.stroke();

    ctx.fillStyle = "#708780";
    ctx.font = "10px sans-serif";
    ctx.fillText("Keperluan:", 35, 215);
    ctx.fillText("Bertemu:", 190, 215);

    ctx.fillStyle = "#10241E";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText(payload.purposeName || "Kunjungan Resmi", 35, 235);
    ctx.fillStyle = "#07936E";
    ctx.fillText(payload.employeeName || "Resepsionis Lobi", 190, 235);

    // Barcode 1D di sisi kiri bawah
    const { elements: barcodeElements, totalWidth: barcodeWidth } = encodeCode39(
      payload.badgeCode,
      2,
      4,
    );
    const barcodeBoxW = leftW - 20;
    const barcodeStartX = 25;
    const barcodeStartY = 265;
    const barcodeH = 40;
    const scaleX = barcodeBoxW / barcodeWidth;

    let currX = barcodeStartX;
    ctx.fillStyle = "#10241E";
    for (const el of barcodeElements) {
      const elWidth = el.width * scaleX;
      if (el.isBar) {
        ctx.fillRect(currX, barcodeStartY, elWidth, barcodeH);
      }
      currX += elWidth;
    }

    ctx.textAlign = "center";
    ctx.font = "bold 12px monospace";
    ctx.fillStyle = "#10241E";
    ctx.fillText(
      `*${payload.badgeCode}*`,
      barcodeStartX + barcodeBoxW / 2,
      barcodeStartY + barcodeH + 18,
    );

    // Sisi Kanan: Large 2D QR Code Matrix
    const rightBoxX = leftW + 20;
    const rightBoxW = width - rightBoxX - 25;
    const rightBoxY = 100;
    const rightBoxH = 250;

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.roundRect(rightBoxX, rightBoxY, rightBoxW, rightBoxH, 14);
    ctx.fill();
    ctx.strokeStyle = "#c3d9d0";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const qrMatrix = generateQrMatrix(
      `MENARA-NOBU:${payload.badgeCode}:${payload.name}:${payload.institution}`,
    );
    const qrSize = 160;
    const qrX = rightBoxX + (rightBoxW - qrSize) / 2;
    const qrY = rightBoxY + 25;
    const moduleSize = qrSize / qrMatrix.length;

    ctx.fillStyle = "#10241E";
    for (let r = 0; r < qrMatrix.length; r++) {
      for (let c = 0; c < qrMatrix[r]!.length; c++) {
        if (qrMatrix[r]![c]) {
          ctx.fillRect(qrX + c * moduleSize, qrY + r * moduleSize, moduleSize, moduleSize);
        }
      }
    }

    ctx.textAlign = "center";
    ctx.fillStyle = "#07936E";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText("SCAN VERIFIKASI RESMI", rightBoxX + rightBoxW / 2, qrY + qrSize + 22);

    ctx.fillStyle = "#708780";
    ctx.font = "9px sans-serif";
    ctx.fillText("Valid Hari Ini di Menara Nobu", rightBoxX + rightBoxW / 2, qrY + qrSize + 36);

    // Footer Horizontal
    const footerY = 370;
    ctx.strokeStyle = "#eaf3ef";
    ctx.beginPath();
    ctx.moveTo(25, footerY);
    ctx.lineTo(width - 25, footerY);
    ctx.stroke();

    ctx.textAlign = "left";
    ctx.fillStyle = "#708780";
    ctx.font = "10px sans-serif";
    ctx.fillText(
      "Tunjukkan kartu ini kepada petugas resepsionis / gate turnstile saat masuk dan keluar.",
      25,
      footerY + 22,
    );

    ctx.textAlign = "right";
    ctx.fillText("Keamanan Lobi: Ext. 101 · Gedung Menara Nobu", width - 25, footerY + 22);
  }

  // Trigger Unduh Gambar PNG
  const pngUrl = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  const cleanName = payload.name.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
  a.download = `kartu-kunjungan-nobu-${cleanName}-${payload.badgeCode}.png`;
  a.href = pngUrl;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
