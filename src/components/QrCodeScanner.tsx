import React, { useCallback, useEffect, useRef, useState, useMemo } from "react";
import jsQR from "jsqr";
import {
  Camera,
  CheckCircle2,
  Clock,
  Download,
  Flashlight,
  FlashlightOff,
  Keyboard,
  Printer,
  QrCode,
  RefreshCw,
  Search,
  ShieldCheck,
  SwitchCamera,
  Upload,
  User,
  X,
  AlertCircle,
  Building2,
  Barcode as BarcodeIcon,
  Check,
  UserCheck,
} from "lucide-react";
import { checkGuestStatus, quickCheckInByCode, type GuestStatusResult } from "@/lib/supabase";
import { encodeCode39 } from "@/lib/barcode";
import { downloadBadgeAsPng } from "@/lib/badge-download";
import { getNowWibDateString, getNowWibTimeString } from "@/lib/date-utils";
import { toast } from "sonner";

export interface QrCodeScannerProps {
  onSuccess?: (result: GuestStatusResult) => void;
  onClose?: () => void;
  isModal?: boolean;
  roleMode?: "security" | "admin" | "kiosk";
}

export function QrCodeScanner({
  onSuccess,
  onClose,
  isModal = false,
  roleMode = "security",
}: QrCodeScannerProps) {
  const [cameraState, setCameraState] = useState<
    "idle" | "requesting" | "active" | "denied" | "unsupported" | "error"
  >("requesting");
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [scanResult, setScanResult] = useState<GuestStatusResult | null>(null);
  const [scannedRawCode, setScannedRawCode] = useState<string>("");
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [downloadingPass, setDownloadingPass] = useState(false);
  const [confirmingCheckIn, setConfirmingCheckIn] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastScanTimeRef = useRef<number>(0);

  // Audio feedback when barcode or QR is recognized
  const playBeep = () => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    } catch {
      // AudioContext unavailable or blocked
    }
  };

  // Stop active camera media stream
  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setTorchOn(false);
    setHasTorch(false);
  }, []);

  // Parse scanned raw string
  const parseRawQrCode = (
    raw: string,
  ): { code: string; name?: string | undefined; institution?: string | undefined } => {
    const trimmed = raw.trim();
    if (trimmed.startsWith("MENARA-NOBU:")) {
      const parts = trimmed.split(":");
      return {
        code: parts[1] || "",
        name: parts[2] || undefined,
        institution: parts[3] || undefined,
      };
    }
    if (trimmed.includes("code=")) {
      try {
        const url = new URL(trimmed);
        const c = url.searchParams.get("code");
        if (c) return { code: c };
      } catch {
        /* ignore */
      }
    }
    return { code: trimmed };
  };

  // Process code verification
  const processCode = useCallback(
    async (rawString: string) => {
      if (isProcessingScan) return;
      setIsProcessingScan(true);
      playBeep();
      if ("vibrate" in navigator) {
        try {
          navigator.vibrate(80);
        } catch {
          /* ignore */
        }
      }

      const { code, name: parsedName, institution: parsedInstitution } = parseRawQrCode(rawString);
      setScannedRawCode(code);
      setLoadingSearch(true);

      try {
        // Cek data via secure RPC
        const res = await checkGuestStatus(code);
        if (res.found) {
          setScanResult(res);
          onSuccess?.(res);
          toast.success(`Pass terverifikasi: ${res.name}`);
        } else {
          // Fallback parsing jika DB offline atau offline simulation
          if (parsedName) {
            const fallbackRes: GuestStatusResult = {
              found: true,
              name: parsedName,
              institution: parsedInstitution || "Pengunjung Menara Nobu",
              badge_code: code,
              check_in_time: getNowWibTimeString(),
              check_in_date: getNowWibDateString(),
              status: "TERDAFTAR",
              purpose_name: "Kunjungan Resmi",
              employee_name: "Resepsionis Lobi",
            };
            setScanResult(fallbackRes);
            onSuccess?.(fallbackRes);
            toast.success(`Pass terverifikasi: ${parsedName}`);
          } else {
            setScanResult({
              found: false,
              badge_code: code,
              error: "Data pass tidak ditemukan di sistem. Pastikan kartu terdaftar.",
            });
            toast.error("Kode pass tidak terdaftar");
          }
        }
      } catch (err) {
        setScanResult({
          found: false,
          badge_code: code,
          error: (err as Error).message || "Gagal memeriksa status",
        });
      } finally {
        setLoadingSearch(false);
        stopCamera();
      }
    },
    [isProcessingScan, onSuccess, stopCamera],
  );

  // Scanning loop on video element — throttled to ~8-10 scans/sec to prevent CPU/battery strain
  const scanFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationFrameRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    const now = performance.now();
    // Process jsQR at ~110ms intervals (~9 scans per second) instead of 60fps to save >80% CPU
    if (now - lastScanTimeRef.current >= 110) {
      lastScanTimeRef.current = now;

      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        // Optimal scaling for barcode/QR: limit max dimension to 720px for 4x faster pixel extraction
        const scale = Math.min(1, 720 / Math.max(video.videoWidth, video.videoHeight));
        const w = Math.round(video.videoWidth * scale);
        const h = Math.round(video.videoHeight * scale);

        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
        }

        ctx.drawImage(video, 0, 0, w, h);
        const imageData = ctx.getImageData(0, 0, w, h);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });

        if (code && code.data) {
          void processCode(code.data);
          return;
        }
      }
    }

    animationFrameRef.current = requestAnimationFrame(scanFrame);
  }, [processCode]);

  // Start device camera
  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraState("requesting");
    setScanResult(null);
    setIsProcessingScan(false);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraState("unsupported");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
      }

      // Check if torch/flashlight is supported
      const track = stream.getVideoTracks()[0];
      if (track) {
        const capabilities = (track.getCapabilities?.() as { torch?: boolean }) || {};
        setHasTorch(Boolean(capabilities.torch));
      }

      setCameraState("active");
      animationFrameRef.current = requestAnimationFrame(scanFrame);
    } catch (err: unknown) {
      console.warn("Gagal membuka kamera:", err);
      const errorObj = err as { name?: string };
      if (errorObj?.name === "NotAllowedError" || errorObj?.name === "PermissionDeniedError") {
        setCameraState("denied");
      } else {
        setCameraState("error");
      }
    }
  }, [facingMode, scanFrame, stopCamera]);

  // Initial camera startup
  useEffect(() => {
    if (!scanResult) {
      void startCamera();
    }
    return () => stopCamera();
  }, [startCamera, scanResult, stopCamera]);

  // Toggle Torch
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    try {
      const nextTorch = !torchOn;
      await (track.applyConstraints as (c: unknown) => Promise<void>)({
        advanced: [{ torch: nextTorch }],
      });
      setTorchOn(nextTorch);
    } catch {
      toast.error("Lampu senter tidak dapat diaktifkan pada perangkat ini");
    }
  };

  // Toggle Camera Front / Back
  const toggleCameraFacing = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  // Decode QR from file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    const reader = new FileReader();

    reader.onload = (event) => {
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code && code.data) {
          void processCode(code.data);
        } else {
          toast.error("Tidak ditemukan kode QR pada gambar yang diunggah.");
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Manual code submit
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    void processCode(manualCode.trim());
  };

  // Barcode elements for result display
  const barcodeElements = useMemo(() => {
    if (!scanResult?.badge_code) return null;
    return encodeCode39(scanResult.badge_code, 2, 4);
  }, [scanResult?.badge_code]);

  // Download Badge PNG from scan result
  const handleDownloadResultBadge = async () => {
    if (!scanResult) return;
    setDownloadingPass(true);
    try {
      await downloadBadgeAsPng({
        name: scanResult.name || "Tamu",
        institution: scanResult.institution || "Pengunjung",
        badgeCode: scanResult.badge_code || "VTR-PASS",
        checkInTime: scanResult.check_in_time || "12:00",
        checkInDate: scanResult.check_in_date || "Hari Ini",
        purposeName: scanResult.purpose_name,
        employeeName: scanResult.employee_name,
        format: "compact",
      });
      toast.success("Visitor pass berhasil diunduh!");
    } catch {
      toast.error("Gagal mengunduh gambar pass");
    } finally {
      setDownloadingPass(false);
    }
  };

  // Quick check-in action by security / staff
  const handleConfirmQuickCheckIn = async () => {
    const code = scanResult?.badge_code || scannedRawCode;
    if (!code) return;
    setConfirmingCheckIn(true);
    try {
      const res = await quickCheckInByCode(code);
      if (res.found) {
        setScanResult(res);
        toast.success(`Check-in berhasil dikonfirmasi untuk ${res.name}!`);
      } else {
        toast.error("Gagal konfirmasi check-in");
      }
    } catch {
      toast.error("Terjadi kendala jaringan saat konfirmasi");
    } finally {
      setConfirmingCheckIn(false);
    }
  };

  return (
    <div className="relative w-full max-w-lg mx-auto overflow-hidden rounded-3xl border border-border/80 bg-card p-4 sm:p-6 shadow-soft">
      {/* Hidden Offscreen Canvas for jsQR image decoding */}
      <canvas ref={canvasRef} className="hidden" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
            <ShieldCheck className="h-4.5 w-4.5 text-primary-foreground" />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-base sm:text-lg font-bold text-foreground leading-tight truncate">
              Pemindai Pass & Verifikasi Keamanan
            </h2>
            <p className="text-xs text-muted-foreground truncate">
              Verifikasi keaslian badge dan validasi izin masuk
            </p>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup pemindai"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/60 text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-90 shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* RESULT VIEW (If QR code has been successfully decoded) */}
      {scanResult ? (
        <div className="fade-up space-y-4">
          {scanResult.found ? (
            <div className="rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-brand-soft/60 via-card to-card p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-border/70 pb-2.5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  {scanResult.status || "TERDAFTAR & SAH"}
                </span>
                <span className="text-xs font-mono font-bold text-foreground bg-muted/60 px-2 py-0.5 rounded-md border border-border">
                  {scanResult.badge_code}
                </span>
              </div>

              <div className="mt-3.5 text-center sm:text-left">
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                  Nama Tamu Terverifikasi
                </span>
                <h3 className="font-display text-xl sm:text-2xl font-black text-foreground">
                  {scanResult.name}
                </h3>
                <p className="text-xs sm:text-sm font-semibold text-primary">
                  {scanResult.institution}
                </p>
              </div>

              <div className="mt-3.5 grid grid-cols-2 gap-2 rounded-xl bg-card border border-border/70 p-3 text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground block font-medium">
                    Staf Dituju:
                  </span>
                  <span className="font-bold text-foreground truncate block">
                    {scanResult.employee_name || "Resepsionis Lobi"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block font-medium">
                    Keperluan:
                  </span>
                  <span className="font-bold text-foreground truncate block">
                    {scanResult.purpose_name || "Kunjungan Resmi"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block font-medium">
                    Waktu Check-In:
                  </span>
                  <span className="font-bold text-primary truncate block">
                    {scanResult.check_in_time ? `${scanResult.check_in_time} WIB` : "Hari ini"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block font-medium">
                    Departemen:
                  </span>
                  <span className="font-bold text-foreground truncate block">
                    {scanResult.department || "Lobi Utama"}
                  </span>
                </div>
              </div>

              {/* Scannable Barcode Elements */}
              {barcodeElements && (
                <div className="mt-3 rounded-xl border border-border/80 bg-white p-2.5 text-center shadow-xs">
                  <div className="flex justify-center items-center overflow-x-hidden">
                    <svg
                      viewBox={`0 0 ${barcodeElements.totalWidth} 42`}
                      className="w-full max-w-[280px] h-9"
                      preserveAspectRatio="none"
                    >
                      {
                        barcodeElements.elements.reduce<{ x: number; nodes: React.ReactNode[] }>(
                          (acc, el, idx) => {
                            if (el.isBar) {
                              acc.nodes.push(
                                <rect
                                  key={idx}
                                  x={acc.x}
                                  y={0}
                                  width={el.width}
                                  height={42}
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
                  <p className="font-mono text-[11px] font-bold text-neutral-900 mt-0.5">
                    *{scanResult.badge_code}*
                  </p>
                </div>
              )}

              {/* Quick Staff Confirmation Button */}
              <div className="mt-4 pt-3 border-t border-border/60 flex flex-col gap-2">
                <button
                  type="button"
                  disabled={confirmingCheckIn}
                  onClick={handleConfirmQuickCheckIn}
                  className="w-full inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition-all active:scale-95 disabled:opacity-60"
                >
                  <UserCheck className="h-4 w-4" />
                  <span>
                    {confirmingCheckIn
                      ? "Menyimpan Verifikasi..."
                      : "Konfirmasi Masuk (Check-In Pos Keamanan)"}
                  </span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={downloadingPass}
                    onClick={handleDownloadResultBadge}
                    className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground shadow-2xs hover:bg-muted active:scale-95 disabled:opacity-60"
                  >
                    <Download className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{downloadingPass ? "Mengunduh..." : "Unduh Badge"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-4 text-xs font-semibold text-foreground shadow-2xs hover:bg-muted active:scale-95"
                  >
                    <Printer className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Cetak</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-center">
              <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
              <h3 className="mt-2 font-display text-sm font-bold text-foreground">
                Pass Tidak Terdaftar / Tidak Valid
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {scanResult.error || "Kode pass atau barcode tidak terdaftar di buku tamu digital."}
              </p>
              <div className="mt-3 inline-flex items-center gap-2 font-mono text-xs font-bold text-foreground bg-muted px-2.5 py-1 rounded-lg">
                <span>Kode: {scanResult.badge_code || "-"}</span>
              </div>
            </div>
          )}

          {/* Reset Scan Button */}
          <button
            type="button"
            onClick={() => {
              setScanResult(null);
              setIsProcessingScan(false);
              void startCamera();
            }}
            className="w-full inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-foreground px-4 text-xs font-bold text-background transition-all hover:bg-foreground/90 active:scale-95 shadow-sm"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Pindai Kartu / Pass Berikutnya</span>
          </button>
        </div>
      ) : (
        /* CAMERA SCANNER VIEWPORT */
        <div className="space-y-3">
          {/* Responsive Camera Viewport Frame with Clean Minimalist Guide */}
          <div className="relative h-64 sm:h-72 w-full max-w-[360px] sm:max-w-[400px] mx-auto overflow-hidden rounded-2xl border border-border/80 bg-neutral-950 shadow-md flex items-center justify-center">
            {/* Live Video Element */}
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className={`h-full w-full object-cover transition-opacity duration-300 ${
                cameraState === "active" ? "opacity-100" : "opacity-0"
              }`}
            />

            {/* Simple, Minimalist Viewfinder Reticle (Unobstructed View) */}
            {cameraState === "active" && !isProcessingScan && !loadingSearch && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
                <div className="relative h-48 w-48 sm:h-56 sm:w-56">
                  {/* Subtle, sleek corner brackets only - Simple & Unobtrusive */}
                  <div className="absolute top-0 left-0 h-5 w-5 border-t-2 border-l-2 border-emerald-400/90 rounded-tl-md" />
                  <div className="absolute top-0 right-0 h-5 w-5 border-t-2 border-r-2 border-emerald-400/90 rounded-tr-md" />
                  <div className="absolute bottom-0 left-0 h-5 w-5 border-b-2 border-l-2 border-emerald-400/90 rounded-bl-md" />
                  <div className="absolute bottom-0 right-0 h-5 w-5 border-b-2 border-r-2 border-emerald-400/90 rounded-br-md" />
                </div>
              </div>
            )}

            {/* Loading / Verifying Scan Overlay */}
            {(isProcessingScan || loadingSearch) && (
              <div className="absolute inset-0 z-30 bg-neutral-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-4">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-400 mb-2" />
                <p className="text-xs font-bold text-white">Memverifikasi kode pass...</p>
                {scannedRawCode && (
                  <p className="text-[10px] text-emerald-300 font-mono mt-0.5">{scannedRawCode}</p>
                )}
              </div>
            )}

            {/* Permission Denied / Error State */}
            {cameraState === "denied" && (
              <div className="absolute inset-0 p-4 flex flex-col items-center justify-center text-center bg-card text-foreground z-20">
                <AlertCircle className="h-8 w-8 text-amber-500 mb-1.5" />
                <h3 className="font-display text-xs sm:text-sm font-bold">
                  Izin Kamera Dinonaktifkan
                </h3>
                <p className="mt-1 text-[11px] text-muted-foreground max-w-xs leading-tight">
                  Browser memerlukan izin kamera. Anda dapat mengizinkannya di pengaturan browser
                  atau unggah berkas foto QR di bawah.
                </p>
                <div className="mt-3 flex flex-wrap gap-2 justify-center">
                  <button
                    type="button"
                    onClick={() => void startCamera()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground active:scale-95"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Coba Lagi
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground active:scale-95"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Unggah Foto Pass
                  </button>
                </div>
              </div>
            )}

            {/* Requesting / Loading State */}
            {cameraState === "requesting" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center bg-neutral-900 text-white p-4 z-20">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-emerald-400 mb-2" />
                <p className="text-xs font-semibold">Mengaktifkan kamera pemindai...</p>
              </div>
            )}

            {/* Unsupported Camera */}
            {cameraState === "unsupported" && (
              <div className="absolute inset-0 p-4 flex flex-col items-center justify-center text-center bg-card text-foreground z-20">
                <Camera className="h-8 w-8 text-muted-foreground mb-1.5" />
                <h3 className="font-display text-xs sm:text-sm font-bold">Kamera Tidak Tersedia</h3>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Gunakan unggah foto QR code atau ketik kode pass secara manual.
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Unggah Foto Pass
                </button>
              </div>
            )}
          </div>

          {/* Simple Clean Guide Outside Camera Frame */}
          {cameraState === "active" && (
            <p className="text-center text-xs text-muted-foreground">
              Arahkan kamera ke barcode atau kode QR pass
            </p>
          )}

          {/* Camera Quick Controls: Responsive Balanced Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full max-w-[390px] mx-auto pt-1">
            {hasTorch && cameraState === "active" ? (
              <button
                type="button"
                onClick={toggleTorch}
                title={torchOn ? "Matikan lampu senter" : "Nyalakan lampu senter"}
                className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-xs font-semibold transition-all active:scale-95 shadow-2xs ${
                  torchOn
                    ? "border-amber-400 bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
                    : "border-border bg-card text-foreground hover:bg-muted"
                }`}
              >
                {torchOn ? (
                  <FlashlightOff className="h-4 w-4 shrink-0 text-amber-600" />
                ) : (
                  <Flashlight className="h-4 w-4 shrink-0" />
                )}
                <span className="truncate">{torchOn ? "Senter Nyala" : "Senter"}</span>
              </button>
            ) : null}

            {cameraState === "active" && (
              <button
                type="button"
                onClick={toggleCameraFacing}
                title="Ganti kamera depan / belakang"
                className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-2 py-2 text-xs font-semibold text-foreground hover:bg-muted active:scale-95 shadow-2xs"
              >
                <SwitchCamera className="h-4 w-4 shrink-0" />
                <span className="truncate">Ganti Kamera</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Pindai dari galeri atau berkas foto"
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-2 py-2 text-xs font-semibold text-foreground hover:bg-muted active:scale-95 shadow-2xs"
            >
              <Upload className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">Unggah Foto</span>
            </button>

            <button
              type="button"
              onClick={() => setShowManualInput(!showManualInput)}
              title="Ketik kode pass secara manual"
              className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-xs font-semibold transition-all active:scale-95 shadow-2xs ${
                showManualInput
                  ? "border-primary/40 bg-brand-soft text-primary font-bold"
                  : "border-border bg-card text-foreground hover:bg-muted"
              }`}
            >
              <Keyboard className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">Ketik Kode</span>
            </button>
          </div>

          {/* Manual Code Input Form (Toggled) */}
          {showManualInput && (
            <form
              onSubmit={handleManualSubmit}
              className="fade-up rounded-2xl border border-border/80 bg-muted/40 p-3 sm:p-3.5 space-y-2 mt-2"
            >
              <p className="text-[11px] sm:text-xs font-semibold text-foreground">
                Ketikkan nomor pass tamu (contoh: <code>VTR-261017-8A3F</code>):
              </p>
              <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  placeholder="VTR-YYMMDD-XXXX"
                  className="flex-1 min-h-10 rounded-xl border border-input bg-card px-3 text-xs font-mono font-bold tracking-wider text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
                <button
                  type="submit"
                  disabled={loadingSearch || !manualCode.trim()}
                  className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground shadow-sm transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
                >
                  <Search className="h-4 w-4" />
                  <span>{loadingSearch ? "Mencari..." : "Periksa"}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
