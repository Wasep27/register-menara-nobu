import ExcelJS from "exceljs";
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

/**
 * Palet warna tema Menara Nobu untuk Excel (format ARGB hex):
 */
export const NOBU_XLSX_THEME = {
  primary: "FF07936E", // Emerald Green Utama
  primaryDark: "FF056B4E", // Deep Emerald untuk Header
  brand: "FF10D5A0", // Mint Aqua Aksen
  brandSoft: "FFE3FAF3", // Latar Soft Mint untuk Kartu KPI & Header Info
  tableAlt: "FFF4FBF8", // Selang-seling baris data (Zebra striping)
  foreground: "FF10241E", // Teks gelap charcoal
  muted: "FF4F625C", // Teks sekunder abu-abu kehijauan
  border: "FFD6E7E0", // Garis pembatas tabel rapih
  borderDark: "FF07936E", // Garis pembatas aksen emerald
  white: "FFFFFFFF",
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
  includeInsights?: boolean;
}

/**
 * Helper untuk men-trigger unduhan file blob di peramban secara aman.
 */
function triggerFileDownload(blob: Blob, filename: string): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => {
    try {
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  }, 2000);
}

/**
 * Membuat visualisasi indikator progress bar / in-cell chart (Unicode Bar Chart)
 * yang dapat tampil konsisten di semua aplikasi spreadsheet (Microsoft Excel, LibreOffice, Google Sheets).
 */
export function generateVisualBar(percentage: number, length: number = 10): string {
  const clamped = Math.max(0, Math.min(100, Math.round(percentage)));
  const filled = Math.round((clamped / 100) * length);
  const empty = Math.max(0, length - filled);
  return `${"█".repeat(filled)}${"░".repeat(empty)} ${clamped}%`;
}

/**
 * Ekspor data ke file spreadsheet Excel (.xlsx) profesional berstandar korporat terbaik:
 * 1. Sheet "Ringkasan & Insight":
 *    - Logo Asli Nobu tertanam langsung di header workbook
 *    - Kartu ringkasan KPI (Total Tamu, Lembaga Unik, Bertemu Staf, Tamu Lobi/Umum)
 *    - Tabel Distribusi Tujuan / Kategori Kunjungan lengkap dengan In-Cell Bar Chart
 *    - Analisis Jam Kunjungan Puncak (Peak Hours Insight) & Tingkat Kepadatan
 *    - Top Penerima Tamu / Staf yang paling sering dikunjungi
 *    - Panduan rekomendasi operasional keamanan & fasilitas
 * 2. Sheet "Data Detail":
 *    - Tabel bergaris border penuh (top, bottom, left, right) berdesain Emerald Nobu
 *    - Header sel dengan warna tema hijau emerald (#07936E) & teks putih tebal
 *    - Baris selang-seling (zebra striping #F4FBF8) agar mudah dibaca
 *    - AutoFilter terpasang otomatis untuk memudahkan sorting & filtering
 *    - Freeze Panes aktif sehingga header kolom tetap terlihat saat discroll
 *    - Lebar kolom dinamis terhitung otomatis dengan margin aman
 */
