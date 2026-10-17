import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  QrCode,
  Barcode as BarcodeIcon,
  Copy,
  Check,
  Download,
  Maximize2,
  X,
  Clock,
  ShieldCheck,
  Sparkles,
  Smartphone,
} from "lucide-react";
import { encodeCode39, generateQrMatrix } from "@/lib/barcode";
import { downloadBadgeAsPng } from "@/lib/badge-download";
import { getNowWibDateString, getNowWibTimeString } from "@/lib/date-utils";
import { toast } from "sonner";

export interface VisitorQrCodePassProps {
  id?: string;
  name: string;
  institution: string;
  badgeCode: string;
  checkInTime?: string;
  checkInDate?: string;
  employeeName?: string;
  purposeName?: string;
  variant?: "card" | "compact" | "standalone";
  className?: string;
}

/**
 * Komponen Khusus Penghasil QR Code & ID Registrasi Tamu
 * Dioptimalkan untuk pemindaian cepat di ponsel oleh staf lobi, resepsionis, atau turnstile gate.
 */
export function VisitorQrCodePass({
  id,
  name,
  institution,
  badgeCode,
  checkInTime,
  checkInDate,
  employeeName,
  purposeName,
  variant = "card",
  className = "",
}: VisitorQrCodePassProps) {
  const [codeType, setCodeType] = useState<"qr" | "barcode">("qr");
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const displayTime = checkInTime || getNowWibTimeString();
  const displayDate = checkInDate || getNowWibDateString();

  // Deterministic QR payload format
  const qrPayload = `MENARA-NOBU:${badgeCode}:${name}:${institution}`;
  const qrMatrix = useMemo(() => generateQrMatrix(qrPayload), [qrPayload]);

  // 1D Barcode (Code 39)
  const { elements: barcodeElements, totalWidth: barcodeWidth } = useMemo(() => {
    return encodeCode39(badgeCode, 2, 5);
  }, [badgeCode]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(badgeCode);
      setCopied(true);
      toast.success("Nomor pass berhasil disalin!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Gagal menyalin nomor pass");
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await downloadBadgeAsPng({
        name,
        institution,
        badgeCode,
        checkInTime: displayTime,
        checkInDate: displayDate,
        purposeName,
        employeeName,
        format: "compact",
      });
      toast.success("Kartu pass berhasil diunduh dalam format gambar PNG!");
    } catch (err) {
      console.error(err);
      toast.error("Gagal mengunduh gambar pass");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <>
      <div
        className={`relative overflow-hidden rounded-2xl border-2 border-primary/25 bg-gradient-to-b from-brand-soft/50 via-card to-card p-4 sm:p-5 shadow-xs transition-all ${className}`}
      >
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-2xs">
              <QrCode className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="font-display text-xs font-bold uppercase tracking-wider text-foreground truncate">
                QR Pass Tamu Digital
              </p>
              <p className="text-[10px] text-muted-foreground truncate">
                ID Unik: <span className="font-mono font-bold text-primary">{badgeCode}</span>
              </p>
            </div>
          </div>

          {/* Quick Format & View Switcher */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="inline-flex rounded-xl border border-border/80 bg-card p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => setCodeType("qr")}
                className={`rounded-lg px-2 py-1 text-[11px] font-bold transition-all ${
                  codeType === "qr"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                QR Code
              </button>
              <button
                type="button"
                onClick={() => setCodeType("barcode")}
                className={`rounded-lg px-2 py-1 text-[11px] font-bold transition-all ${
                  codeType === "barcode"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Barcode 1D
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsFullscreen(true)}
              title="Perbesar layar penuh untuk pemindaian staf"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/80 bg-card text-muted-foreground hover:bg-brand-soft hover:text-primary transition-colors active:scale-90 shadow-2xs"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Guest Summary Info */}
        <div className="mt-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Nama Pengunjung
            </span>
            <h3 className="font-display text-base sm:text-lg font-black text-foreground truncate">
              {name}
            </h3>
            <p className="text-xs font-semibold text-primary truncate">{institution}</p>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1 shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Kode Akses
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1 text-xs font-mono font-bold text-foreground hover:bg-brand-soft hover:text-primary transition-all active:scale-95 shadow-2xs"
            >
              {copied ? (
                <Check className="h-3 w-3 text-primary" />
              ) : (
                <Copy className="h-3 w-3 text-muted-foreground" />
              )}
              <span>{badgeCode}</span>
            </button>
          </div>
        </div>

        {/* Host & Purpose Badge */}
        {(purposeName || employeeName) && (
          <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-card border border-border/70 p-2 text-xs">
            <div className="min-w-0">
              <span className="text-[10px] font-medium text-muted-foreground block">
                Keperluan:
              </span>
              <span className="font-bold text-foreground truncate block">
                {purposeName || "Kunjungan Resmi"}
              </span>
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-medium text-muted-foreground block">
                Staf Dituju:
              </span>
              <span className="font-bold text-primary truncate block">
                {employeeName || "Resepsionis Lobi"}
              </span>
            </div>
          </div>
        )}

        {/* SCANNABLE CODE DISPLAY (QR or Barcode) */}
        <div className="mt-3.5 rounded-xl border border-border/80 bg-white p-3.5 text-center shadow-xs">
          {codeType === "qr" ? (
            <div className="flex flex-col items-center justify-center">
              <div className="p-2 rounded-xl bg-white border border-neutral-100 shadow-2xs">
                <svg viewBox="0 0 25 25" className="h-36 w-36 xs:h-40 xs:w-40 sm:h-44 sm:w-44">
                  {qrMatrix.map((row, r) =>
                    row.map((val, c) =>
                      val ? (
                        <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill="#10241E" />
                      ) : null,
                    ),
                  )}
                </svg>
              </div>
              <p className="mt-2 text-[11px] font-semibold text-neutral-600 flex items-center justify-center gap-1.5">
                <Smartphone className="h-3.5 w-3.5 text-emerald-600" />
                <span>Arahkan ke pemindai lobi / resepsionis</span>
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-1">
              <div className="w-full flex justify-center items-center overflow-x-hidden">
                <svg
                  viewBox={`0 0 ${barcodeWidth} 44`}
                  className="w-full max-w-[280px] sm:max-w-[340px] h-10 max-h-12"
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
                              height={44}
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
              <p className="font-mono text-xs font-bold text-neutral-900 mt-1">*{badgeCode}*</p>
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/60">
          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
            <Clock className="h-3 w-3 text-primary" />
            Check-In: {displayTime} WIB · {displayDate}
          </span>

          <button
            type="button"
            disabled={isDownloading}
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-card px-3 py-1.5 text-xs font-bold text-primary hover:bg-brand-soft transition-all active:scale-95 disabled:opacity-50 ml-auto shadow-2xs"
          >
            <Download className="h-3.5 w-3.5" />
            <span>{isDownloading ? "Menyimpan..." : "Simpan Gambar Pass"}</span>
          </button>
        </div>
      </div>

      {/* FULLSCREEN POPUP MODE (Untuk scanner lobi tanpa gangguan pantulan cahaya) */}
      {isFullscreen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Tampilan Penuh QR Pass Tamu"
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-in fade-in duration-200"
            onClick={() => setIsFullscreen(false)}
          >
            <div
              className="relative w-full max-w-sm rounded-3xl bg-white p-6 text-center text-neutral-900 shadow-2xl animate-in zoom-in-95"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 mb-2">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Kartu Akses Menara Nobu</span>
              </div>

              <h3 className="font-display text-xl font-black text-neutral-900">{name}</h3>
              <p className="text-xs font-semibold text-emerald-700">{institution}</p>

              <div className="my-4 mx-auto w-56 h-56 flex items-center justify-center p-3 rounded-2xl bg-white border-2 border-emerald-500 shadow-md">
                <svg viewBox="0 0 25 25" className="h-full w-full">
                  {qrMatrix.map((row, r) =>
                    row.map((val, c) =>
                      val ? (
                        <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill="#10241E" />
                      ) : null,
                    ),
                  )}
                </svg>
              </div>

              <p className="font-mono text-sm font-bold text-neutral-900">*{badgeCode}*</p>
              <p className="mt-1 text-xs text-neutral-500">
                Tunjukkan layar ini langsung ke pemindai lobi / resepsionis
              </p>

              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="mt-4 w-full rounded-xl bg-neutral-900 py-2.5 text-xs font-bold text-white transition-all hover:bg-neutral-800 active:scale-95"
              >
                Tutup Tampilan Penuh
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
