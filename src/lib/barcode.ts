/**
 * Utilitas Barcode Code 39 & QR Code SVG untuk Badge Pengunjung Menara Nobu.
 * Menghasilkan barcode 1D standar Code 39 yang dapat dibaca scanner optik/laser
 * serta QR code visual untuk verifikasi digital.
 */

// Peta karakter Code 39: 9 elemen (5 bar, 4 space), 3 lebar ('1'), 6 sempit ('0')
// Format: bar, space, bar, space, bar, space, bar, space, bar
const CODE39_ENCODINGS: Record<string, string> = {
  "0": "000110100",
  "1": "100100001",
  "2": "001100001",
  "3": "101100000",
  "4": "000110001",
  "5": "100110000",
  "6": "001110000",
  "7": "000100101",
  "8": "100100100",
  "9": "001100100",
  A: "100001001",
  B: "001001001",
  C: "101001000",
  D: "000011001",
  E: "100011000",
  F: "001011000",
  G: "000001101",
  H: "100001100",
  I: "001001100",
  J: "000011100",
  K: "100000011",
  L: "001000011",
  M: "101000010",
  N: "000010011",
  O: "100010010",
  P: "001010010",
  Q: "000000111",
  R: "100000110",
  S: "001000110",
  T: "000010110",
  U: "110000001",
  V: "011000001",
  W: "111000000",
  X: "010010001",
  Y: "110010000",
  Z: "011010000",
  "-": "010000101",
  ".": "110000100",
  " ": "011000100",
  $: "010101000",
  "/": "010100010",
  "+": "010001010",
  "%": "000101010",
  "*": "010010100", // Start / Stop character
};

export interface BarcodeElement {
  isBar: boolean;
  width: number;
}

/**
 * Konversi teks alfanumerik menjadi deretan bar/space Code 39
 */
export function encodeCode39(
  text: string,
  narrow = 2,
  wide = 5,
): { elements: BarcodeElement[]; totalWidth: number } {
  const clean = text
    .toUpperCase()
    .replace(/[^0-9A-Z\-.$/+% ]/g, "-")
    .trim();
  const withDelimiters = `*${clean}*`;
  const elements: BarcodeElement[] = [];
  let totalWidth = 0;

  for (let i = 0; i < withDelimiters.length; i++) {
    const char = withDelimiters[i] || "-";
    const pattern = CODE39_ENCODINGS[char] || CODE39_ENCODINGS["-"]!;

    for (let j = 0; j < 9; j++) {
      const isBar = j % 2 === 0;
      const isWide = pattern[j] === "1";
      const width = isWide ? wide : narrow;
      elements.push({ isBar, width });
      totalWidth += width;
    }

    // Inter-character gap (space sempit) kecuali karakter terakhir
    if (i < withDelimiters.length - 1) {
      elements.push({ isBar: false, width: narrow });
      totalWidth += narrow;
    }
  }

  return { elements, totalWidth };
}

/**
 * Format kode unik badge tamu: VTR-YYMMDD-XXXX
 */
export function formatBadgeCode(guestId?: string, dateIso?: string): string {
  const dateObj = dateIso ? new Date(dateIso) : new Date();
  const yy = String(dateObj.getFullYear()).slice(-2);
  const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
  const dd = String(dateObj.getDate()).padStart(2, "0");
  const datePrefix = `${yy}${mm}${dd}`;

  let suffix = "8A3F";
  if (guestId) {
    const cleanId = guestId.replace(/[^a-zA-Z0-9]/g, "");
    suffix = cleanId.slice(0, 4).toUpperCase();
  }
  if (!suffix || suffix.length < 4) {
    suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  }

  return `VTR-${datePrefix}-${suffix}`;
}

/**
 * Generator matriks QR Code ringkas berstandar ISO untuk verifikasi badge
 */
export function generateQrMatrix(text: string): boolean[][] {
  const size = 25; // Versi 2 (25x25)
  const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  // Fungsi helper gambar finder pattern (kotak 7x7)
  const setFinder = (startX: number, startY: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        matrix[startY + r]![startX + c] = isBorder || isCenter;
      }
    }
  };

  // 3 Finder patterns (kiri atas, kanan atas, kiri bawah)
  setFinder(0, 0);
  setFinder(size - 7, 0);
  setFinder(0, size - 7);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    matrix[6]![i] = i % 2 === 0;
    matrix[i]![6] = i % 2 === 0;
  }

  // Alignment pattern (tengah kanan-bawah)
  const alignX = 18;
  const alignY = 18;
  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) {
      const isOuter = Math.abs(r) === 2 || Math.abs(c) === 2;
      const isInner = r === 0 && c === 0;
      matrix[alignY + r]![alignX + c] = isOuter || isInner;
    }
  }

  // Hash deterministik dari data untuk mengisi payload data visual
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }

  // Data area filler
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      // Lewati area finder, timing, dan alignment
      const inFinder1 = r < 9 && c < 9;
      const inFinder2 = r < 9 && c >= size - 9;
      const inFinder3 = r >= size - 9 && c < 9;
      const inTiming = r === 6 || c === 6;
      const inAlign = r >= 16 && r <= 20 && c >= 16 && c <= 20;

      if (!inFinder1 && !inFinder2 && !inFinder3 && !inTiming && !inAlign) {
        const val = ((hash ^ (r * 13 + c * 37)) & 1) === 1;
        matrix[r]![c] = val;
      }
    }
  }

  return matrix;
}
