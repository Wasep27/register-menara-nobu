import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { escapeCsvCell } from "./csv-export";
import type { VisitorBadgeData } from "@/lib/badge-utils";
import { encodeCode39, formatBadgeCode, generateQrMatrix } from "@/lib/barcode";
import type { Guest } from "@/lib/supabase";
import { formatWibTime, formatWibWeekdayDate } from "@/lib/date-utils";
import { NOBU_LOGO_BASE64, NOBU_LOGO_ASPECT_RATIO } from "@/assets/logo-base64";

/**
 * Palet warna resmi tema web Menara Nobu untuk dokumen PDF:
 * - primary: Emerald Hijau Nobu (#07936e)
 * - brand: Aksen Aqua/Mint cerah (#10d5a0)
 * - brandSoft: Latar badge mint muda (#e3faf3)
 * - tableAlt: Latar selang-seling baris tabel (#f4fbf8)
 * - foreground: Teks gelap berwibawa (#10241e)
 * - muted: Teks sekunder slate-sage (#4f625c)
 * - border: Garis pembatas elegan (#d6e7e0)
 */
export const NOBU_PDF_THEME = {
  primary: [7, 147, 110] as [number, number, number],
  brand: [16, 213, 160] as [number, number, number],
  brandSoft: [227, 250, 243] as [number, number, number],
  tableAlt: [244, 251, 248] as [number, number, number],
  foreground: [16, 36, 30] as [number, number, number],
  muted: [79, 98, 92] as [number, number, number],
  border: [214, 231, 224] as [number, number, number],
};

export interface ExportDataOptions {
  filename: string;
  title: string;
  subtitle?: string;
  period?: string;
  headers: string[];
  rows: (string | number | boolean | null | undefined)[][];
  sheetName?: string;
  orientation?: "portrait" | "landscape";
  columnWidths?: number[];
}

/**
 * Ekspor data ke file spreadsheet Excel (.xlsx) yang rapih dengan header metadata,
 * lebar kolom otomatis, dan format siap buka di Microsoft Excel / Google Sheets.
 */
export function exportToExcel({
  filename,
  title,
  subtitle,
  period,
  headers,
  rows,
  sheetName = "Data",
  columnWidths,
}: ExportDataOptions): void {
  const exportDate = new Date().toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "full",
    timeStyle: "medium",
  });

  // Susun data tabular beserta metadata kop dokumen
  const aoa: (string | number | boolean)[][] = [
    ["BUKU TAMU DIGITAL — MENARA NOBU"],
    [title.toUpperCase()],
  ];

  if (subtitle) {
    aoa.push([subtitle]);
  }
  if (period) {
    aoa.push([`Periode: ${period}`]);
  }
  aoa.push([`Waktu Unduh: ${exportDate} WIB · Total Data: ${rows.length} Baris`]);
  aoa.push([]); // Baris kosong pemisah
  aoa.push(headers);

  for (const row of rows) {
    aoa.push(
      row.map((cell) => {
        if (cell === null || cell === undefined) return "";
        return cell;
      }),
    );
  }

  const worksheet = XLSX.utils.aoa_to_sheet(aoa);

  // Hitung perkiraan lebar kolom otomatis agar teks tidak terpotong (###) di Excel
  const colWidths = headers.map((header, colIndex) => {
    let maxLen = String(header).length;
    for (const row of rows) {
      const val = row[colIndex];
      if (val !== undefined && val !== null) {
        maxLen = Math.max(maxLen, String(val).length);
      }
    }
    return { wch: Math.min(Math.max(maxLen + 3, 12), 45) };
  });

  worksheet["!cols"] = columnWidths ? columnWidths.map((w) => ({ wch: w })) : colWidths;

  const workbook = XLSX.utils.book_new();
  const safeSheetName = sheetName.replace(/[:\\/?*[\]]/g, "").slice(0, 31) || "Laporan";
  XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName);

  const cleanFilename = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  XLSX.writeFile(workbook, cleanFilename, { compression: true });
}

