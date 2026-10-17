import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  Star,
  Clock,
  Building,
  User,
  Calendar,
  Download,
  Printer,
  Sparkles,
  Smile,
  ThumbsUp,
  RotateCcw,
  Barcode,
  Copy,
  ExternalLink,
  Pause,
  Play,
  ShieldCheck,
} from "lucide-react";
import { submitGuestFeedback } from "@/lib/supabase";
import { VisitorBadgeModal } from "@/components/VisitorBadgeModal";
import { VisitorQrCodePass } from "@/components/VisitorQrCodePass";
import { encodeCode39, formatBadgeCode } from "@/lib/barcode";
import { downloadBadgeAsPng } from "@/lib/badge-download";
import { toast } from "sonner";

export type RegistrationSuccessData = {
  id?: string;
  name: string;
  institution: string;
  phone: string;
  employeeName?: string;
  purposeName?: string;
  scheduledAt?: string;
  checkInTime: string;
  checkInDate?: string;
  badgeNumber?: string;
  fillDurationSeconds?: number;
};

interface RegistrationSuccessProps {
  data: RegistrationSuccessData;
  onReset: () => void;
}

export function RegistrationSuccess({ data, onReset }: RegistrationSuccessProps) {
  // Feedback state
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>(["⚡ Sangat Cepat", "📝 Form Jelas"]);
  const [comment, setComment] = useState("");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Countdown timer for auto-reset (starts at 30 seconds, pauses if user interacts)
  const [countdown, setCountdown] = useState(30);
  const [isPaused, setIsPaused] = useState(false);

  // Deterministic Badge Code
  const badgeCode = useMemo(() => {
    if (data.badgeNumber) return data.badgeNumber;
    return formatBadgeCode(data.id, new Date().toISOString());
  }, [data.badgeNumber, data.id]);

  // Generate SVG Code 39 Barcode Elements
  const { elements: barcodeElements, totalWidth: barcodeWidth } = useMemo(() => {
    return encodeCode39(badgeCode, 2, 5);
  }, [badgeCode]);

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

  const availableTags = [
    "⚡ Sangat Cepat",
    "📝 Form Jelas",
    "📱 Nyaman di Ponsel",
    "🛡️ Privasi Aman",
    "✨ Pelayanan Ramah",
  ];

  const ratingDescriptions: Record<number, string> = {
    1: "Perlu Banyak Perbaikan",
    2: "Cukup Lambat / Kurang Praktis",
    3: "Standar & Cukup Mudah",
    4: "Cepat & Sangat Praktis 👍",
    5: "Sangat Cepat, Mudah & Menyenangkan! 🚀",
  };

  // Timer countdown
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onReset();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isPaused, onReset]);

  // Handle direct download of barcode badge PNG
  const handleDirectDownload = async () => {
    setIsPaused(true);
    setIsDownloading(true);
    try {
      await downloadBadgeAsPng({
        name: data.name,
        institution: data.institution,
        badgeCode,
        checkInTime: displayTime,
        checkInDate: displayDate,
        purposeName: data.purposeName,
        employeeName: data.employeeName,
        format: "compact",
      });
      toast.success("Barcode visitor pass berhasil diunduh!");
    } catch {
      toast.error("Gagal mengunduh gambar barcode");
    } finally {
      setIsDownloading(false);
    }
  };

  // Handle Copy Pass Code
  const handleCopyPassCode = async () => {
    setIsPaused(true);
    try {
      await navigator.clipboard.writeText(badgeCode);
      setCopiedCode(true);
      toast.success("Kode pass berhasil disalin!");
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      toast.error("Gagal menyalin kode");
    }
  };

  // Handle feedback submission
  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingFeedback(true);
    setIsPaused(true);

    try {
      const feedbackPayload = {
        guest_name: data.name,
        institution: data.institution,
        rating,
        tags: selectedTags,
        comment: comment.trim(),
        fill_duration_seconds: data.fillDurationSeconds || 0,
        submitted_at: new Date().toISOString(),
      };

      // Store in localStorage history
      const existing = JSON.parse(localStorage.getItem("nobu_guest_feedback") || "[]");
      existing.unshift(feedbackPayload);
      localStorage.setItem("nobu_guest_feedback", JSON.stringify(existing.slice(0, 50)));

      // Call database RPC
      void submitGuestFeedback({
        guest_name: data.name,
        institution: data.institution,
        rating,
        tags: selectedTags,
        comment: comment.trim(),
        fill_duration_seconds: data.fillDurationSeconds || 0,
      });
    } catch {
      // ignore
    }

    setTimeout(() => {
      setSubmittingFeedback(false);
      setFeedbackSubmitted(true);
      setCountdown(25);
    }, 350);
  };

  const toggleTag = (tag: string) => {
    setIsPaused(true);
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const printPass = () => {
    setIsPaused(true);
    window.print();
  };

  const activeRating = hoverRating !== null ? hoverRating : rating;

  return (
    <div className="relative mx-auto w-full max-w-2xl px-3.5 sm:px-6 pt-4 pb-36 sm:pb-24">
      {/* Background Glow */}
      <div className="pointer-events-none absolute left-1/2 top-10 -translate-x-1/2 transform">
        <div className="h-64 w-64 rounded-full bg-brand/20 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-3xl border border-border/80 bg-card p-4 sm:p-8 shadow-soft"
      >
        {/* Animated Checkmark Badge */}
        <div className="relative mx-auto mb-4 flex h-20 w-20 items-center justify-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0.8 }}
            animate={{ scale: [1, 1.4, 1.6], opacity: [0.7, 0.25, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
            className="absolute inset-0 rounded-full bg-brand/30"
          />
          <motion.div
            initial={{ scale: 0.8, opacity: 0.6 }}
            animate={{ scale: [0.9, 1.25, 1.45], opacity: [0.6, 0.15, 0] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.4, ease: "easeOut" }}
            className="absolute inset-0 rounded-full bg-primary/20"
          />

          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 20, delay: 0.1 }}
            className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-primary to-brand text-primary-foreground shadow-lg shadow-brand/30"
          >
            <Check className="h-9 w-9 stroke-[3.5] text-white" />
          </motion.div>
        </div>

        {/* Header Text */}
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Registrasi Berhasil
          </span>
          <h1 className="mt-2 font-display text-2xl font-black text-foreground sm:text-3xl leading-tight">
            Selamat Datang di Menara Nobu
          </h1>
          <p className="mx-auto mt-2 max-w-md text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Terima kasih, <span className="font-semibold text-foreground">{data.name}</span>. Data
            kehadiran Anda telah tercatat dan pihak yang dituju sudah menerima notifikasi.
          </p>
        </div>

        {/* KARTU AKSES & QR CODE DIGITAL TAMU (Responsif & Siap Pindai) */}
        <section aria-label="Kartu Akses & QR Pass Tamu" className="mt-6 space-y-3">
          <VisitorQrCodePass
            id={data.id}
            name={data.name}
            institution={data.institution}
            badgeCode={badgeCode}
            checkInTime={displayTime}
            checkInDate={displayDate}
            purposeName={data.purposeName}
            employeeName={data.employeeName}
          />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1 text-center sm:text-left">
            <p className="text-[11px] text-muted-foreground">
              Butuh tanda pengenal fisik untuk dikalungkan di gedung?
            </p>
            <button
              type="button"
              onClick={() => {
                setIsPaused(true);
                setShowBadgeModal(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-brand-soft hover:text-primary transition-all active:scale-95 shadow-2xs"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Format Badge Lanyard (Print / PDF)</span>
            </button>
          </div>
        </section>

        {/* FEEDBACK SECTION: Seberapa Cepat & Mudah Pengisian? */}
        <section
          aria-label="Evaluasi Pengalaman Pengunjung"
          className="mt-6 rounded-2xl border border-brand/30 bg-gradient-to-br from-brand-soft/50 via-card to-card p-4 sm:p-6"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand/20 text-primary">
                <Smile className="h-4 w-4" />
              </span>
              <h2 className="font-display text-sm font-bold text-foreground sm:text-base truncate">
                Bagikan Pengalaman Anda
              </h2>
            </div>
            {isPaused && (
              <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                Timer Dijeda
              </span>
            )}
          </div>

          <p className="mt-1 text-xs text-muted-foreground">
            Seberapa mudah dan cepat pengisian formulir registrasi buku tamu ini?
          </p>

          <AnimatePresence mode="wait">
            {!feedbackSubmitted ? (
              <form onSubmit={handleFeedbackSubmit} className="mt-3.5 space-y-3.5">
                {/* 5-Star Rating Buttons */}
                <div className="flex flex-col items-center justify-center rounded-xl bg-card border border-border/70 p-3 sm:p-4 shadow-xs">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => {
                          setRating(star);
                          setIsPaused(true);
                        }}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(null)}
                        aria-label={`Beri nilai ${star} dari 5`}
                        className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl transition-transform active:scale-90 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <Star
                          className={`h-7 w-7 sm:h-8 sm:w-8 transition-colors ${
                            star <= activeRating
                              ? "fill-amber-400 text-amber-400 drop-shadow-xs"
                              : "text-muted-foreground/30 hover:text-amber-200"
                          }`}
                        />
                      </button>
                    ))}
                  </div>

                  <p className="mt-2 text-xs font-bold text-primary sm:text-sm text-center">
                    {ratingDescriptions[activeRating] || "Pilih Bintang"}
                  </p>
                </div>

                {/* Quick Feedback Tags */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">
                    Hal yang paling dirasakan:
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {availableTags.map((tag) => {
                      const active = selectedTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleTag(tag)}
                          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all active:scale-95 ${
                            active
                              ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                              : "border border-border bg-card text-foreground hover:bg-brand-soft"
                          }`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Optional Comment Input */}
                <div>
                  <input
                    type="text"
                    value={comment}
                    onChange={(e) => {
                      setComment(e.target.value);
                      setIsPaused(true);
                    }}
                    placeholder="Saran singkat untuk kenyamanan lobi (opsional)..."
                    className="w-full min-h-11 rounded-xl border border-input bg-card px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/70 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 sm:text-sm"
                  />
                </div>

                {/* Submit Feedback Action */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1">
                  <p className="text-[11px] text-muted-foreground">
                    Ulasan ini membantu resepsionis menyambut Anda lebih baik.
                  </p>
                  <button
                    type="submit"
                    disabled={submittingFeedback}
                    className="inline-flex min-h-11 w-full sm:w-auto items-center justify-center gap-1.5 rounded-xl bg-primary px-5 text-xs font-bold text-primary-foreground shadow-sm transition-all hover:brightness-110 active:scale-95 disabled:opacity-60"
                  >
                    {submittingFeedback ? (
                      "Menyimpan..."
                    ) : (
                      <>
                        <ThumbsUp className="h-3.5 w-3.5" />
                        Kirim Ulasan
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-3 flex items-center gap-3 rounded-xl bg-card border border-border/80 p-4 text-left shadow-xs"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-primary font-bold">
                  <Star className="h-5 w-5 fill-primary text-primary" />
                </div>
                <div>
                  <p className="font-display text-sm font-bold text-foreground">
                    Terima kasih atas ulasan Anda!
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Nilai <b>{rating} bintang</b> telah kami simpan. Semoga pertemuan Anda di Menara
                    Nobu berjalan lancar dan produktif!
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* BOTTOM ACTION CONTROLS (Tamu Baru, Cetak Struk, Countdown) */}
        <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={printPass}
              className="inline-flex min-h-11 flex-1 sm:flex-initial items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-xs font-semibold text-foreground shadow-xs transition-colors hover:bg-muted active:scale-95"
              title="Cetak struk ringkas halaman"
            >
              <Printer className="h-4 w-4 text-muted-foreground" />
              <span>Cetak Struk</span>
            </button>

            <button
              onClick={() => setIsPaused(!isPaused)}
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3 text-xs text-muted-foreground hover:bg-muted active:scale-95"
              title={isPaused ? "Lanjutkan timer otomatis" : "Jeda timer otomatis"}
            >
              {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{isPaused ? "Lanjutkan" : "Jeda"}</span>
            </button>
          </div>

          <button
            onClick={onReset}
            className="inline-flex min-h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-foreground px-6 font-display text-xs sm:text-sm font-bold text-background shadow-soft transition-all hover:bg-foreground/90 active:scale-95"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Selesai / Registrasi Baru</span>
            {!isPaused && countdown > 0 && (
              <span className="ml-1 rounded-full bg-background/20 px-2 py-0.5 text-[11px] font-mono">
                {countdown}s
              </span>
            )}
          </button>
        </div>

        {/* Countdown Progress Bar */}
        {!isPaused && countdown > 0 && (
          <div className="mt-3.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full bg-primary"
              initial={{ width: "100%" }}
              animate={{ width: `${(countdown / 30) * 100}%` }}
              transition={{ ease: "linear", duration: 1 }}
            />
          </div>
        )}
      </motion.div>

      {/* Visitor Badge Modal (Format Lanyard / Compact Stiker & Print) */}
      <VisitorBadgeModal
        open={showBadgeModal}
        onClose={() => setShowBadgeModal(false)}
        data={data}
      />
    </div>
  );
}
