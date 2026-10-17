import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  Star,
  Clock,
  Building,
  User,
  Calendar,
  Share2,
  Printer,
  Sparkles,
  ChevronRight,
  Smile,
  ThumbsUp,
  RotateCcw,
  MessageSquare,
  Barcode,
} from "lucide-react";
import { submitGuestFeedback } from "@/lib/supabase";
import { VisitorBadgeModal } from "@/components/VisitorBadgeModal";

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

  // Countdown timer for auto-reset (starts at 30 seconds, pauses if user interacts)
  const [countdown, setCountdown] = useState(30);
  const [isPaused, setIsPaused] = useState(false);

  const availableTags = [
    "⚡ Sangat Cepat (< 1 Menit)",
    "📝 Form Jelas & Ringkas",
    "📱 Nyaman di Ponsel",
    "🛡️ Privasi Aman",
    "✨ Tampilan Ramah",
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
      // ignore errors
    }

    setTimeout(() => {
      setSubmittingFeedback(false);
      setFeedbackSubmitted(true);
      // Give visitor more time to view the result
      setCountdown(20);
    }, 400);
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

  // Generate celebration particles
  const confettiParticles = Array.from({ length: 24 }).map((_, i) => {
    const angle = (i / 24) * 360;
    const radius = 90 + Math.random() * 80;
    const x = Math.cos((angle * Math.PI) / 180) * radius;
    const y = Math.sin((angle * Math.PI) / 180) * radius;
    const colors = ["#07936E", "#10D5A0", "#38BDF8", "#F59E0B", "#10241E", "#34D399"];
    const color = colors[i % colors.length] || "#07936E";
    const size = 6 + (i % 5) * 2;
    return { id: i, x, y, color, size };
  });

  const activeRating = hoverRating !== null ? hoverRating : rating;

  return (
    <div className="relative mx-auto w-full max-w-2xl px-4 py-8">
      {/* Background Glow / Ambiance */}
      <div className="pointer-events-none absolute left-1/2 top-10 -translate-x-1/2 transform">
        <div className="h-64 w-64 rounded-full bg-brand/20 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-3xl border border-border/80 bg-card p-6 shadow-soft sm:p-10"
      >
        {/* Animated Checkmark and Ripple Center */}
        <div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center">
          {/* Pulsing Concentric Ripple Rings */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0.8 }}
            animate={{ scale: [1, 1.4, 1.6], opacity: [0.7, 0.3, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
            className="absolute inset-0 rounded-full bg-brand/30"
          />
          <motion.div
            initial={{ scale: 0.8, opacity: 0.6 }}
            animate={{ scale: [0.9, 1.25, 1.45], opacity: [0.6, 0.2, 0] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.5, ease: "easeOut" }}
            className="absolute inset-0 rounded-full bg-primary/20"
          />

          {/* Confetti Particles Burst */}
          {confettiParticles.map((p) => (
            <motion.span
              key={p.id}
              initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
              animate={{
                x: p.x,
                y: p.y,
                opacity: [1, 0.9, 0],
                scale: [0, 1.2, 0.4],
                rotate: [0, p.id % 2 === 0 ? 180 : -180],
              }}
              transition={{
                duration: 1.2 + (p.id % 4) * 0.2,
                ease: "easeOut",
                delay: 0.15,
              }}
              style={{
                backgroundColor: p.color,
                width: p.size,
                height: p.size,
              }}
              className="absolute rounded-full shadow-sm"
            />
          ))}

          {/* Main Badge Container */}
          <motion.div
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 18,
              delay: 0.1,
            }}
            className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-tr from-primary to-brand text-primary-foreground shadow-lg shadow-brand/30"
          >
            {/* SVG Checkmark Drawing */}
            <svg
              className="h-10 w-10 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <motion.path
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.55, ease: "easeOut", delay: 0.3 }}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </motion.div>
        </div>

        {/* Header Text */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4 }}
          className="text-center"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-primary">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Registrasi Berhasil
          </span>
          <h1 className="mt-2 font-display text-2xl font-black text-foreground sm:text-3xl">
            Selamat Datang di Menara Nobu!
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground sm:text-base">
            Terima kasih, <span className="font-semibold text-foreground">{data.name}</span>. Data
            kunjungan Anda telah tercatat dan pihak yang dituju telah diberi notifikasi.
          </p>
        </motion.div>

        {/* Digital Visitor Badge / Card Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.4 }}
          className="mt-6 rounded-2xl border border-border bg-muted/40 p-5 print:border-none print:bg-white"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/80 pb-3">
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-primary" />
              <span className="font-display text-xs font-bold uppercase tracking-wider text-foreground">
                Bukti Registrasi Tamu
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsPaused(true);
                  setShowBadgeModal(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-all active:scale-95 shadow-xs"
              >
                <Barcode className="h-3.5 w-3.5" />
                Badge & Barcode
              </button>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-2.5 py-1 text-xs font-semibold text-primary shadow-sm">
                <Clock className="h-3.5 w-3.5" />
                {data.checkInTime} WIB
              </span>
            </div>
          </div>

          <div className="mt-3.5 grid gap-3 text-xs sm:grid-cols-2 sm:text-sm">
            <div>
              <span className="text-muted-foreground">Nama Pengunjung:</span>
              <p className="font-bold text-foreground">{data.name}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Instansi / Perusahaan:</span>
              <p className="font-bold text-foreground">{data.institution}</p>
            </div>
            {data.employeeName && (
              <div>
                <span className="text-muted-foreground">Karyawan yang Dituju:</span>
                <p className="font-bold text-primary">{data.employeeName}</p>
              </div>
            )}
            {data.purposeName && (
              <div>
                <span className="text-muted-foreground">Keperluan:</span>
                <p className="font-bold text-foreground">{data.purposeName}</p>
              </div>
            )}
          </div>

          {data.fillDurationSeconds && data.fillDurationSeconds > 0 && (
            <div className="mt-3.5 flex items-center justify-between rounded-xl bg-card/80 px-3 py-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <Clock className="h-3.5 w-3.5 text-brand" />
                Durasi Pengisian Formulir:
              </span>
              <span className="font-bold text-primary">
                {data.fillDurationSeconds} detik (
                {data.fillDurationSeconds <= 60 ? "Sangat Cepat ⚡" : "Efisien"})
              </span>
            </div>
          )}
        </motion.div>

        {/* FEEDBACK SECTION: Seberapa mudah & cepat pengisian form? */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.4 }}
          className="mt-6 rounded-2xl border border-brand/30 bg-gradient-to-br from-brand-soft/60 via-card to-card p-5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/20 text-primary">
                <Smile className="h-4 w-4" />
              </span>
              <h2 className="font-display text-sm font-bold text-foreground sm:text-base">
                Seberapa mudah & cepat pengisian buku tamu ini?
              </h2>
            </div>
            {isPaused && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                Timer Dijeda
              </span>
            )}
          </div>

          <AnimatePresence mode="wait">
            {!feedbackSubmitted ? (
              <form onSubmit={handleFeedbackSubmit} className="mt-4 space-y-4">
                {/* 5 Star Rating */}
                <div className="flex flex-col items-center justify-center rounded-xl bg-card p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <motion.button
                        key={star}
                        type="button"
                        onClick={() => {
                          setRating(star);
                          setIsPaused(true);
                        }}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(null)}
                        whileHover={{ scale: 1.25, rotate: 6 }}
                        whileTap={{ scale: 0.9 }}
                        aria-label={`Beri nilai ${star} dari 5`}
                        className="rounded-full p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <Star
                          className={`h-8 w-8 transition-colors ${
                            star <= activeRating
                              ? "fill-amber-400 text-amber-400 drop-shadow-sm"
                              : "text-muted-foreground/30 hover:text-amber-200"
                          }`}
                        />
                      </motion.button>
                    ))}
                  </div>

                  <motion.p
                    key={activeRating}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2 text-xs font-bold text-primary sm:text-sm"
                  >
                    {ratingDescriptions[activeRating] || "Beri Penilaian Anda"}
                  </motion.p>
                </div>

                {/* Quick Aspect Tag Pills */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">
                    Apa yang paling Anda rasakan? (Pilih yang sesuai):
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {availableTags.map((tag) => {
                      const active = selectedTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleTag(tag)}
                          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                            active
                              ? "bg-primary text-primary-foreground shadow-sm"
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
                <div className="relative">
                  <input
                    type="text"
                    value={comment}
                    onChange={(e) => {
                      setComment(e.target.value);
                      setIsPaused(true);
                    }}
                    placeholder="Saran singkat untuk lobi Menara Nobu (opsional)..."
                    className="w-full rounded-xl border border-input bg-card px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/70 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 sm:text-sm"
                  />
                </div>

                {/* Submit Feedback Button */}
                <div className="flex items-center justify-between pt-1">
                  <p className="text-[11px] text-muted-foreground">
                    Ulasan ini membantu resepsionis meningkatkan kenyamanan lobi.
                  </p>
                  <button
                    type="submit"
                    disabled={submittingFeedback}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-xs font-bold text-primary-foreground shadow-sm transition-all hover:brightness-110 active:scale-95 disabled:opacity-60"
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
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-3 flex items-center gap-3 rounded-xl bg-card p-4 text-left shadow-sm"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-primary">
                  <Star className="h-5 w-5 fill-primary text-primary" />
                </div>
                <div>
                  <p className="font-display text-sm font-bold text-foreground">
                    Terima kasih atas ulasan Anda!
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Nilai <b>{rating} bintang</b> & masukan Anda telah kami simpan. Semoga pertemuan
                    Anda di Menara Nobu berlangsung lancar!
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Action Controls & Auto-countdown */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setIsPaused(true);
                setShowBadgeModal(true);
              }}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground shadow-sm transition-all hover:brightness-110 active:scale-95 sm:flex-initial sm:text-sm"
            >
              <Barcode className="h-4 w-4" />
              Cetak / Unduh Badge Tamu
            </button>
            <button
              onClick={printPass}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-muted active:scale-95 sm:text-sm"
              title="Cetak struk ringkas halaman"
            >
              <Printer className="h-4 w-4 text-muted-foreground" />
              Cetak Struk
            </button>
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-card px-3 text-xs text-muted-foreground hover:bg-muted sm:text-sm"
              title={isPaused ? "Lanjutkan timer otomatis" : "Jeda timer otomatis"}
            >
              {isPaused ? "Lanjutkan Timer" : "Jeda"}
            </button>
          </div>

          <button
            onClick={onReset}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 font-display text-xs font-bold text-foreground shadow-sm transition-all hover:bg-muted active:scale-95 sm:flex-initial sm:text-sm"
          >
            <RotateCcw className="h-4 w-4" />
            Selesai / Tamu Baru
            {!isPaused && countdown > 0 && (
              <span className="ml-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[11px]">
                ({countdown}s)
              </span>
            )}
          </button>
        </div>

        {/* Progress bar of countdown */}
        {!isPaused && countdown > 0 && (
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full bg-brand"
              initial={{ width: "100%" }}
              animate={{ width: `${(countdown / 30) * 100}%` }}
              transition={{ ease: "linear", duration: 1 }}
            />
          </div>
        )}
      </motion.div>

      {/* Visitor Badge Modal with Barcode & Download */}
      <VisitorBadgeModal
        open={showBadgeModal}
        onClose={() => setShowBadgeModal(false)}
        data={data}
      />
    </div>
  );
}