export async function exportToExcel({
  filename,
  title,
  subtitle = "Gedung Perkantoran Menara Nobu · Pos Keamanan & Resepsionis",
  period,
  headers,
  rows,
  sheetName = "Data Kunjungan",
  columnWidths,
  includeInsights = true,
}: ExportDataOptions): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Menara Nobu — Sistem Buku Tamu Digital";
  workbook.lastModifiedBy = "Admin Keamanan & Resepsionis Menara Nobu";
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.title = title;
  workbook.subject = "Laporan Rekapitulasi & Insight Operasional Menara Nobu";
  workbook.company = "PT Bank Nationalnobu Tbk / Menara Nobu Jakarta";

  const exportDate = new Date().toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "full",
    timeStyle: "medium",
  });

  // Tambahkan logo Nobu resmi ke workbook
  let logoImageId: number | null = null;
  try {
    const pureBase64 = NOBU_LOGO_BASE64.replace(/^data:image\/\w+;base64,/, "");
    logoImageId = workbook.addImage({
      base64: pureBase64,
      extension: "png",
    });
  } catch (err) {
    console.warn("Gagal menyematkan logo ke Excel", err);
  }

  // Border styles
  const thinBorder: ExcelJS.Borders = {
    top: { style: "thin", color: { argb: NOBU_XLSX_THEME.border } },
    bottom: { style: "thin", color: { argb: NOBU_XLSX_THEME.border } },
    left: { style: "thin", color: { argb: NOBU_XLSX_THEME.border } },
    right: { style: "thin", color: { argb: NOBU_XLSX_THEME.border } },
  };

  const headerBorder: ExcelJS.Borders = {
    top: { style: "thin", color: { argb: NOBU_XLSX_THEME.primaryDark } },
    bottom: { style: "medium", color: { argb: NOBU_XLSX_THEME.primaryDark } },
    left: { style: "thin", color: { argb: NOBU_XLSX_THEME.primaryDark } },
    right: { style: "thin", color: { argb: NOBU_XLSX_THEME.primaryDark } },
  };

  const doubleBottomBorder: ExcelJS.Borders = {
    top: { style: "thin", color: { argb: NOBU_XLSX_THEME.border } },
    bottom: { style: "double", color: { argb: NOBU_XLSX_THEME.primary } },
    left: { style: "thin", color: { argb: NOBU_XLSX_THEME.border } },
    right: { style: "thin", color: { argb: NOBU_XLSX_THEME.border } },
  };

  // --------------------------------------------------------------------------
  // ANALISIS DATA & STATISTIK BISNIS UNTUK SHEET INSIGHT
  // --------------------------------------------------------------------------
  const totalRecords = rows.length;
  const tujuanCol = headers.findIndex((h) => /tujuan|keperluan|purpose|kategori|category/i.test(h));
  const stafCol = headers.findIndex((h) => /menemui|staf|dituju|karyawan|host|recipient/i.test(h));
  const instansiCol = headers.findIndex((h) => /instansi|perusahaan|institusi|organisasi/i.test(h));
  const waktuCol = headers.findIndex((h) => /waktu|jam|check-in|masuk|date|created/i.test(h));
  const ratingCol = headers.findIndex((h) => /rating|penilaian|bintang/i.test(h));

  // Instansi unik
  const instansiSet = new Set<string>();
  if (instansiCol >= 0) {
    rows.forEach((r) => {
      const val = String(r[instansiCol] || "").trim();
      if (val && val !== "-") instansiSet.add(val);
    });
  }

  // Distribusi Tujuan / Kategori
  const purposeMap = new Map<string, number>();
  if (tujuanCol >= 0) {
    rows.forEach((r) => {
      const val = String(r[tujuanCol] || "").trim() || "Lainnya";
      purposeMap.set(val, (purposeMap.get(val) || 0) + 1);
    });
  }
  const purposeSorted = Array.from(purposeMap.entries()).sort((a, b) => b[1] - a[1]);

  // Kunjungan Staf vs Resepsionis Umum
  let staffVisits = 0;
  let generalVisits = 0;
  const hostMap = new Map<string, number>();
  if (stafCol >= 0) {
    rows.forEach((r) => {
      const val = String(r[stafCol] || "").trim();
      if (!val || val === "-" || /resepsionis|umum|lobi/i.test(val)) {
        generalVisits++;
      } else {
        staffVisits++;
        hostMap.set(val, (hostMap.get(val) || 0) + 1);
      }
    });
  } else {
    staffVisits = totalRecords;
  }
  const topHosts = Array.from(hostMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Distribusi Jam Sibuk (Waktu Kedatangan)
  const timeSlots = {
    pagi: { label: "Sesi Pagi (07:00 - 10:59 WIB)", range: "07:00 - 10:59", count: 0 },
    siang: { label: "Sesi Siang (11:00 - 13:59 WIB)", range: "11:00 - 13:59", count: 0 },
    sore: { label: "Sesi Sore (14:00 - 17:59 WIB)", range: "14:00 - 17:59", count: 0 },
    malam: { label: "Sesi Malam (18:00 - 21:00 WIB)", range: "18:00 - 21:00", count: 0 },
  };

  if (waktuCol >= 0) {
    rows.forEach((r) => {
      const raw = String(r[waktuCol] || "");
      const match = raw.match(/(\d{1,2})[:.](\d{2})/);
      if (match) {
        const hour = parseInt(match[1]!, 10);
        if (hour >= 7 && hour < 11) timeSlots.pagi.count++;
        else if (hour >= 11 && hour < 14) timeSlots.siang.count++;
        else if (hour >= 14 && hour < 18) timeSlots.sore.count++;
        else if (hour >= 18) timeSlots.malam.count++;
        else timeSlots.pagi.count++;
      } else {
        timeSlots.pagi.count++;
      }
    });
  }

  // --------------------------------------------------------------------------
  // SHEET 1: RINGKASAN & INSIGHT EKSEKUTIF (DASHBOARD)
  // --------------------------------------------------------------------------
  if (includeInsights) {
    const summarySheet = workbook.addWorksheet("Ringkasan & Insight", {
      views: [{ showGridLines: true }],
      properties: { tabColor: { argb: NOBU_XLSX_THEME.primary } },
    });

    summarySheet.columns = [
      { width: 8 }, // A: Spacing / No
      { width: 34 }, // B: Kategori / Deskripsi
      { width: 16 }, // C: Jumlah
      { width: 16 }, // D: Proporsi / %
      { width: 26 }, // E: Visual In-Cell Chart
      { width: 28 }, // F: Status / Evaluasi
      { width: 18 }, // G: Cadangan
      { width: 18 }, // H: Cadangan
    ];

    // 1. Header Banner
    summarySheet.mergeCells("A1:F1");
    const titleCell = summarySheet.getCell("A1");
    titleCell.value = "BUKU TAMU DIGITAL — MENARA NOBU JAKARTA";
    titleCell.font = {
      name: "Segoe UI",
      size: 14,
      bold: true,
      color: { argb: NOBU_XLSX_THEME.white },
    };
    titleCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: NOBU_XLSX_THEME.primary },
    };
    titleCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    summarySheet.getRow(1).height = 32;

    summarySheet.mergeCells("A2:F2");
    const subCell = summarySheet.getCell("A2");
    subCell.value = `RINGKASAN EKSEKUTIF & INSIGHT BISNIS — ${title.toUpperCase()}`;
    subCell.font = {
      name: "Segoe UI",
      size: 10,
      bold: true,
      color: { argb: NOBU_XLSX_THEME.primary },
    };
    subCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: NOBU_XLSX_THEME.brandSoft },
    };
    subCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    summarySheet.getRow(2).height = 22;

    summarySheet.mergeCells("A3:F3");
    const metaCell = summarySheet.getCell("A3");
    metaCell.value = `Periode: ${period || "Seluruh Periode"}   |   Waktu Unduh: ${exportDate} WIB   |   Klasifikasi: Dokumen Resmi Terverifikasi`;
    metaCell.font = {
      name: "Segoe UI",
      size: 9,
      italic: true,
      color: { argb: NOBU_XLSX_THEME.muted },
    };
    metaCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    summarySheet.getRow(3).height = 20;

    // Sisipkan logo ke sheet ringkasan jika tersedia
    if (logoImageId !== null) {
      summarySheet.addImage(logoImageId, {
        tl: { col: 4.8, row: 0.15 },
        ext: { width: 140, height: 32 },
      });
    }

    summarySheet.getRow(4).height = 10; // Spacing

    // 2. Kartu Indikator KPI Utama (Row 5 - 7)
    // Card 1: Total Tamu (Col A-B)
    summarySheet.mergeCells("A5:B5");
    const c1Title = summarySheet.getCell("A5");
    c1Title.value = "TOTAL KUNJUNGAN TAMU";
    c1Title.font = {
      name: "Segoe UI",
      size: 9,
      bold: true,
      color: { argb: NOBU_XLSX_THEME.muted },
    };
    c1Title.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: NOBU_XLSX_THEME.brandSoft },
    };
    c1Title.alignment = { vertical: "middle", horizontal: "center" };

    summarySheet.mergeCells("A6:B6");
    const c1Val = summarySheet.getCell("A6");
    c1Val.value = `${totalRecords} Orang`;
    c1Val.font = {
      name: "Segoe UI",
      size: 16,
      bold: true,
      color: { argb: NOBU_XLSX_THEME.primary },
    };
    c1Val.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: NOBU_XLSX_THEME.brandSoft },
    };
    c1Val.alignment = { vertical: "middle", horizontal: "center" };

    summarySheet.mergeCells("A7:B7");
    const c1Sub = summarySheet.getCell("A7");
    c1Sub.value = "Catatan Kunjungan Terdaftar";
    c1Sub.font = {
      name: "Segoe UI",
      size: 8,
      italic: true,
      color: { argb: NOBU_XLSX_THEME.muted },
    };
    c1Sub.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: NOBU_XLSX_THEME.brandSoft },
    };
    c1Sub.alignment = { vertical: "middle", horizontal: "center" };

    // Card 2: Instansi Unik (Col C-D)
    summarySheet.mergeCells("C5:D5");
    const c2Title = summarySheet.getCell("C5");
    c2Title.value = "INSTANSI / PERUSAHAAN UNIK";
    c2Title.font = {
      name: "Segoe UI",
      size: 9,
      bold: true,
      color: { argb: NOBU_XLSX_THEME.muted },
    };
    c2Title.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: NOBU_XLSX_THEME.tableAlt },
    };
    c2Title.alignment = { vertical: "middle", horizontal: "center" };

    summarySheet.mergeCells("C6:D6");
    const c2Val = summarySheet.getCell("C6");
    c2Val.value = `${instansiSet.size > 0 ? instansiSet.size : "-"} Lembaga`;
    c2Val.font = {
      name: "Segoe UI",
      size: 16,
      bold: true,
      color: { argb: NOBU_XLSX_THEME.foreground },
    };
    c2Val.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NOBU_XLSX_THEME.tableAlt } };
    c2Val.alignment = { vertical: "middle", horizontal: "center" };

    summarySheet.mergeCells("C7:D7");
    const c2Sub = summarySheet.getCell("C7");
    c2Sub.value = "Keragaman Mitra & Tamu Luar";
    c2Sub.font = {
      name: "Segoe UI",
      size: 8,
      italic: true,
      color: { argb: NOBU_XLSX_THEME.muted },
    };
    c2Sub.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NOBU_XLSX_THEME.tableAlt } };
    c2Sub.alignment = { vertical: "middle", horizontal: "center" };

    // Card 3: Bertemu Staf vs Lobi (Col E-F)
    summarySheet.mergeCells("E5:F5");
    const c3Title = summarySheet.getCell("E5");
    c3Title.value = "DISTRIBUSI BERTEMU STAF";
    c3Title.font = {
      name: "Segoe UI",
      size: 9,
      bold: true,
      color: { argb: NOBU_XLSX_THEME.muted },
    };
    c3Title.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: NOBU_XLSX_THEME.brandSoft },
    };
    c3Title.alignment = { vertical: "middle", horizontal: "center" };

    summarySheet.mergeCells("E6:F6");
    const c3Val = summarySheet.getCell("E6");
    c3Val.value = `${staffVisits} Staf · ${generalVisits} Lobi`;
    c3Val.font = {
      name: "Segoe UI",
      size: 14,
      bold: true,
      color: { argb: NOBU_XLSX_THEME.primary },
    };
    c3Val.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: NOBU_XLSX_THEME.brandSoft },
    };
    c3Val.alignment = { vertical: "middle", horizontal: "center" };

    summarySheet.mergeCells("E7:F7");
    const c3Sub = summarySheet.getCell("E7");
    const staffRatio = totalRecords > 0 ? Math.round((staffVisits / totalRecords) * 100) : 0;
    c3Sub.value = `${staffRatio}% Menemui Staf Internal`;
    c3Sub.font = {
      name: "Segoe UI",
      size: 8,
      italic: true,
      color: { argb: NOBU_XLSX_THEME.muted },
    };
    c3Sub.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: NOBU_XLSX_THEME.brandSoft },
    };
    c3Sub.alignment = { vertical: "middle", horizontal: "center" };

    // Beri border untuk blok kartu KPI
    [
      "A5",
      "B5",
      "A6",
      "B6",
      "A7",
      "B7",
      "C5",
      "D5",
      "C6",
      "D6",
      "C7",
      "D7",
      "E5",
      "F5",
      "E6",
      "F6",
      "E7",
      "F7",
    ].forEach((cellRef) => {
      summarySheet.getCell(cellRef).border = thinBorder;
    });

    summarySheet.getRow(8).height = 14; // Spacing

    // 3. Section 1: Distribusi Tujuan / Kategori Kunjungan dengan Chart In-Cell
    let curRow = 9;
    summarySheet.mergeCells(`A${curRow}:F${curRow}`);
    const sec1Head = summarySheet.getCell(`A${curRow}`);
    sec1Head.value = "1. DISTRIBUSI TUJUAN KUNJUNGAN & VISUALISASI PROPORSI (PURPOSE SHARE)";
    sec1Head.font = {
      name: "Segoe UI",
      size: 10,
      bold: true,
      color: { argb: NOBU_XLSX_THEME.white },
    };
    sec1Head.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: NOBU_XLSX_THEME.primaryDark },
    };
    sec1Head.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    summarySheet.getRow(curRow).height = 24;

    curRow++;
    const table1Headers = [
      "No",
      "Kategori Keperluan / Tujuan",
      "Jumlah Tamu",
      "Proporsi (%)",
      "Visual Indikator Grafik",
      "Status Operasional",
    ];
    table1Headers.forEach((h, idx) => {
      const cell = summarySheet.getRow(curRow).getCell(idx + 1);
      cell.value = h;
      cell.font = {
        name: "Segoe UI",
        size: 9.5,
        bold: true,
        color: { argb: NOBU_XLSX_THEME.white },
      };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NOBU_XLSX_THEME.primary } };
      cell.border = headerBorder;
      cell.alignment = { vertical: "middle", horizontal: idx === 1 ? "left" : "center" };
    });
    summarySheet.getRow(curRow).height = 22;

    const purposesToRender =
      purposeSorted.length > 0 ? purposeSorted : [["Kunjungan Tamu Umum", totalRecords]];

    purposesToRender.forEach(([purposeName, count], idx) => {
      curRow++;
      const pct = totalRecords > 0 ? (count / totalRecords) * 100 : 0;
      const visualBar = generateVisualBar(pct, 12);
      const isAlt = idx % 2 === 1;
      const rowFill: ExcelJS.Fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: isAlt ? NOBU_XLSX_THEME.tableAlt : NOBU_XLSX_THEME.white },
      };

      const statusTag =
        pct >= 40
          ? "Prioritas Utama (Tinggi)"
          : pct >= 15
            ? "Reguler / Standar"
            : "Kunjungan Spesifik";

      const r = summarySheet.getRow(curRow);
      r.height = 20;

      r.getCell(1).value = idx + 1;
      r.getCell(1).alignment = { vertical: "middle", horizontal: "center" };

      r.getCell(2).value = purposeName;
      r.getCell(2).font = { bold: true };
      r.getCell(2).alignment = { vertical: "middle", horizontal: "left" };

      r.getCell(3).value = count;
      r.getCell(3).alignment = { vertical: "middle", horizontal: "center" };

      r.getCell(4).value = `${pct.toFixed(1)}%`;
      r.getCell(4).alignment = { vertical: "middle", horizontal: "center" };

      r.getCell(5).value = visualBar;
      r.getCell(5).font = {
        name: "Courier New",
        size: 9,
        bold: true,
        color: { argb: NOBU_XLSX_THEME.primary },
      };
      r.getCell(5).alignment = { vertical: "middle", horizontal: "left" };

      r.getCell(6).value = statusTag;
      r.getCell(6).alignment = { vertical: "middle", horizontal: "center" };

      for (let c = 1; c <= 6; c++) {
        r.getCell(c).border = thinBorder;
        r.getCell(c).fill = rowFill;
      }
    });

    // Total baris tabel 1
    curRow++;
    const totRow1 = summarySheet.getRow(curRow);
    totRow1.height = 22;
    totRow1.getCell(1).value = "";
    totRow1.getCell(2).value = "TOTAL KUNJUNGAN TERDATA";
    totRow1.getCell(2).font = { bold: true, color: { argb: NOBU_XLSX_THEME.primary } };
    totRow1.getCell(3).value = totalRecords;
    totRow1.getCell(3).font = { bold: true, color: { argb: NOBU_XLSX_THEME.primary } };
    totRow1.getCell(3).alignment = { vertical: "middle", horizontal: "center" };
    totRow1.getCell(4).value = "100.0%";
    totRow1.getCell(4).font = { bold: true };
    totRow1.getCell(4).alignment = { vertical: "middle", horizontal: "center" };
    totRow1.getCell(5).value = generateVisualBar(100, 12);
    totRow1.getCell(5).font = {
      name: "Courier New",
      size: 9,
      bold: true,
      color: { argb: NOBU_XLSX_THEME.primary },
    };
    totRow1.getCell(6).value = "Lengkap";
    totRow1.getCell(6).alignment = { vertical: "middle", horizontal: "center" };
    for (let c = 1; c <= 6; c++) {
      totRow1.getCell(c).border = doubleBottomBorder;
      totRow1.getCell(c).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: NOBU_XLSX_THEME.brandSoft },
      };
    }

    // 4. Section 2: Analisis Jam Sibuk (Peak Visit Hours Insight)
    curRow += 2;
    summarySheet.mergeCells(`A${curRow}:F${curRow}`);
    const sec2Head = summarySheet.getCell(`A${curRow}`);
    sec2Head.value = "2. ANALISIS JAM KUNJUNGAN SIBUK (PEAK VISIT HOURS INSIGHT)";
    sec2Head.font = {
      name: "Segoe UI",
      size: 10,
      bold: true,
      color: { argb: NOBU_XLSX_THEME.white },
    };
    sec2Head.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: NOBU_XLSX_THEME.primaryDark },
    };
    sec2Head.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    summarySheet.getRow(curRow).height = 24;

    curRow++;
    const table2Headers = [
      "Sesi Waktu",
      "Rentang Jam Operasional",
      "Jumlah Kedatangan",
      "Proporsi (%)",
      "Tingkat Kepadatan Lobi",
      "Visual Indikator Kepadatan",
    ];
    table2Headers.forEach((h, idx) => {
      const cell = summarySheet.getRow(curRow).getCell(idx + 1);
      cell.value = h;
      cell.font = {
        name: "Segoe UI",
        size: 9.5,
        bold: true,
        color: { argb: NOBU_XLSX_THEME.white },
      };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NOBU_XLSX_THEME.primary } };
      cell.border = headerBorder;
      cell.alignment = { vertical: "middle", horizontal: idx <= 1 ? "left" : "center" };
    });
    summarySheet.getRow(curRow).height = 22;

    const slotList = [timeSlots.pagi, timeSlots.siang, timeSlots.sore, timeSlots.malam];
    slotList.forEach((slot, idx) => {
      curRow++;
      const pct = totalRecords > 0 ? (slot.count / totalRecords) * 100 : 0;
      const densityLabel =
        pct >= 40
          ? "🔴 Sangat Padat (Peak Hours)"
          : pct >= 20
            ? "🟡 Sedang (Optimal)"
            : pct > 0
              ? "🟢 Normal (Terkendali)"
              : "⚪ Lengang";

      const r = summarySheet.getRow(curRow);
      r.height = 20;
      r.getCell(1).value = slot.label.split("(")[0]?.trim();
      r.getCell(1).font = { bold: true };
      r.getCell(2).value = slot.range + " WIB";
      r.getCell(2).alignment = { vertical: "middle", horizontal: "center" };
      r.getCell(3).value = slot.count;
      r.getCell(3).alignment = { vertical: "middle", horizontal: "center" };
      r.getCell(4).value = `${pct.toFixed(1)}%`;
      r.getCell(4).alignment = { vertical: "middle", horizontal: "center" };
      r.getCell(5).value = densityLabel;
      r.getCell(5).alignment = { vertical: "middle", horizontal: "center" };
      r.getCell(6).value = generateVisualBar(pct, 12);
      r.getCell(6).font = {
        name: "Courier New",
        size: 9,
        bold: true,
        color: { argb: NOBU_XLSX_THEME.primary },
      };

      const isAlt = idx % 2 === 1;
      for (let c = 1; c <= 6; c++) {
        r.getCell(c).border = thinBorder;
        r.getCell(c).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: isAlt ? NOBU_XLSX_THEME.tableAlt : NOBU_XLSX_THEME.white },
        };
      }
    });

    // 5. Section 3: Rekomendasi Operasional & Keamanan
    curRow += 2;
    summarySheet.mergeCells(`A${curRow}:F${curRow}`);
    const sec3Head = summarySheet.getCell(`A${curRow}`);
    sec3Head.value = "3. CATATAN & REKOMENDASI MANAJEMEN FASILITAS & KEAMANAN GEDUNG";
    sec3Head.font = {
      name: "Segoe UI",
      size: 10,
      bold: true,
      color: { argb: NOBU_XLSX_THEME.white },
    };
    sec3Head.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: NOBU_XLSX_THEME.primaryDark },
    };
    sec3Head.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    summarySheet.getRow(curRow).height = 24;

    const guidanceNotes = [
      "• Jam sibuk lobi utama umumnya terjadi pada rentang Sesi Pagi & Siang; disarankan minimal 2 petugas pos jaga lobi aktif.",
      "• Seluruh tamu wajib mengalungkan kartu akses fisik (Visitor Pass) dan mengembalikan saat checkout sebelum pukul 20:00 WIB.",
      "• Data pada laporan ini dienkripsi dan terlindungi sesuai kebijakan privasi korporat Menara Nobu Jakarta.",
      "• Hubungi Pos Keamanan & Resepsionis Gedung Ext. 101 untuk eskalasi tamu VIP atau konfirmasi izin masuk darurat.",
    ];

    guidanceNotes.forEach((note) => {
      curRow++;
      summarySheet.mergeCells(`A${curRow}:F${curRow}`);
      const noteCell = summarySheet.getCell(`A${curRow}`);
      noteCell.value = note;
      noteCell.font = {
        name: "Segoe UI",
        size: 8.5,
        italic: true,
        color: { argb: NOBU_XLSX_THEME.muted },
      };
      noteCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: NOBU_XLSX_THEME.tableAlt },
      };
      noteCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
      summarySheet.getRow(curRow).height = 19;
      for (let c = 1; c <= 6; c++) {
        summarySheet.getRow(curRow).getCell(c).border = thinBorder;
      }
    });
  }

  // --------------------------------------------------------------------------
  // SHEET 2: DATA DETAIL LENGKAP DENGAN TABEL BERGARIS & FORMAT RAPI
  // --------------------------------------------------------------------------
  const safeDataSheetName = (sheetName || "Data Detail").replace(/[:\\/?*[\]]/g, "").slice(0, 31);
  const dataSheet = workbook.addWorksheet(safeDataSheetName, {
    views: [
      {
        state: "frozen",
        xSplit: 0,
        ySplit: 5, // Freeze header row
        showGridLines: true,
      },
    ],
    properties: { tabColor: { argb: NOBU_XLSX_THEME.brand } },
  });

  // 1. Kop Tabel Sheet Data
  const totalCols = Math.max(headers.length, 6);
  const lastColLetter = String.fromCharCode(64 + Math.min(totalCols, 26));

  dataSheet.mergeCells(`A1:${lastColLetter}1`);
  const dTitle = dataSheet.getCell("A1");
  dTitle.value = "MENARA NOBU — BUKU TAMU DIGITAL RESMI";
  dTitle.font = { name: "Segoe UI", size: 13, bold: true, color: { argb: NOBU_XLSX_THEME.white } };
  dTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NOBU_XLSX_THEME.primary } };
  dTitle.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  dataSheet.getRow(1).height = 30;

  dataSheet.mergeCells(`A2:${lastColLetter}2`);
  const dSub = dataSheet.getCell("A2");
  dSub.value = `${title.toUpperCase()} — ${subtitle}`;
  dSub.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: NOBU_XLSX_THEME.primary } };
  dSub.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NOBU_XLSX_THEME.brandSoft } };
  dSub.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  dataSheet.getRow(2).height = 20;

  dataSheet.mergeCells(`A3:${lastColLetter}3`);
  const dMeta = dataSheet.getCell("A3");
  dMeta.value = `Periode: ${period || "Semua"}   |   Waktu Unduh: ${exportDate} WIB   |   Total Data: ${rows.length} Catatan`;
  dMeta.font = { name: "Segoe UI", size: 9, italic: true, color: { argb: NOBU_XLSX_THEME.muted } };
  dMeta.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  dataSheet.getRow(3).height = 18;

  dataSheet.getRow(4).height = 8; // Baris pemisah

  // 2. Baris Header Tabel (Row 5)
  const headerRow = dataSheet.getRow(5);
  headerRow.height = 26;
  headers.forEach((headerText, colIdx) => {
    const cell = headerRow.getCell(colIdx + 1);
    cell.value = headerText;
    cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: NOBU_XLSX_THEME.white } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NOBU_XLSX_THEME.primary } };
    cell.border = headerBorder;
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  });

  // Pasang AutoFilter pada baris header agar user bisa filter di Excel
  dataSheet.autoFilter = {
    from: { row: 5, column: 1 },
    to: { row: 5, column: headers.length },
  };

  // 3. Render Baris Data dengan Garis Border Penuh & Zebra Striping
  rows.forEach((row, rowIdx) => {
    const r = dataSheet.getRow(6 + rowIdx);
    r.height = 21;
    const isAlt = rowIdx % 2 === 1;
    const rowFill: ExcelJS.Fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: isAlt ? NOBU_XLSX_THEME.tableAlt : NOBU_XLSX_THEME.white },
    };

    headers.forEach((h, colIdx) => {
      const cell = r.getCell(colIdx + 1);
      const val = row[colIdx];
      cell.value = val === null || val === undefined ? "-" : val;
      cell.font = { name: "Segoe UI", size: 9.5, color: { argb: NOBU_XLSX_THEME.foreground } };
      cell.fill = rowFill;
      cell.border = thinBorder;

      // Penataan alignment spesifik per tipe kolom
      const headerLower = h.toLowerCase();
      if (headerLower === "no" || headerLower === "no.") {
        cell.alignment = { vertical: "middle", horizontal: "center" };
      } else if (
        headerLower.includes("waktu") ||
        headerLower.includes("jam") ||
        headerLower.includes("tanggal")
      ) {
        cell.alignment = { vertical: "middle", horizontal: "center" };
      } else if (headerLower.includes("telepon") || headerLower.includes("phone")) {
        cell.alignment = { vertical: "middle", horizontal: "center" };
      } else if (headerLower.includes("rating") || headerLower.includes("bintang")) {
        cell.alignment = { vertical: "middle", horizontal: "center" };
      } else if (headerLower.includes("durasi") || headerLower.includes("detik")) {
        cell.alignment = { vertical: "middle", horizontal: "right" };
      } else {
        cell.alignment = { vertical: "middle", horizontal: "left" };
      }
    });
  });

  // 4. Baris Summary Total Data di Bawah Tabel
  const totalRowIdx = 6 + rows.length;
  const summaryRow = dataSheet.getRow(totalRowIdx);
  summaryRow.height = 24;
  summaryRow.getCell(1).value = "";
  summaryRow.getCell(2).value = `TOTAL DATA: ${rows.length} BARIS`;
  summaryRow.getCell(2).font = {
    name: "Segoe UI",
    size: 10,
    bold: true,
    color: { argb: NOBU_XLSX_THEME.primary },
  };
  summaryRow.getCell(2).alignment = { vertical: "middle", horizontal: "left" };

  for (let c = 1; c <= headers.length; c++) {
    const cell = summaryRow.getCell(c);
    cell.border = doubleBottomBorder;
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NOBU_XLSX_THEME.brandSoft } };
  }

  // 5. Kalkulasi Lebar Kolom Dinamis (Auto-width)
  dataSheet.columns = headers.map((header, colIdx) => {
    let maxLen = String(header).length;
    for (const row of rows) {
      const val = row[colIdx];
      if (val !== undefined && val !== null) {
        maxLen = Math.max(maxLen, String(val).length);
      }
    }
    const customWidth = columnWidths && columnWidths[colIdx];
    return {
      width: customWidth || Math.min(Math.max(maxLen + 4, 13), 45),
    };
  });

  // 6. Generate Buffer & Download File
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const cleanFilename = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  triggerFileDownload(blob, cleanFilename);
}