/**
 * Ekspor data ke dokumen PDF (.pdf) formal berstandar korporat Menara Nobu
 * dengan kop judul, metadata filter, tabel bergaris rapih, dan nomor halaman otomatis.
 */
export function exportToPdf({
  filename,
  title,
  subtitle = "Gedung Perkantoran Menara Nobu · Jakarta",
  period,
  headers,
  rows,
  orientation,
}: ExportDataOptions): void {
  // Pilih orientasi default: landscape jika kolom > 5 agar tidak sempit
  const docOrientation = orientation || (headers.length > 5 ? "landscape" : "portrait");
  const doc = new jsPDF({
    orientation: docOrientation,
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const exportDate = new Date().toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "full",
    timeStyle: "medium",
  });

  // 1. Accent top bar (Emerald & Mint Nobu Theme)
  doc.setFillColor(...NOBU_PDF_THEME.primary);
  doc.rect(0, 0, pageWidth, 5, "F");
  doc.setFillColor(...NOBU_PDF_THEME.brand);
  doc.rect(0, 5, pageWidth, 1.5, "F");

  // 2. Kop Dokumen Resmi dengan Logo Asli Nobu
  const logoW = 36;
  const logoH = logoW / NOBU_LOGO_ASPECT_RATIO;
  doc.addImage(NOBU_LOGO_BASE64, "PNG", 14, 8.5, logoW, logoH);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...NOBU_PDF_THEME.foreground);
  doc.text("MENARA NOBU — BUKU TAMU DIGITAL", 54, 13);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...NOBU_PDF_THEME.muted);
  doc.text(subtitle, 54, 17.5);

  // Badge label resmi di sudut kanan atas
  const tagW = 34;
  doc.setFillColor(...NOBU_PDF_THEME.brandSoft);
  doc.setDrawColor(...NOBU_PDF_THEME.brand);
  doc.setLineWidth(0.3);
  doc.roundedRect(pageWidth - 14 - tagW, 9.5, tagW, 6.5, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...NOBU_PDF_THEME.primary);
  doc.text("DOKUMEN RESMI", pageWidth - 14 - tagW / 2, 13.8, { align: "center" });

  // 3. Garis pembatas kop beraksen tema
  doc.setDrawColor(...NOBU_PDF_THEME.border);
  doc.setLineWidth(0.4);
  doc.line(14, 21.5, pageWidth - 14, 21.5);

  // 4. Judul Laporan & Metadata Card
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  doc.setTextColor(...NOBU_PDF_THEME.primary);
  doc.text(title.toUpperCase(), 14, 28);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...NOBU_PDF_THEME.muted);

  let metaText = `Waktu Cetak: ${exportDate} WIB`;
  if (period) {
    metaText = `Periode: ${period}  |  ${metaText}`;
  }
  metaText += `  |  Total Data: ${rows.length} Catatan`;
  doc.text(metaText, 14, 33);

  // 5. Render Tabel Data dengan jsPDF autoTable bergaris rapi bertema web
  autoTable(doc, {
    startY: 37,
    head: [headers],
    body: rows.map((r) =>
      r.map((c) => (c === null || c === undefined ? "-" : String(c).trim() || "-")),
    ),
    margin: { left: 14, right: 14, bottom: 20 },
    theme: "grid",
    headStyles: {
      fillColor: NOBU_PDF_THEME.primary,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.5,
      halign: "left",
      cellPadding: 2.5,
    },
    bodyStyles: {
      textColor: NOBU_PDF_THEME.foreground,
      fontSize: 8,
      cellPadding: 2.2,
      valign: "middle",
    },
    alternateRowStyles: {
      fillColor: NOBU_PDF_THEME.tableAlt,
    },
    tableLineColor: NOBU_PDF_THEME.border,
    tableLineWidth: 0.2,
    didDrawPage: (data) => {
      // Garis pembatas footer
      doc.setDrawColor(...NOBU_PDF_THEME.border);
      doc.setLineWidth(0.3);
      doc.line(14, pageHeight - 11, pageWidth - 14, pageHeight - 11);

      // Footer Nomor Halaman & Metadata Sistem
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...NOBU_PDF_THEME.muted);

      const footerText = `Dokumen Resmi Menara Nobu · Halaman ${data.pageNumber}`;
      doc.text(footerText, 14, pageHeight - 6);

      const systemTag = "Sistem Manajemen Resepsionis & Pos Keamanan";
      const systemWidth = doc.getTextWidth(systemTag);
      doc.text(systemTag, pageWidth - 14 - systemWidth, pageHeight - 6);
    },
  });

  const cleanFilename = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  doc.save(cleanFilename);
}

