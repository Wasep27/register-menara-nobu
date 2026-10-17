import React, { useState, useRef, useMemo } from "react";
import {
  Printer,
  Download,
  X,
  Building2,
  Calendar,
  Clock,
  User,
  ShieldCheck,
  Sparkles,
  QrCode,
  Barcode,
  Check,
  Copy,
} from "lucide-react";
import logo from "@/assets/logo.png";
import { encodeCode39, formatBadgeCode, generateQrMatrix } from "@/lib/barcode";
import { toast } from "sonner";

export interface VisitorBadgeData {
  id?: string;
  name: string;
  institution: string;
  phone?: string;
  employeeName?: string;
  purposeName?: string;
  checkInTime?: string;
  checkInDate?: string;
  badgeNumber?: string;
}

interface VisitorBadgeModalProps {
  open: boolean;
  onClose: () => void;
  data: VisitorBadgeData;
}

export function VisitorBadgeModal({ open, onClose, data }: VisitorBadgeModalProps) {
  const [format, setFormat] = useState<"lanyard" | "compact">("lanyard");
  const [showQr, setShowQr] = useState<boolean>(true);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const badgeCardRef = useRef<HTMLDivElement>(null);

  // Generate deterministic pass code
  const badgeCode = useMemo(() => {
    if (data.badgeNumber) return data.badgeNumber;
    return formatBadgeCode(data.id, new Date().toISOString());
  }, [data.badgeNumber, data.id]);

  // Generate barcode elements
  const { elements: barcodeElements, totalWidth: barcodeWidth } = useMemo(() => {
    return encodeCode39(badgeCode, 2, 5);
  }, [badgeCode]);

  // Generate QR matrix
  const qrMatrix = useMemo(() => {
    return generateQrMatrix(`MENARA-NOBU:${badgeCode}:${data.name}:${data.institution}`);
  }, [badgeCode, data.name, data.institution]);

  const displayTime =
    data.checkInTime ||
    new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  const displayDate =
    data.checkInDate ||
    new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  // Handle Copy Badge Code
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(badgeCode);
      setCopied(true);
      toast.success("Kode pass berhasil disalin!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Gagal menyalin kode");
    }
  };

  // Handle Direct Print
  const handlePrint = () => {
    window.print();
  };

  // Handle Download as PNG Image via HTML5 Canvas
  const handleDownloadImage = async () => {
    setDownloading(true);
    try {
      const isLanyard = format === "lanyard";
      const width = isLanyard ? 480 : 640;
      const height = isLanyard ? 760 : 420;
      const canvas = document.createElement("canvas");
      canvas.width = width * 2; // Retina 2x scale
      canvas.height = height * 2;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context unavailable");

      ctx.scale(2, 2);

      // 1. Background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);

      // Card border
      ctx.strokeStyle = "#d6e7e0";
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, width - 2, height - 2);

      // 2. Top Header Bar (Emerald Brand)
      const grad = ctx.createLinearGradient(0, 0, width, 0);
      grad.addColorStop(0, "#07936E");
      grad.addColorStop(1, "#10D5A0");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, isLanyard ? 110 : 80);

      // Lanyard hole punch indicator (if lanyard format)
      if (isLanyard) {
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(width / 2, 20, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#d6e7e0";
        ctx.stroke();
      }

      // Header Text
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText("MENARA NOBU", width / 2, isLanyard ? 58 : 38);

      ctx.font = "bold 11px sans-serif";
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.fillText("VISITOR PASS · BUKU TAMU DIGITAL", width / 2, isLanyard ? 80 : 58);

      // 3. Status Tag / Date
      ctx.fillStyle = "#e3faf3";
      ctx.beginPath();
      const badgeY = isLanyard ? 130 : 100;
      ctx.roundRect(width / 2 - 110, badgeY, 220, 26, 13);
      ctx.fill();

      ctx.fillStyle = "#07936E";
      ctx.font = "bold 11px sans-serif";
      ctx.fillText(`✓ CHECK-IN: ${displayDate} · ${displayTime} WIB`, width / 2, badgeY + 17);

      // 4. Visitor Name & Institution
      const nameY = isLanyard ? 200 : 155;
      ctx.fillStyle = "#10241E";
      ctx.font = "bold 26px sans-serif";
      ctx.fillText(data.name, width / 2, nameY);

      ctx.fillStyle = "#4F625C";
      ctx.font = "600 15px sans-serif";
      ctx.fillText(data.institution, width / 2, nameY + 28);

      // 5. Host & Purpose Info
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
        ctx.fillText(data.purposeName || "Kunjungan Resmi", 48, infoBoxY + 45);
        ctx.fillStyle = "#07936E";
        ctx.fillText(data.employeeName || "Resepsionis / Lobi", 48, infoBoxY + 85);
      }

      // 6. Draw Barcode (Code 39)
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
      ctx.fillText(`*${badgeCode}*`, width / 2, barcodeStartY + barcodeH + 20);

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

      // Trigger download
      const pngUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      const cleanName = data.name.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
      a.download = `badge-tamu-nobu-${cleanName}.png`;
      a.href = pngUrl;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      toast.success("Badge tamu berhasil diunduh dalam format PNG!");
    } catch (err) {
      console.error(err);
      toast.error("Gagal mengunduh gambar badge");
    } finally {
      setDownloading(false);
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-badge-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-border/80 bg-card p-4 sm:p-6 shadow-2xl z-10 my-auto">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-soft text-primary font-bold">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <div>
              <h2 id="modal-badge-title" className="text-base font-bold text-foreground sm:text-lg">
                Layout Badge & ID Pass Tamu
              </h2>
              <p className="text-xs text-muted-foreground">
                Siap cetak atau unduh untuk tanda pengenal pengunjung
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup modal"
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Controls: Format switch & options */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5 rounded-2xl bg-muted/40 p-2.5 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-muted-foreground">Ukuran:</span>
            <div className="inline-flex rounded-xl bg-card p-1 border border-border shadow-xs">
              <button
                type="button"
                onClick={() => setFormat("lanyard")}
                className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
                  format === "lanyard"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Lanyard (Vertikal)
              </button>
              <button
                type="button"
                onClick={() => setFormat("compact")}
                className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
                  format === "compact"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Stiker / Horizontal
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowQr(!showQr)}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 font-medium text-foreground hover:bg-brand-soft hover:text-primary transition-colors"
            >
              <QrCode className="h-3.5 w-3.5" />
              {showQr ? "Sembunyikan QR" : "Tampilkan QR"}
            </button>
            <button
              type="button"
              onClick={handleCopyCode}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 font-medium text-foreground hover:bg-brand-soft hover:text-primary transition-colors"
              title="Salin nomor pass"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-primary" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {badgeCode}
            </button>
          </div>
        </div>

        {/* Preview Container: Printable Badge Card */}
        <div className="mt-4 flex justify-center overflow-x-auto py-2">
          <div
            id="printable-visitor-badge"
            ref={badgeCardRef}
            className={`relative overflow-hidden rounded-2xl border-2 border-primary/30 bg-card text-foreground shadow-lg transition-all duration-300 print:m-0 print:border-2 print:border-black print:shadow-none ${
              format === "lanyard" ? "w-[320px] min-h-[480px]" : "w-[420px] min-h-[270px]"
            }`}
          >
            {/* Lanyard Clip Slot Punch Hole (Visual indicator for lanyard pass) */}
            {format === "lanyard" && (
              <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-20">
                <div className="h-2.5 w-12 rounded-full border border-white/60 bg-white/90 shadow-inner" />
              </div>
            )}

            {/* Header Brand Banner */}
            <div
              className={`bg-gradient-to-r from-primary to-brand px-4 text-center text-white relative ${
                format === "lanyard" ? "pt-7 pb-3" : "py-3"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <img
                  src={logo}
                  alt="Nobu Logo"
                  className="h-6 w-auto brightness-0 invert drop-shadow-sm"
                />
                <span className="font-display text-sm font-black tracking-wide uppercase">
                  Menara Nobu
                </span>
              </div>
              <p className="mt-0.5 text-[10px] font-bold tracking-widest uppercase text-white/90">
                Kartu Akses Pengunjung · Visitor Pass
              </p>
            </div>

            {/* Card Body */}
            <div className="p-4 flex flex-col justify-between">
              {/* Check-in timestamp badge */}
              <div className="flex items-center justify-between border-b border-border/70 pb-2.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-0.5 text-[10px] font-bold text-primary">
                  <Clock className="h-3 w-3" />
                  {displayTime} WIB · {displayDate}
                </span>
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                  AKTIF / HARI INI
                </span>
              </div>

              {/* Guest Primary Details */}
              <div className="text-center my-3">
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                  Nama Pengunjung
                </span>
                <h3 className="font-display text-xl sm:text-2xl font-black text-foreground mt-0.5 leading-tight">
                  {data.name}
                </h3>
                <p className="text-xs sm:text-sm font-semibold text-primary mt-1">
                  {data.institution}
                </p>
              </div>

              {/* Host & Purpose details */}
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted/40 p-2.5 text-[11px] mb-3">
                <div>
                  <span className="text-muted-foreground text-[10px] block font-medium">
                    Keperluan:
                  </span>
                  <span className="font-bold text-foreground truncate block">
                    {data.purposeName || "Kunjungan Resmi"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] block font-medium">
                    Karyawan Dituju:
                  </span>
                  <span className="font-bold text-primary truncate block">
                    {data.employeeName || "Resepsionis Lobi"}
                  </span>
                </div>
              </div>

              {/* BARCODE SECTION: Code 39 Barcode + Optional QR Code */}
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border/80 bg-white p-2.5 text-center">
                {/* SVG 1D Barcode */}
                <div className="flex-1 overflow-hidden">
                  <div className="flex justify-center items-center py-1">
                    <svg
                      viewBox={`0 0 ${barcodeWidth} 48`}
                      className="w-full h-11 max-h-12"
                      preserveAspectRatio="none"
                    >
                      {
                        barcodeElements.reduce<{ x: number; nodes: React.ReactNode[] }>(
                          (acc, el, idx) => {
                            if (el.isBar) {
                              acc.nodes.push(
                                <rect
                                  key={idx}
                                  x={acc.x}
                                  y={0}
                                  width={el.width}
                                  height={48}
                                  fill="#10241E"
                                />,
                              );
                            }
                            acc.x += el.width;
                            return acc;
                          },
                          { x: 0, nodes: [] },
                        ).nodes
                      }
                    </svg>
                  </div>
                  {/* Human-readable Barcode Text */}
                  <p className="font-mono text-[11px] font-bold tracking-wider text-neutral-900 mt-0.5">
                    *{badgeCode}*
                  </p>
                </div>

                {/* QR Code Matrix */}
                {showQr && (
                  <div className="shrink-0 pl-2 border-l border-neutral-200">
                    <svg viewBox="0 0 25 25" className="h-14 w-14">
                      {qrMatrix.map((row, r) =>
                        row.map((val, c) =>
                          val ? (
                            <rect
                              key={`${r}-${c}`}
                              x={c}
                              y={r}
                              width={1}
                              height={1}
                              fill="#10241E"
                            />
                          ) : null,
                        ),
                      )}
                    </svg>
                    <span className="block text-[8px] font-bold text-neutral-500 uppercase tracking-tighter mt-0.5">
                      SCAN VERIFIKASI
                    </span>
                  </div>
                )}
              </div>

              {/* Card Footer Notes */}
              <div className="mt-3 pt-2 border-t border-border/60 text-center text-[9px] text-muted-foreground leading-snug">
                <p className="font-semibold text-foreground/80">
                  Wajib disematkan selama berada di dalam Gedung Menara Nobu
                </p>
                <p className="mt-0.5 text-muted-foreground">
                  Kembalikan ke resepsionis lobi saat check-out · Keamanan: Ext. 101
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors active:scale-95"
          >
            Tutup
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={downloading}
              onClick={handleDownloadImage}
              className="inline-flex items-center gap-2 rounded-xl border border-primary/40 bg-brand-soft px-4 py-2.5 text-xs font-bold text-primary transition-all hover:bg-brand-soft/80 active:scale-95 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              {downloading ? "Memproses..." : "Unduh Gambar (PNG)"}
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-sm transition-all hover:brightness-110 active:scale-95"
            >
              <Printer className="h-4 w-4" />
              Cetak Badge (Print / PDF)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
