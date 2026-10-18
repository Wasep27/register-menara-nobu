import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { escapeCsvCell } from "./csv-export";

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
      })
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

  // 1. Accent top bar (Navy & Primary Gold/Cyan)
  doc.setFillColor(15, 23, 42); // slate-900 (Navy)
  doc.rect(0, 0, pageWidth, 5, "F");
  doc.setFillColor(14, 165, 233); // sky-500
  doc.rect(0, 5, pageWidth, 1.5, "F");

  // 2. Kop Dokumen
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text("MENARA NOBU — BUKU TAMU DIGITAL", 14, 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(subtitle, 14, 21);

  // 3. Garis pembatas kop
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.5);
  doc.line(14, 24, pageWidth - 14, 24);

  // 4. Judul Laporan & Metadata Card
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(2, 132, 199); // primary blue
  doc.text(title.toUpperCase(), 14, 31);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105); // slate-600

  let metaText = `Waktu Cetak: ${exportDate} WIB`;
  if (period) {
    metaText = `Periode: ${period}  |  ${metaText}`;
  }
  metaText += `  |  Total Data: ${rows.length} Catatan`;
  doc.text(metaText, 14, 36);

  // 5. Render Tabel Data dengan jsPDF autoTable
  autoTable(doc, {
    startY: 40,
    head: [headers],
    body: rows.map((r) =>
      r.map((c) => (c === null || c === undefined ? "-" : String(c).trim() || "-"))
    ),
    margin: { left: 14, right: 14, bottom: 20 },
    theme: "grid",
    headStyles: {
      fillColor: [15, 23, 42], // Slate 900
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.5,
      halign: "left",
      cellPadding: 2.5,
    },
    bodyStyles: {
      textColor: [51, 65, 85], // Slate 700
      fontSize: 8,
      cellPadding: 2.2,
      valign: "middle",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // Slate 50
    },
    tableLineColor: [226, 232, 240],
    tableLineWidth: 0.2,
    didDrawPage: (data) => {
      // Footer Nomor Halaman
      const pageNumber = (doc as any).internal.getNumberOfPages
        ? (doc as any).internal.getNumberOfPages()
        : data.pageNumber;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184); // Slate 400

      const footerText = `Dokumen Resmi Menara Nobu · Halaman ${data.pageNumber}`;
      doc.text(footerText, 14, pageHeight - 8);

      const systemTag = "Sistem Manajemen Resepsionis & Pos Keamanan";
      const tagWidth = doc.getTextWidth(systemTag);
      doc.text(systemTag, pageWidth - 14 - tagWidth, pageHeight - 8);
    },
  });

  const cleanFilename = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  doc.save(cleanFilename);
}

/**
 * Re-export escapeCsvCell & exportToCsv untuk kelengkapan dan kompatibilitas modul
 */
export { escapeCsvCell };
export { exportToCsv } from "./csv-export";