/**
 * Ekspor kartu identitas pengunjung (Visitor Badge Pass) berformat PDF resmi
 * dengan slot lanyard, barcode Code 39 beresolusi tinggi, dan QR code ISO.
 */
export interface BadgePdfOptions {
  data: VisitorBadgeData;
  format?: "lanyard" | "compact";
}

export function exportBadgePassPdf({ data, format = "lanyard" }: BadgePdfOptions): void {
  const isLanyard = format === "lanyard";
  // Format standar: Lanyard 95mm x 135mm (pas dimasukkan ke mika holder B3/B4), Compact 60mm x 90mm
  const width = isLanyard ? 95 : 60;
  const height = isLanyard ? 135 : 90;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [width, height],
  });

  const badgeCode = data.badgeNumber || formatBadgeCode(data.id);
  const displayTime =
    data.checkInTime ||
    new Date().toLocaleTimeString("id-ID", {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      minute: "2-digit",
    }) + " WIB";
  const displayDate =
    data.checkInDate ||
    new Date().toLocaleDateString("id-ID", {
      timeZone: "Asia/Jakarta",
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  // Border garis potong (cut guide) beraksen mint halus
  doc.setDrawColor(...NOBU_PDF_THEME.border);
  doc.setLineWidth(0.4);
  doc.roundedRect(2, 2, width - 4, height - 4, 3, 3, "S");

  // Lubang tali lanyard (slot punch indicator) di bagian atas
  if (isLanyard) {
    doc.setDrawColor(...NOBU_PDF_THEME.border);
    doc.setFillColor(...NOBU_PDF_THEME.tableAlt);
    doc.roundedRect(width / 2 - 7, 4, 14, 3, 1.5, 1.5, "FD");
  }

  const startY = isLanyard ? 10 : 4;

  // Header Banner Gedung dengan Logo Asli Nobu & Aksen Kartu
  const bannerH = isLanyard ? 17 : 14;
  doc.setFillColor(...NOBU_PDF_THEME.tableAlt);
  doc.setDrawColor(...NOBU_PDF_THEME.border);
  doc.setLineWidth(0.3);
  doc.roundedRect(4, startY, width - 8, bannerH, 2.5, 2.5, "FD");

  // Tampilkan Logo Resmi Nobu di Header Kartu
  const badgeLogoW = isLanyard ? 36 : 28;
  const badgeLogoH = badgeLogoW / NOBU_LOGO_ASPECT_RATIO;
  doc.addImage(
    NOBU_LOGO_BASE64,
    "PNG",
    width / 2 - badgeLogoW / 2,
    startY + 2.2,
    badgeLogoW,
    badgeLogoH,
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(isLanyard ? 5.5 : 5);
  doc.setTextColor(...NOBU_PDF_THEME.muted);
  doc.text("GEDUNG PERKANTORAN · JAKARTA", width / 2, startY + badgeLogoH + 5.2, {
    align: "center",
  });

  // Visitor Pass Pill Banner (Emerald Green #07936e)
  const pillY = startY + bannerH + 2.5;
  doc.setFillColor(...NOBU_PDF_THEME.primary);
  doc.roundedRect(8, pillY, width - 16, 6.5, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text("VISITOR PASS · KARTU TAMU", width / 2, pillY + 4.5, { align: "center" });

  // Nama Pengunjung (Bold Besar)
  const nameY = pillY + 11.5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...NOBU_PDF_THEME.foreground);
  const nameLines = doc.splitTextToSize(data.name.toUpperCase(), width - 12);
  doc.text(nameLines, width / 2, nameY, { align: "center" });

  // Instansi / Perusahaan (Emerald Accent)
  const instY = nameY + nameLines.length * 4.5 + 1;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...NOBU_PDF_THEME.primary);
  const instLines = doc.splitTextToSize(data.institution || "-", width - 14);
  doc.text(instLines, width / 2, instY, { align: "center" });

  // Detail Box (Waktu, Tanggal, Menemui, Keperluan)
  const boxY = instY + instLines.length * 3.8 + 2;
  const boxHeight = 25;
  doc.setFillColor(...NOBU_PDF_THEME.tableAlt);
  doc.setDrawColor(...NOBU_PDF_THEME.border);
  doc.roundedRect(6, boxY, width - 12, boxHeight, 2, 2, "FD");

  // Row 1: Waktu & Tanggal
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(...NOBU_PDF_THEME.muted);
  doc.text("WAKTU CHECK-IN", 9, boxY + 4.5);
  doc.text("TANGGAL", width / 2 + 2, boxY + 4.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...NOBU_PDF_THEME.foreground);
  doc.text(displayTime, 9, boxY + 8.5);
  doc.text(displayDate, width / 2 + 2, boxY + 8.5);

  // Line separator internal box
  doc.setDrawColor(...NOBU_PDF_THEME.border);
  doc.line(9, boxY + 11.5, width - 9, boxY + 11.5);

  // Row 2: Menemui & Tujuan
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(...NOBU_PDF_THEME.muted);
  doc.text("MENEMUI / TUJUAN", 9, boxY + 15.5);
  doc.text("KEPERLUAN", width / 2 + 2, boxY + 15.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...NOBU_PDF_THEME.foreground);
  const hostText = data.employeeName || "Resepsionis Lobi (Umum)";
  const shortHost = hostText.length > 16 ? `${hostText.slice(0, 15)}…` : hostText;
  doc.text(shortHost, 9, boxY + 20);

  const purposeText = data.purposeName || "Kunjungan";
  const shortPurpose = purposeText.length > 15 ? `${purposeText.slice(0, 14)}…` : purposeText;
  doc.text(shortPurpose, width / 2 + 2, boxY + 20);

  // Bagian Barcode Code 39 & QR Code
  const codeY = boxY + boxHeight + 3;
  const { elements: barcodeElements, totalWidth: barcodeWidth } = encodeCode39(badgeCode, 1, 2.5);
  const qrMatrix = generateQrMatrix(`MENARA-NOBU:${badgeCode}:${data.name}:${data.institution}`);

  // Render QR Code (Kotak-kotak vektor sisi kanan)
  const qrSizeMm = 16;
  const qrX = width - 8 - qrSizeMm;
  const qrCellSize = qrSizeMm / qrMatrix.length;
  doc.setFillColor(...NOBU_PDF_THEME.foreground);
  qrMatrix.forEach((row, r) => {
    row.forEach((val, c) => {
      if (val) {
        doc.rect(qrX + c * qrCellSize, codeY + r * qrCellSize, qrCellSize, qrCellSize, "F");
      }
    });
  });

  // Render Code 39 Barcode (Garis-garis bar vektor sisi kiri)
  const barcodeMaxW = qrX - 12;
  const scale = barcodeMaxW / (barcodeWidth || 1);
  const barH = 10;
  let currX = 8;
  doc.setFillColor(...NOBU_PDF_THEME.foreground);
  barcodeElements.forEach((el) => {
    const barW = el.width * scale;
    if (el.isBar) {
      doc.rect(currX, codeY + 2, barW, barH, "F");
    }
    currX += barW;
  });

  // Teks Kode Badge di bawah barcode
  doc.setFont("courier", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...NOBU_PDF_THEME.primary);
  doc.text(`*${badgeCode}*`, (8 + qrX - 4) / 2, codeY + 15.5, { align: "center" });

  // Security terms footer
  const footerY = height - 9;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  doc.setTextColor(...NOBU_PDF_THEME.muted);
  doc.text(
    "Wajib dikalungkan selama berada di area Menara Nobu · Kembalikan saat check-out",
    width / 2,
    footerY,
    {
      align: "center",
    },
  );
  doc.text("Pos Keamanan & Resepsionis Gedung Ext. 101", width / 2, footerY + 2.8, {
    align: "center",
  });

  doc.save(`pass-tamu-${badgeCode}.pdf`);
}

/**
 * Ekspor Lembar Log Kunjungan Harian Pos Keamanan (Daily Security Visitor Log)
 * Berformat Landscape A4 lengkap dengan kolom paraf satpam & pengesahan tiga pihak.
 */
export interface DailyLogPdfOptions {
  date: string; // YYYY-MM-DD
  rows: Guest[];
  officerName?: string;
  shiftName?: string;
}

export function exportDailyVisitLogPdf({
  date,
  rows,
  shiftName = "Shift 1 & 2 (Operasional Lobi)",
}: DailyLogPdfOptions): void {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const formattedDate = formatWibWeekdayDate(new Date(date)) || date;
  const printTimestamp = new Date().toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "medium",
    timeStyle: "short",
  });

  // Top colored corporate bar (Nobu Emerald & Mint)
  doc.setFillColor(...NOBU_PDF_THEME.primary);
  doc.rect(0, 0, pageWidth, 5, "F");
  doc.setFillColor(...NOBU_PDF_THEME.brand);
  doc.rect(0, 5, pageWidth, 1.5, "F");

  // Kop Lembar Dokumen Resmi dengan Logo Nobu di Sisi Kanan
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...NOBU_PDF_THEME.foreground);
  doc.text("MENARA NOBU — SISTEM MANAJEMEN KEAMANAN & RESEPSIONIS", 14, 13.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...NOBU_PDF_THEME.muted);
  doc.text("Gedung Perkantoran Menara Nobu · Pos Jaga Lobi Utama & Akses Masuk", 14, 18);

  // Logo Resmi Nobu di Sudut Kanan Atas Kop
  const logoW = 38;
  const logoH = logoW / NOBU_LOGO_ASPECT_RATIO;
  doc.addImage(NOBU_LOGO_BASE64, "PNG", pageWidth - 14 - logoW, 8, logoW, logoH);

  // Garis pembatas kop beraksen tema
  doc.setDrawColor(...NOBU_PDF_THEME.border);
  doc.setLineWidth(0.4);
  doc.line(14, 21.5, pageWidth - 14, 21.5);

  // Title Box
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...NOBU_PDF_THEME.primary);
  doc.text("LEMBAR LOG KUNJUNGAN HARIAN (DAILY VISITOR SECURITY LOG)", 14, 27);

  // Stats bar
  const staffVisits = rows.filter((r) => r.employees?.name).length;
  const generalVisits = rows.length - staffVisits;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...NOBU_PDF_THEME.muted);
  const metaLine = `Hari & Tanggal: ${formattedDate}   |   ${shiftName}   |   Total Tamu: ${rows.length} Orang (Bertemu Staf: ${staffVisits}, Umum/Resepsionis: ${generalVisits})   |   Dicetak: ${printTimestamp} WIB`;
  doc.text(metaLine, 14, 31.5);

  // Table Data
  const headers = [
    "No",
    "Jam (WIB)",
    "Kode Pass",
    "Nama Lengkap Tamu",
    "Instansi / Perusahaan",
    "No. Telepon",
    "Keperluan",
    "Menemui / Unit Kerja",
    "Catatan",
    "Paraf Pos",
  ];

  const bodyData = rows.map((r, idx) => [
    idx + 1,
    formatWibTime(r.check_in_time),
    r.badge_code || `VTR-${String(idx + 1).padStart(3, "0")}`,
    r.name,
    r.institution || "-",
    r.phone || "-",
    r.visit_purposes?.name || "-",
    r.employees?.name
      ? `${r.employees.name}${r.employees.department ? ` (${r.employees.department})` : ""}`
      : "Resepsionis Lobi (Umum)",
    r.notes || "-",
    "", // Blank column for physical signature/stamp
  ]);

  autoTable(doc, {
    startY: 35,
    head: [headers],
    body: bodyData,
    margin: { left: 14, right: 14, bottom: 35 },
    theme: "grid",
    headStyles: {
      fillColor: NOBU_PDF_THEME.primary,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      halign: "left",
      cellPadding: 2.2,
    },
    bodyStyles: {
      textColor: NOBU_PDF_THEME.foreground,
      fontSize: 7.5,
      cellPadding: 2,
      valign: "middle",
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 18, halign: "center" },
      2: { cellWidth: 26, font: "courier", fontSize: 7, fontStyle: "bold", textColor: NOBU_PDF_THEME.primary },
      3: { cellWidth: 36, fontStyle: "bold" },
      4: { cellWidth: 35 },
      5: { cellWidth: 24 },
      6: { cellWidth: 26 },
      7: { cellWidth: 35 },
      8: { cellWidth: 32 },
      9: { cellWidth: 24 }, // Paraf column
    },
    alternateRowStyles: {
      fillColor: NOBU_PDF_THEME.tableAlt,
    },
    tableLineColor: NOBU_PDF_THEME.border,
    tableLineWidth: 0.2,
    didDrawPage: (data) => {
      // Garis pembatas footer
      doc.setDrawColor(...NOBU_PDF_THEME.border);
      doc.setLineWidth(0.3);
      doc.line(14, pageHeight - 9, pageWidth - 14, pageHeight - 9);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...NOBU_PDF_THEME.muted);
      doc.text(
        `Dokumen Resmi Keamanan Menara Nobu · Halaman ${data.pageNumber}`,
        14,
        pageHeight - 5,
      );
    },
  });

  // Tanda Tangan Tiga Pihak (Sign-off Section) di bagian bawah
  const docWithAutoTable = doc as jsPDF & { lastAutoTable?: { finalY: number } };
  const lastY = docWithAutoTable.lastAutoTable
    ? docWithAutoTable.lastAutoTable.finalY + 6
    : pageHeight - 30;
  const signY = Math.min(lastY, pageHeight - 28);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...NOBU_PDF_THEME.muted);

  const col1X = 20;
  const col2X = pageWidth / 2 - 25;
  const col3X = pageWidth - 70;

  doc.text("Dibuat Oleh,", col1X, signY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...NOBU_PDF_THEME.foreground);
  doc.text("Resepsionis Lobi", col1X, signY + 3.5);
  doc.setDrawColor(...NOBU_PDF_THEME.primary);
  doc.line(col1X, signY + 16, col1X + 45, signY + 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...NOBU_PDF_THEME.muted);
  doc.text("(Nama & Tanda Tangan)", col1X, signY + 19);

  doc.setFontSize(7.5);
  doc.text("Diperiksa Oleh,", col2X, signY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...NOBU_PDF_THEME.foreground);
  doc.text("Petugas Pos Keamanan", col2X, signY + 3.5);
  doc.setDrawColor(...NOBU_PDF_THEME.primary);
  doc.line(col2X, signY + 16, col2X + 45, signY + 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...NOBU_PDF_THEME.muted);
  doc.text("(Nama & Tanda Tangan)", col2X, signY + 19);

  doc.setFontSize(7.5);
  doc.text("Disetujui Oleh,", col3X, signY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...NOBU_PDF_THEME.foreground);
  doc.text("Komandan Regu / Chief Security", col3X, signY + 3.5);
  doc.setDrawColor(...NOBU_PDF_THEME.primary);
  doc.line(col3X, signY + 16, col3X + 45, signY + 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...NOBU_PDF_THEME.muted);
  doc.text("(Nama, NIK & Cap Stempel)", col3X, signY + 19);

  doc.save(`log-harian-keamanan-${date}.pdf`);
}

/**
 * Re-export escapeCsvCell & exportToCsv untuk kelengkapan dan kompatibilitas modul
 */
export { escapeCsvCell };
export { exportToCsv } from "./csv-export";