/**
 * Ekspor data ke dokumen PDF (.pdf) formal berstandar korporat Menara Nobu
 * lengkap dengan Kop Resmi berlogo asli Bank Nobu, badge validasi resmi,
 * strip ringkasan metrik eksekutif, tabel bergaris tema hijau emerald,
 * nomor halaman otomatis, dan tanda tangan pengesahan tiga pihak.
 */
export function exportToPdf({
  filename,
  title,
  subtitle = "Gedung Perkantoran Menara Nobu · Pos Keamanan & Resepsionis Lobi",
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

  // 2. Kop Dokumen Resmi dengan Wadah Logo Asli Nobu
  const logoW = 38;
  const logoH = logoW / NOBU_LOGO_ASPECT_RATIO;

  // Latar putih halus logo
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...NOBU_PDF_THEME.border);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, 8, logoW + 4, logoH + 3, 1.5, 1.5, "FD");

  // Render logo asli base64
  doc.addImage(NOBU_LOGO_BASE64, "PNG", 16, 9.5, logoW, logoH);

  // Teks Identitas Gedung & Instansi
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...NOBU_PDF_THEME.foreground);
  doc.text("MENARA NOBU — BUKU TAMU DIGITAL", 58, 13);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...NOBU_PDF_THEME.muted);
  doc.text(subtitle, 58, 17.5);

  // Badge label resmi di sudut kanan atas
  const tagW = 38;
  doc.setFillColor(...NOBU_PDF_THEME.brandSoft);
  doc.setDrawColor(...NOBU_PDF_THEME.brand);
  doc.setLineWidth(0.3);
  doc.roundedRect(pageWidth - 14 - tagW, 9.5, tagW, 7, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...NOBU_PDF_THEME.primary);
  doc.text("DOKUMEN RESMI · VALID", pageWidth - 14 - tagW / 2, 14, { align: "center" });

  // 3. Garis pembatas kop beraksen tema
  doc.setDrawColor(...NOBU_PDF_THEME.border);
  doc.setLineWidth(0.4);
  doc.line(14, 22.5, pageWidth - 14, 22.5);

  // 4. Judul Laporan
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  doc.setTextColor(...NOBU_PDF_THEME.primary);
  doc.text(title.toUpperCase(), 14, 28.5);

  // 5. Executive Summary KPI Strip Bar (Kotak Ringkasan Sebelum Tabel)
  const stripY = 32;
  const stripH = 11;
  doc.setFillColor(...NOBU_PDF_THEME.brandSoft);
  doc.setDrawColor(...NOBU_PDF_THEME.border);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, stripY, pageWidth - 28, stripH, 2, 2, "FD");

  // Isi kartu ringkasan dalam 4 metrik
  const colW = (pageWidth - 28) / 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...NOBU_PDF_THEME.primary);
  doc.text("TOTAL DATA:", 18, stripY + 4.5);
  doc.text("PERIODE:", 18 + colW, stripY + 4.5);
  doc.text("WAKTU CETAK:", 18 + colW * 2, stripY + 4.5);
  doc.text("PENGESAHAN:", 18 + colW * 3, stripY + 4.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...NOBU_PDF_THEME.foreground);
  doc.text(`${rows.length} Catatan`, 18, stripY + 8.5);
  doc.text(period || "Seluruh Periode", 18 + colW, stripY + 8.5);
  doc.text(`${exportDate.slice(0, 24)} WIB`, 18 + colW * 2, stripY + 8.5);
  doc.text("Resepsionis & Pos Jaga", 18 + colW * 3, stripY + 8.5);

  // 6. Render Tabel Data dengan jsPDF autoTable bergaris rapi bertema web
  autoTable(doc, {
    startY: 46,
    head: [headers],
    body: rows.map((r) =>
      r.map((c) => (c === null || c === undefined ? "-" : String(c).trim() || "-")),
    ),
    margin: { left: 14, right: 14, bottom: 22 },
    theme: "grid",
    headStyles: {
      fillColor: NOBU_PDF_THEME.primary,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      halign: "left",
      cellPadding: 2.4,
    },
    bodyStyles: {
      textColor: NOBU_PDF_THEME.foreground,
      fontSize: 7.5,
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
      doc.setFontSize(7);
      doc.setTextColor(...NOBU_PDF_THEME.muted);

      const footerText = `Dokumen Resmi Menara Nobu · Halaman ${data.pageNumber}`;
      doc.text(footerText, 14, pageHeight - 6);

      const systemTag = "Sistem Manajemen Resepsionis & Pos Keamanan · Kerahasiaan Terjamin";
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
      2: {
        cellWidth: 24,
        font: "courier",
        fontSize: 7,
        fontStyle: "bold",
        textColor: NOBU_PDF_THEME.primary,
      },
      3: { fontStyle: "bold" },
      9: { cellWidth: 20, halign: "center" }, // Paraf column
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
