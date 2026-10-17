import React, { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Printer,
  Download,
  X,
  Clock,
  ShieldCheck,
  QrCode,
  Check,
  Copy,
  Calendar,
  Building2,
  User,
} from "lucide-react";
import logo from "@/assets/logo.png";
import { encodeCode39, formatBadgeCode, generateQrMatrix } from "@/lib/barcode";
import { toast } from "sonner";
import { downloadBadgeAsPng } from "@/lib/badge-download";

import { type VisitorBadgeData } from "@/lib/badge-utils";
export type { VisitorBadgeData };

interface VisitorBadgeModalProps {
  open: boolean;
  onClose: () => void;
  data: VisitorBadgeData;
}

export const VisitorBadgeModal = React.memo(function VisitorBadgeModal({
  open,
  onClose,
  data,
}: VisitorBadgeModalProps) {
  const [mounted, setMounted] = useState(false);
  const [format, setFormat] = useState<"lanyard" | "compact">("lanyard");
  const [showQr, setShowQr] = useState<boolean>(true);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const badgeCardRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset scroll to top when modal opens
  useEffect(() => {
    if (open && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [open]);

  // Generate deterministic pass code only when modal is open
  const badgeCode = useMemo(() => {
    if (!open) return "";
    if (data.badgeNumber) return data.badgeNumber;
    return formatBadgeCode(data.id, new Date().toISOString());
  }, [open, data.badgeNumber, data.id]);

  // Generate barcode elements only when modal is open
  const { elements: barcodeElements, totalWidth: barcodeWidth } = useMemo(() => {
    if (!open || !badgeCode) return { elements: [], totalWidth: 0 };
    return encodeCode39(badgeCode, 2, 5);
  }, [open, badgeCode]);

  // Generate QR matrix only when modal is open
  const qrMatrix = useMemo(() => {
    if (!open || !badgeCode) return [];
    return generateQrMatrix(`MENARA-NOBU:${badgeCode}:${data.name}:${data.institution}`);
  }, [open, badgeCode, data.name, data.institution]);

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

  // Handle ESC key to close modal
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // Lock body scroll safely without losing scroll position on mobile
  useEffect(() => {
    if (!open) return;
    const scrollY = window.scrollY || window.pageYOffset;
    const originalPosition = document.body.style.position;
    const originalTop = document.body.style.top;
    const originalWidth = document.body.style.width;
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;

    // Check if scrollbar exists to prevent layout shift
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.position = originalPosition;
      document.body.style.top = originalTop;
      document.body.style.width = originalWidth;
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  // Handle Copy Badge Code
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(badgeCode);
      setCopied(true);
      toast.success("Nomor pass berhasil disalin ke clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Gagal menyalin nomor pass");
    }
  };

  // Handle Direct Print with clean page setup
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // Handle Download as PNG Image via canvas
  const handleDownloadImage = async () => {
    setDownloading(true);
    try {
      await downloadBadgeAsPng({
        name: data.name,
        institution: data.institution,
        badgeCode,
        checkInTime: displayTime,
        checkInDate: displayDate,
        purposeName: data.purposeName,
        employeeName: data.employeeName,
        format,
      });
      toast.success("Visitor pass berhasil diunduh sebagai gambar PNG!");
    } catch (err) {
      console.error(err);
      toast.error("Gagal mengunduh gambar badge");
    } finally {
      setDownloading(false);
    }
  };

  if (!open || !mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-badge-title"
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto overscroll-contain bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Print-specific style override: hide all ambient UI during print */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-visitor-badge,
          #printable-visitor-badge * {
            visibility: visible !important;
          }
          #printable-visitor-badge {
            position: fixed !important;
            left: 50% !important;
            top: 50% !important;
            transform: translate(-50%, -50%) !important;
            width: 320px !important;
            max-width: 100% !important;
            box-shadow: none !important;
            border: 2px solid #000 !important;
            border-radius: 12px !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
        }
      `}</style>

      {/* Modal Dialog: Properly centered with safe margins preventing navbar and bottom nav overlap */}
      <div
        className="relative w-full max-w-lg sm:max-w-xl max-h-[calc(100dvh-2.5rem)] sm:max-h-[92dvh] flex flex-col rounded-2xl sm:rounded-3xl border border-border/80 bg-card shadow-2xl z-10 overflow-hidden my-auto animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header Bar */}
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3 sm:px-6 sm:py-3.5 shrink-0 bg-card">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-primary font-bold shadow-xs">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2
                id="modal-badge-title"
                className="font-display text-base font-bold text-foreground sm:text-lg leading-tight truncate"
              >
                Kartu Akses & Badge Tamu
              </h2>
              <p className="text-xs text-muted-foreground truncate">
                Tanda pengenal resmi pengunjung Menara Nobu
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            type="button"
            aria-label="Tutup jendela badge"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-muted/60 text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Toolbar / Options: Layout format selector & copy pass button */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 bg-muted/30 px-3.5 py-2 sm:px-6 sm:py-2.5 text-xs shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-muted-foreground text-[11px] sm:text-xs">
              Format:
            </span>
            <div className="inline-flex rounded-xl border border-border/80 bg-card p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => setFormat("lanyard")}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                  format === "lanyard"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Lanyard
              </button>
              <button
                type="button"
                onClick={() => setFormat("compact")}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                  format === "compact"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Stiker
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            <button
              type="button"
              onClick={() => setShowQr(!showQr)}
              className="inline-flex items-center gap-1 rounded-xl border border-border/80 bg-card px-2.5 py-1 font-medium text-foreground hover:bg-brand-soft hover:text-primary transition-colors active:scale-95 shadow-2xs text-[11px] sm:text-xs"
            >
              <QrCode className="h-3.5 w-3.5" />
              <span>{showQr ? "Sembunyikan QR" : "Tampilkan QR"}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyCode}
              title="Salin nomor pass pengunjung"
              className="inline-flex items-center gap-1 rounded-xl border border-border/80 bg-card px-2.5 py-1 font-mono font-bold text-foreground hover:bg-brand-soft hover:text-primary transition-colors active:scale-95 shadow-2xs text-[11px] sm:text-xs"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-primary" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              <span>{badgeCode}</span>
            </button>
          </div>
        </div>

        {/* Scrollable Preview Area */}
        <div
          ref={scrollContainerRef}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-4 sm:px-6 sm:py-6 flex justify-center items-start"
        >
          <div
            id="printable-visitor-badge"
            ref={badgeCardRef}
            className={`relative overflow-hidden rounded-2xl border-2 border-primary/40 bg-card text-foreground shadow-lg transition-all duration-200 select-none ${
              format === "lanyard"
                ? "w-full max-w-[280px] xs:max-w-[310px] sm:max-w-[330px]"
                : "w-full max-w-[320px] xs:max-w-[360px] sm:max-w-[420px]"
            }`}
          >
            {/* Lanyard punch hole indicator */}
            {format === "lanyard" && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20">
                <div className="h-2 w-10 rounded-full border border-white/60 bg-white/90 shadow-inner" />
              </div>
            )}

            {/* Header Brand Banner */}
            <div
              className={`bg-gradient-to-r from-primary to-brand px-4 text-center text-white relative ${
                format === "lanyard" ? "pt-6 pb-3" : "py-3"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <img
                  src={logo}
                  alt="Nobu Logo"
                  className="h-5 w-auto brightness-0 invert drop-shadow-xs"
                />
                <span className="font-display text-sm font-black tracking-wide uppercase">
                  Menara Nobu
                </span>
              </div>
              <p className="mt-0.5 text-[9px] font-bold tracking-widest uppercase text-white/95">
                Kartu Akses Pengunjung · Visitor Pass
              </p>
            </div>

            {/* Card Body */}
            <div className="p-3.5 sm:p-4 flex flex-col justify-between">
              {/* Check-in timestamp badge */}
              <div className="flex items-center justify-between border-b border-border/70 pb-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-bold text-primary">
                  <Clock className="h-3 w-3" />
                  {displayTime} WIB · {displayDate}
                </span>
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                  AKTIF HARI INI
                </span>
              </div>

              {/* Guest Primary Details */}
              <div className="text-center my-3">
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
                  Nama Pengunjung
                </span>
                <h3 className="font-display text-lg sm:text-xl font-black text-foreground mt-0.5 leading-tight break-words">
                  {data.name}
                </h3>
                <p className="text-xs sm:text-sm font-semibold text-primary mt-1 break-words">
                  {data.institution}
                </p>
              </div>

              {/* Host & Purpose details */}
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted/40 p-2.5 text-[11px] mb-3 border border-border/60">
                <div className="min-w-0">
                  <span className="text-muted-foreground text-[10px] block font-medium">
                    Keperluan:
                  </span>
                  <span className="font-bold text-foreground truncate block">
                    {data.purposeName || "Kunjungan Resmi"}
                  </span>
                </div>
                <div className="min-w-0">
                  <span className="text-muted-foreground text-[10px] block font-medium">
                    Staf Dituju:
                  </span>
                  <span className="font-bold text-primary truncate block">
                    {data.employeeName || "Resepsionis Lobi"}
                  </span>
                </div>
              </div>

              {/* BARCODE SECTION: Code 39 Barcode + Optional QR Code */}
              <div className="flex items-center justify-between gap-2.5 rounded-xl border border-border/80 bg-white p-2 text-center">
                {/* SVG 1D Barcode */}
                <div className="flex-1 overflow-hidden min-w-0">
                  <div className="flex justify-center items-center py-1">
                    <svg
                      viewBox={`0 0 ${barcodeWidth} 44`}
                      className="w-full h-10 max-h-11"
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
                  <p className="font-mono text-[10px] sm:text-[11px] font-bold tracking-wider text-neutral-900 mt-0.5 truncate">
                    *{badgeCode}*
                  </p>
                </div>

                {/* QR Code Matrix */}
                {showQr && (
                  <div className="shrink-0 pl-2 border-l border-neutral-200">
                    <svg viewBox="0 0 25 25" className="h-12 w-12 sm:h-14 sm:w-14">
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
                      SCAN PASS
                    </span>
                  </div>
                )}
              </div>

              {/* Card Security Rules Footer */}
              <div className="mt-3 pt-2 border-t border-border/60 text-center text-[9px] text-muted-foreground leading-snug">
                <p className="font-semibold text-foreground/80">
                  Wajib dikenakan selama berada di area perkantoran Menara Nobu
                </p>
                <p className="mt-0.5 text-muted-foreground">
                  Kembalikan ke resepsionis lobi saat check-out · Keamanan Gedung Ext. 101
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Action Controls */}
        <div className="border-t border-border/60 bg-card px-4 py-3 sm:px-6 sm:py-3.5 flex flex-col-reverse sm:flex-row items-stretch sm:items-center sm:justify-between gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto rounded-xl border border-border px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors active:scale-95 text-center min-h-10"
          >
            Tutup
          </button>

          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
            <button
              type="button"
              disabled={downloading}
              onClick={handleDownloadImage}
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-primary/40 bg-brand-soft px-3 sm:px-4 py-2 text-xs font-bold text-primary transition-all hover:bg-brand-soft/80 active:scale-95 disabled:opacity-50"
            >
              <Download className="h-4 w-4 shrink-0" />
              <span>{downloading ? "Mengunduh…" : "Unduh PNG"}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 sm:px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm transition-all hover:brightness-110 active:scale-95"
            >
              <Printer className="h-4 w-4 shrink-0" />
              <span>Cetak (Print)</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
});
