/**
 * Utilitas terpusat untuk ekspor data tabel ke berkas CSV (kompatibel Microsoft Excel).
 * Menghindari duplikasi kode escape sel, pembuatan Blob UTF-8 BOM, dan pembersihan Object URL.
 */

/**
 * Membersihkan nilai sel CSV untuk mencegah serangan *CSV Formula Injection*
 * (dengan memberi prefiks apostrof `'` pada nilai berawalan `=`, `+`, `-`, `@`)
 * serta membungkus seluruh sel dalam tanda petik ganda sesuai RFC 4180.
 */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  let str = String(value).trim();
  // Cegah CSV / Spreadsheet formula injection (=, +, -, @) saat dibuka di Excel/Sheets
  if (/^[=+\-@]/.test(str)) {
    str = "'" + str;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

/** Opsi konfigurasi untuk mengekspor array baris menjadi berkas `.csv`. */
export interface CsvExportOptions {
  /** Nama berkas unduhan (ekstensi `.csv` ditambahkan otomatis jika belum ada). */
  filename: string;
  /** Daftar judul kolom pada baris pertama. */
  headers: string[];
  /** Matriks baris data yang akan diserialisasi ke CSV. */
  rows: unknown[][];
}

/**
 * Mengunduh sekumpulan baris data sebagai berkas CSV dengan penanda UTF-8 BOM (`\ufeff`)
 * agar karakter Indonesia/Unicode terbaca sempurna di Microsoft Excel Windows maupun macOS.
 */
export function exportToCsv({ filename, headers, rows }: CsvExportOptions): void {
  const headerLine = headers.map(escapeCsvCell).join(",");
  const dataLines = rows.map((row) => row.map(escapeCsvCell).join(","));
  // Prefiks `\ufeff` (UTF-8 Byte Order Mark) wajib agar Excel otomatis mengenali encoding UTF-8
  const csvContent = "\ufeff" + [headerLine, ...dataLines].join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  const finalName = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  anchor.href = url;
  anchor.download = finalName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  // Tunda pencabutan Object URL selama 30 detik agar browser mobile lambat sempat menyelesaikan unduhan
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 30000);
}
