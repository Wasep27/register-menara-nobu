import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  KeyRound,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  ArrowLeft,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { PasswordInput } from "@/components/ui/password-input";
import { evaluatePassword, generateStrongPassword } from "@/lib/password-utils";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Atur Ulang Password — Menara Nobu" },
      { name: "description", content: "Atur ulang kata sandi akun admin buku tamu Menara Nobu." },
      { property: "og:title", content: "Atur Ulang Password — Menara Nobu" },
      {
        property: "og:description",
        content: "Atur ulang kata sandi akun admin buku tamu Menara Nobu.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/og-image.png" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
      }
    });

    supabase.auth.getSession().then(({ data: d }) => {
      if (d.session) {
        setReady(true);
      }
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  const strength = useMemo(() => evaluatePassword(password), [password]);

  // Tombol Generator Password
  const handleGeneratePassword = () => {
    const generated = generateStrongPassword(14);
    setPassword(generated);
    setConfirmPassword(generated);
    setCopied(false);
    setErrorMessage("");
    toast.success("Password rekomendasi berhasil dibuat dan disinkronkan ke kedua kolom!");
  };

  const handleCopyPassword = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      toast.success("Password berhasil disalin ke clipboard!");
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.info(`Password: ${password}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!password) {
      setErrorMessage("Silakan masukkan password baru.");
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Password minimal 8 karakter sesuai standar keamanan.");
      return;
    }

    if (!strength.isComplete) {
      setErrorMessage(
        strength.missingCriteria[0] ||
          "Password harus mengombinasikan huruf besar, huruf kecil, angka, dan simbol khusus.",
      );
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Konfirmasi password tidak cocok dengan password baru.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setErrorMessage(`Gagal menyimpan password: ${error.message}. Silakan minta tautan baru.`);
        toast.error("Gagal menyimpan password baru.");
      } else {
        setSuccessMessage("Password Anda berhasil diperbarui! Mengalihkan ke halaman login...");
        toast.success("Password berhasil diubah!");
        await supabase.auth.signOut();
        setTimeout(() => {
          navigate({ to: "/admin/login" });
        }, 1800);
      }
    } catch (err) {
      setErrorMessage((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-muted/20 p-4 sm:p-6">
      {/* Tombol Kembali ke Halaman Utama */}
      <Link
        to="/"
        className="absolute left-4 top-4 sm:left-8 sm:top-8 inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-xs sm:text-sm font-semibold text-foreground shadow-xs transition-all hover:bg-muted active:scale-95"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Kembali ke Beranda</span>
      </Link>

      <div className="w-full max-w-md space-y-6">
        <div className="fade-up rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-soft">
          {/* Header */}
          <div className="text-center space-y-2 mb-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-primary shadow-xs">
              <KeyRound className="h-7 w-7" />
            </div>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">
              Atur Ulang Password
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Buat kata sandi baru yang kuat dan aman untuk akun petugas Menara Nobu Anda.
            </p>
          </div>

          {!ready ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center space-y-3 dark:border-amber-900/50 dark:bg-amber-950/20">
              <AlertCircle className="mx-auto h-8 w-8 text-amber-600 dark:text-amber-400" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                  Tautan Pemulihan Diperlukan
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                  Buka halaman ini melalui tautan pemulihan sandi yang dikirimkan ke email Anda,
                  atau hubungi Administrator sistem jika Anda memerlukan reset kata sandi langsung.
                </p>
              </div>
              <div className="pt-2">
                <Link
                  to="/admin/login"
                  className="inline-flex min-h-10 items-center justify-center rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-xs hover:brightness-110 active:scale-95"
                >
                  Kembali ke Halaman Login
                </Link>
              </div>
            </div>
          ) : successMessage ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center space-y-3 dark:border-emerald-900/50 dark:bg-emerald-950/20">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600 dark:text-emerald-400" />
              <p className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                {successMessage}
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-300">
                Mohon tunggu sejenak...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Quick Action: Rekomendasi Generator Password */}
              <div className="rounded-2xl border border-primary/25 bg-brand-soft/50 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                    <Sparkles className="h-4 w-4 shrink-0 text-primary" />
                    <span>Rekomendasi Sandi Kuat</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-card px-3 py-1.5 text-xs font-bold text-primary shadow-2xs hover:bg-primary hover:text-primary-foreground transition-all active:scale-95 cursor-pointer"
                  >
                    <RefreshCw className="h-3 w-3 shrink-0" />
                    <span>Generate Acak</span>
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Secara otomatis membuat 14 karakter kombinasi huruf besar, kecil, angka, dan
                  simbol khusus, serta menyinkronkan kedua kolom sandi.
                </p>
              </div>

              {/* Input Password Baru */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground block">
                    Password Baru <span className="text-destructive">*</span>
                  </label>
                  {password && (
                    <button
                      type="button"
                      onClick={handleCopyPassword}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                    >
                      {copied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                          <span className="text-emerald-600 font-bold">Tersalin!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Salin Password</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                <PasswordInput
                  required
                  minLength={8}
                  autoFocus
                  placeholder="Minimal 8 karakter kombinasi"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setCopied(false);
                    setErrorMessage("");
                  }}
                  className="w-full min-h-11 rounded-xl border border-input bg-card px-3.5 py-2 text-base sm:text-sm shadow-xs focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Live Strength Meter & Complexity Checklist */}
              {password && (
                <PasswordStrengthIndicator
                  strength={strength}
                  password={password}
                  showCriteria={true}
                />
              )}

              {/* Input Verifikasi Konfirmasi Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground block">
                  Konfirmasi Password Baru <span className="text-destructive">*</span>
                </label>
                <PasswordInput
                  required
                  minLength={8}
                  placeholder="Ketik ulang password baru untuk verifikasi"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setErrorMessage("");
                  }}
                  className="w-full min-h-11 rounded-xl border border-input bg-card px-3.5 py-2 text-base sm:text-sm shadow-xs focus:ring-2 focus:ring-primary/20"
                />
                {confirmPassword && (
                  <div className="pt-0.5">
                    {password === confirmPassword ? (
                      <p className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        <Check className="h-3.5 w-3.5" /> Konfirmasi password cocok & terverifikasi
                      </p>
                    ) : (
                      <p className="flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                        ⚠ Konfirmasi password belum sama
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive font-medium"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={
                  loading || !strength.isComplete || password !== confirmPassword || !password
                }
                className="w-full inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2 text-xs sm:text-sm font-bold text-primary-foreground shadow-sm hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin shrink-0" /> : null}
                <span>{loading ? "Menyimpan Kata Sandi..." : "Simpan Password Baru"}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
