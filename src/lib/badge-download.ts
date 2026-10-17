import { encodeCode39 } from "@/lib/barcode";

export interface BadgeDownloadPayload {
  name: string;
  institution: string;
  badgeCode: string;
  checkInTime: string;
  checkInDate: string;
  purposeName?: string;
  employeeName?: string;
  format?: "lanyard" | "compact";
}

/**
 * Menghasilkan file gambar PNG resolusi tinggi (Retina 2x) dari kartu akses / barcode tamu
 * langsung di browser tanpa dependensi eksternal, siap disimpan di ponsel atau dicetak.
 */
export async function downloadBadgeAsPng(payload: BadgeDownloadPayload): Promise<void> {
  const isLanyard = payload.format === "lanyard";
  const width = isLanyard ? 480 : 640;
  const height = isLanyard ? 760 : 420;

  const canvas = document.createElement("canvas");
  canvas.width = width * 2; // Retina 2x scale
  canvas.height = height * 2;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context 2d tidak tersedia");

  ctx.scale(2, 2);

  // 1. Background Card
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  // Border kartu
  ctx.strokeStyle = "#d6e7e0";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, width - 2, height - 2);

  // 2. Top Header Bar (Emerald Brand Gradient)
  const grad = ctx.createLinearGradient(0, 0, width, 0);
  grad.addColorStop(0, "#07936E");
  grad.addColorStop(1, "#10D5A0");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, isLanyard ? 110 : 80);

  // Lanyard hole punch indicator (jika format vertikal)
  if (isLanyard) {
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(width / 2, 20, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#d6e7e0";
    ctx.stroke();
  }

  // Header Title
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.font = "bold 20px sans-serif";
  ctx.fillText("MENARA NOBU", width / 2, isLanyard ? 58 : 38);

  ctx.font = "bold 11px sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
  ctx.fillText("VISITOR PASS · BUKU TAMU DIGITAL", width / 2, isLanyard ? 80 : 58);

  // 3. Status Tag / Waktu Check-In
  ctx.fillStyle = "#e3faf3";
  ctx.beginPath();
  const badgeY = isLanyard ? 130 : 100;
  ctx.roundRect(width / 2 - 120, badgeY, 240, 26, 13);
  ctx.fill();

  ctx.fillStyle = "#07936E";
  ctx.font = "bold 11px sans-serif";
  ctx.fillText(
    `✓ CHECK-IN: ${payload.checkInDate} · ${payload.checkInTime} WIB`,
    width / 2,
    badgeY + 17,
  );

  // 4. Nama Pengunjung & Instansi
  const nameY = isLanyard ? 200 : 155;
  ctx.fillStyle = "#10241E";
  ctx.font = "bold 24px sans-serif";
  ctx.fillText(payload.name, width / 2, nameY);

  ctx.fillStyle = "#4F625C";
  ctx.font = "600 15px sans-serif";
  ctx.fillText(payload.institution, width / 2, nameY + 28);

  // 5. Informasi Divisi & Staf Dituju
  if (isLanyard) {
    const infoBoxY = 270;
    ctx.fillStyle = "#f4fbf8";
    ctx.beginPath();
    ctx.roundRect(30, infoBoxY, width - 60, 95, 12);
    ctx.fill();
    ctx.strokeStyle = "#eaf3ef";
    ctx.stroke();

    ctx.textAlign = "left";
    ctx.font = "11px sans-serif";
    ctx.fillStyle = "#708780";
    ctx.fillText("TUJUAN KUNJUNGAN", 48, infoBoxY + 28);
    ctx.fillText("BERTEMU DENGAN", 48, infoBoxY + 68);

    ctx.font = "bold 13px sans-serif";
    ctx.fillStyle = "#10241E";
    ctx.fillText(payload.purposeName || "Kunjungan Resmi", 48, infoBoxY + 45);
    ctx.fillStyle = "#07936E";
    ctx.fillText(payload.employeeName || "Resepsionis / Lobi", 48, infoBoxY + 85);
  }

  // 6. Draw Barcode (Code 39)
  const { elements: barcodeElements, totalWidth: barcodeWidth } = encodeCode39(
    payload.badgeCode,
    2,
    5,
  );
  const barcodeStartY = isLanyard ? 405 : 225;
  const barcodeH = isLanyard ? 55 : 45;
  const scaleX = (width - 80) / barcodeWidth;
  let currX = 40;

  for (const el of barcodeElements) {
    const elWidth = el.width * scaleX;
    if (el.isBar) {
      ctx.fillStyle = "#10241E";
      ctx.fillRect(currX, barcodeStartY, elWidth, barcodeH);
    }
    currX += elWidth;
  }

  // Barcode Human-Readable Digits
  ctx.textAlign = "center";
  ctx.fillStyle = "#10241E";
  ctx.font = "bold 13px monospace";
  ctx.fillText(`*${payload.badgeCode}*`, width / 2, barcodeStartY + barcodeH + 20);

  // 7. Security Rules Footer
  const footerY = isLanyard ? 530 : 330;
  ctx.strokeStyle = "#eaf3ef";
  ctx.beginPath();
  ctx.moveTo(30, footerY);
  ctx.lineTo(width - 30, footerY);
  ctx.stroke();

  ctx.fillStyle = "#708780";
  ctx.font = "10px sans-serif";
  ctx.fillText(
    "Wajib dikalungkan / disematkan selama berada di area Menara Nobu",
    width / 2,
    footerY + 22,
  );
  ctx.fillText(
    "Kembalikan visitor pass ke resepsionis lobi saat check-out",
    width / 2,
    footerY + 38,
  );

  // Trigger Download
  const pngUrl = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  const cleanName = payload.name.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
  a.download = `badge-tamu-nobu-${cleanName}.png`;
  a.href = pngUrl;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
