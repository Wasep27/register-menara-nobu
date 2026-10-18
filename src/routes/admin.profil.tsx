import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Camera,
  Check,
  KeyRound,
  Loader2,
  Mail,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Upload,
  User,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Avatar } from "@/components/Avatar";
import { PasswordInput } from "@/components/ui/password-input";
import { useAdminRole } from "@/hooks/useAdminRole";
import { validateAvatarFile, compressAndCropAvatar, saveOwnProfile } from "@/lib/profile-utils";

export const Route = createFileRoute("/admin/profil")({
  head: () => ({
    meta: [
      { title: "Profil Akun Saya — Admin Menara Nobu" },
      {
        name: "description",
        content:
          "Kelola data profil, nama lengkap, foto profil avatar, dan kata sandi akun petugas Menara Nobu.",
      },
      { property: "og:title", content: "Profil Akun Saya — Admin Menara Nobu" },
      {
        property: "og:description",
        content:
          "Kelola data profil, nama lengkap, foto profil avatar, dan kata sandi akun petugas Menara Nobu.",
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { userRoles, userName, userAvatar, userEmail, refreshProfile } = useAdminRole();
  const [userId, setUserId] = useState<string>("");
  const [email, setEmail] = useState<string>(userEmail || "");
  const [fullName, setFullName] = useState<string>(userName || "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(userAvatar || null);
  const [isProcessingImg, setIsProcessingImg] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Bagian Ganti Password
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Inisialisasi data dari sesi Supabase
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        if (data.user.email) setEmail(data.user.email);
        supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", data.user.id)
          .maybeSingle()
          .then(({ data: prof }) => {
            if (prof) {
              if (prof.full_name) setFullName(prof.full_name);
              if (prof.avatar_url) setAvatarPreview(prof.avatar_url);
            } else if (data.user?.user_metadata?.full_name) {
              setFullName(data.user.user_metadata.full_name);
            }
          });
      }
    });
  }, []);

  // Update jika context berubah
  useEffect(() => {
    if (userName) setFullName((prev) => prev || userName);
    if (userAvatar) setAvatarPreview((prev) => prev || userAvatar);
    if (userEmail) setEmail((prev) => prev || userEmail);
  }, [userName, userAvatar, userEmail]);

  // Handle upload & kompresi foto avatar
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateAvatarFile(file);
    if (!validation.valid) {
      toast.error(validation.error || "Berkas gambar tidak valid");
      return;
    }

    setIsProcessingImg(true);
    try {
      const compressedDataUrl = await compressAndCropAvatar(file, 256);
      setAvatarPreview(compressedDataUrl);
      toast.success("Foto profil berhasil dipilih. Klik 'Simpan Perubahan' untuk menerapkan.");
    } catch (err) {
      toast.error((err as Error).message || "Gagal memproses gambar avatar.");
    } finally {
      setIsProcessingImg(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarPreview(null);
    toast.info("Foto profil dihapus (akan kembali ke inisial nama).");
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("Nama lengkap tidak boleh kosong.");
      return;
    }

    if (!userId) {
      toast.error("Sesi pengguna tidak valid.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await saveOwnProfile(userId, {
        full_name: fullName.trim(),
        avatar_url: avatarPreview,
      });

      if (!res.success) {
        toast.error(`Gagal menyimpan profil: ${res.error || "Terjadi kesalahan"}`);
        return;
      }

      // Jika ganti password
      if (showPasswordSection && newPassword) {
        if (newPassword.length < 6) {
          toast.error("Password baru minimal 6 karakter.");
          setIsSaving(false);
          return;
        }
        if (newPassword !== confirmPassword) {
          toast.error("Konfirmasi password tidak cocok.");
          setIsSaving(false);
          return;
        }

        setIsChangingPassword(true);
        const { error: pwdErr } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (pwdErr) {
          toast.error(`Profil diperbarui, namun gagal mengubah kata sandi: ${pwdErr.message}`);
        } else {
          toast.success("Password baru berhasil disimpan!");
          setNewPassword("");
          setConfirmPassword("");
          setShowPasswordSection(false);
        }
        setIsChangingPassword(false);
      }

      toast.success("Profil Anda berhasil diperbarui!");
      if (refreshProfile) {
        await refreshProfile();
      }
    } catch (err) {
      toast.error((err as Error).message || "Gagal memperbarui profil.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link to="/admin" className="hover:text-primary transition-colors">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-foreground font-semibold">Profil Saya</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-soft text-primary shadow-xs">
              <User className="h-5 w-5" />
            </span>
            Profil Akun Saya
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Kelola nama lengkap, foto avatar resmi, dan kata sandi akun login Anda di Menara Nobu.
          </p>
        </div>

        <Link
          to="/admin"
          className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-all active:scale-95 shadow-2xs"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Kembali ke Dashboard</span>
        </Link>
      </div>

      <form onSubmit={handleSaveProfile} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Kolom Kiri: Foto Profil Avatar Card */}
          <div className="md:col-span-1 rounded-3xl border border-border bg-card p-4 sm:p-6 shadow-soft flex flex-col items-center text-center">
            <h2 className="text-sm font-bold text-foreground mb-4 self-start flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Foto Profil (Avatar)
            </h2>

            <div className="relative group my-2">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer rounded-full p-1.5 transition-all duration-300 hover:scale-105 active:scale-95 ring-4 ring-brand-soft"
                title="Klik untuk memilih foto profil baru"
              >
                <Avatar
                  name={fullName || "Petugas"}
                  src={avatarPreview}
                  size="xl"
                  className="w-24 h-24 sm:w-28 sm:h-28 text-xl sm:text-2xl shadow-md"
                />
              </div>

              {/* Camera Action Overlay Badge */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessingImg}
                aria-label="Ubah foto profil"
                className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-transform hover:scale-110 active:scale-90"
              >
                {isProcessingImg ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleFileChange}
                className="hidden"
                aria-label="Pilih berkas foto avatar"
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 w-full">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessingImg}
                className="inline-flex min-h-10 sm:min-h-9 items-center gap-1.5 rounded-xl border border-primary/30 bg-brand-soft px-3.5 py-1.5 text-xs font-semibold text-primary transition-all hover:bg-primary hover:text-primary-foreground active:scale-95"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>{avatarPreview ? "Ganti Foto" : "Unggah Foto"}</span>
              </button>

              {avatarPreview && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  title="Hapus foto profil dan gunakan inisial nama"
                  className="inline-flex min-h-10 sm:min-h-9 items-center gap-1 rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive transition-all hover:bg-destructive hover:text-destructive-foreground active:scale-95"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Hapus</span>
                </button>
              )}
            </div>

            <p className="mt-4 text-[11px] text-muted-foreground leading-relaxed">
              Format JPG, PNG, atau WebP. Gambar otomatis dipotong bujur sangkar (center-crop) dan
              dikompresi agar ringan (&lt;40KB).
            </p>
          </div>

          {/* Kolom Kanan: Identitas & Keamanan */}
          <div className="md:col-span-2 space-y-6">
            {/* Card Identitas Pengguna */}
            <div className="rounded-3xl border border-border bg-card p-4 sm:p-6 shadow-soft space-y-4">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                Informasi Akun & Identitas
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">
                    Nama Lengkap <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nama lengkap Anda"
                    className="w-full min-h-11 sm:min-h-10 rounded-xl border border-input bg-background px-3.5 py-2 text-base sm:text-sm text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Nama ini akan tercantum di seluruh buku tamu, log verifikasi, dan aktivitas
                    operasional.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">
                    Email Akun Terdaftar
                  </label>
                  <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3.5 py-2.5 text-xs font-mono text-muted-foreground">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate flex-1">{email || "Tidak ada email"}</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                      <Check className="h-2.5 w-2.5" /> Terverifikasi
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">
                    Peran & Hak Akses Anda (RBAC)
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    {userRoles.map((r) => {
                      const isAdm = r === "admin";
                      const isSec = r === "security";
                      const isStf = r === "staff";
                      return (
                        <span
                          key={r}
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                            isAdm
                              ? "bg-primary text-primary-foreground shadow-2xs"
                              : isSec
                                ? "bg-emerald-600 text-white shadow-2xs"
                                : isStf
                                  ? "bg-amber-600 text-white shadow-2xs"
                                  : "bg-muted text-foreground"
                          }`}
                        >
                          {isAdm && <ShieldAlert className="h-3.5 w-3.5" />}
                          {isSec && <Shield className="h-3.5 w-3.5" />}
                          {isStf && <ShieldCheck className="h-3.5 w-3.5" />}
                          {r.toUpperCase()}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Card Keamanan Kata Sandi */}
            <div className="rounded-3xl border border-border bg-card p-4 sm:p-6 shadow-soft space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-soft text-primary shadow-xs">
                    <KeyRound className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-foreground">Keamanan Sandi</h2>
                    <p className="text-xs text-muted-foreground">
                      Perbarui kata sandi masuk Anda jika diperlukan
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowPasswordSection(!showPasswordSection)}
                  className="rounded-xl border border-border bg-muted/40 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-brand-soft transition-colors"
                >
                  {showPasswordSection ? "Tutup Form Sandi" : "Ubah Sandi"}
                </button>
              </div>

              {showPasswordSection && (
                <div className="space-y-3.5 pt-3 border-t border-border/70 fade-up">
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">
                      Password Baru
                    </label>
                    <PasswordInput
                      minLength={6}
                      placeholder="Minimal 6 karakter"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full min-h-11 sm:min-h-9 rounded-xl border border-input bg-background px-3 py-2 text-base sm:text-xs shadow-xs focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">
                      Konfirmasi Password Baru
                    </label>
                    <PasswordInput
                      minLength={6}
                      placeholder="Ulangi password baru"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full min-h-11 sm:min-h-9 rounded-xl border border-input bg-background px-3 py-2 text-base sm:text-xs shadow-xs focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Action Bar */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center sm:justify-end gap-2.5 pt-2">
              <Link
                to="/admin"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-input px-5 text-xs font-semibold text-foreground hover:bg-muted transition-colors active:scale-95 text-center"
              >
                Batal
              </Link>
              <button
                type="submit"
                disabled={isSaving || isProcessingImg || isChangingPassword}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-xs font-bold text-primary-foreground shadow-sm hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
              >
                {isSaving || isChangingPassword ? (
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                ) : null}
                <span>
                  {isSaving || isChangingPassword ? "Menyimpan…" : "Simpan Perubahan Profil"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
