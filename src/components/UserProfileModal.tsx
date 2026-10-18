import { useState, useRef, useEffect } from "react";
import {
  Camera,
  Check,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Upload,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase, type AppRole } from "@/lib/supabase";
import { Avatar } from "@/components/Avatar";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { validateAvatarFile, compressAndCropAvatar, saveOwnProfile } from "@/lib/profile-utils";

export interface UserProfileModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  initialName: string;
  initialAvatar?: string | null;
  userEmail?: string;
  userRoles?: AppRole[];
  onProfileUpdated?: (newName: string, newAvatar: string | null) => void;
}

export function UserProfileModal({
  open,
  onClose,
  userId,
  initialName,
  initialAvatar = null,
  userEmail = "",
  userRoles = [],
  onProfileUpdated,
}: UserProfileModalProps) {
  const [fullName, setFullName] = useState(initialName);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialAvatar);
  const [isProcessingImg, setIsProcessingImg] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Bagian Ganti Password Sendiri
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sinkronkan state saat modal dibuka
  useEffect(() => {
    if (open) {
      setFullName(initialName);
      setAvatarPreview(initialAvatar);
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordSection(false);
    }
  }, [open, initialName, initialAvatar]);

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
      // Reset input agar pengguna bisa memilih berkas yang sama jika diinginkan
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

      // Jika pengguna mengisi password baru
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
          toast.error(`Profil diperbarui, namun gagal mengubah password: ${pwdErr.message}`);
        } else {
          toast.success("Password baru berhasil disimpan!");
        }
        setIsChangingPassword(false);
      }

      toast.success("Profil Anda berhasil diperbarui!");
      onProfileUpdated?.(fullName.trim(), avatarPreview);
      onClose();
    } catch (err) {
      toast.error((err as Error).message || "Gagal memperbarui profil.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !isSaving && !o && onClose()}>
      <DialogContent className="w-[calc(100%-1.25rem)] sm:w-full max-w-lg mx-auto rounded-3xl p-4 sm:p-6 max-h-[88dvh] sm:max-h-[90vh] overflow-y-auto overscroll-contain shadow-2xl border border-border/80">
        <DialogHeader className="pr-7 sm:pr-0 text-left">
          <DialogTitle className="flex items-center gap-2.5 text-base sm:text-lg font-bold text-foreground">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-primary shadow-xs">
              <User className="h-5 w-5" />
            </span>
            <span className="truncate">Profil Akun Saya</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            Kelola identitas, foto profil avatar, dan kata sandi akun Anda di Menara Nobu.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSaveProfile} className="space-y-4 sm:space-y-5 pt-1">
          {/* Section 1: Upload & Avatar Preview */}
          <div className="flex flex-col items-center justify-center rounded-2xl border border-border/80 bg-muted/20 p-3.5 sm:p-4 text-center">
            <div className="relative group my-1">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer rounded-full p-1 transition-all duration-300 hover:scale-105 active:scale-95 ring-4 ring-brand-soft/60"
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
                className="absolute bottom-0 right-0 sm:bottom-1 sm:right-1 flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-transform hover:scale-110 active:scale-90 cursor-pointer"
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

            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessingImg}
                className="inline-flex min-h-10 sm:min-h-9 items-center gap-1.5 rounded-xl border border-primary/30 bg-brand-soft px-3.5 py-1.5 text-xs font-semibold text-primary transition-all hover:bg-primary hover:text-primary-foreground active:scale-95 cursor-pointer"
              >
                <Upload className="h-3.5 w-3.5 shrink-0" />
                <span>{avatarPreview ? "Ganti Foto" : "Unggah Foto"}</span>
              </button>

              {avatarPreview && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  title="Hapus foto profil dan gunakan inisial nama"
                  className="inline-flex min-h-10 sm:min-h-9 items-center gap-1.5 rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive transition-all hover:bg-destructive hover:text-destructive-foreground active:scale-95 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5 shrink-0" />
                  <span>Hapus</span>
                </button>
              )}
            </div>

            <p className="mt-2.5 text-[11px] text-muted-foreground/80 leading-relaxed px-2">
              Format JPG, PNG, atau WebP. Gambar otomatis dipotong bujur sangkar dan dikompresi
              sangat ringan (&lt;40KB).
            </p>
          </div>

          {/* Section 2: Identitas Nama & Email */}
          <div className="space-y-3.5">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Nama Lengkap <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nama lengkap Anda"
                className="w-full min-h-11 sm:min-h-10 rounded-xl border border-input bg-card px-3.5 py-2 text-base sm:text-sm text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Email Akun Terdaftar
              </label>
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 rounded-xl border border-border bg-muted/40 px-3.5 py-2.5 text-xs font-mono text-muted-foreground">
                <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate flex-1 min-w-[140px] text-foreground font-medium">
                  {userEmail || "Tidak ada email"}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Check className="h-2.5 w-2.5" /> Terverifikasi
                </span>
              </div>
            </div>

            {/* Peran Aktif Akun */}
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Peran & Hak Akses (RBAC)
              </label>
              <div className="flex flex-wrap items-center gap-1.5">
                {userRoles.map((r) => {
                  const isAdm = r === "admin";
                  const isSec = r === "security";
                  const isStf = r === "staff";
                  return (
                    <span
                      key={r}
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
                        isAdm
                          ? "bg-primary text-primary-foreground shadow-2xs"
                          : isSec
                            ? "bg-emerald-600 text-white shadow-2xs"
                            : isStf
                              ? "bg-amber-600 text-white shadow-2xs"
                              : "bg-muted text-foreground"
                      }`}
                    >
                      {isAdm && <ShieldAlert className="h-3.5 w-3.5 shrink-0" />}
                      {isSec && <Shield className="h-3.5 w-3.5 shrink-0" />}
                      {isStf && <ShieldCheck className="h-3.5 w-3.5 shrink-0" />}
                      {r.toUpperCase()}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 3: Ganti Password Mandiri */}
          <div className="rounded-2xl border border-border/80 bg-muted/20 p-3.5 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-card text-primary shadow-xs">
                  <KeyRound className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">Keamanan Kata Sandi</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    Perbarui sandi login jika diperlukan
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowPasswordSection(!showPasswordSection)}
                className="shrink-0 rounded-xl border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-brand-soft transition-colors cursor-pointer"
              >
                {showPasswordSection ? "Tutup" : "Ubah Sandi"}
              </button>
            </div>

            {showPasswordSection && (
              <div className="mt-3.5 space-y-3 pt-3 border-t border-border/70 fade-up">
                <div>
                  <label className="text-[11px] font-semibold text-foreground block mb-1">
                    Password Baru
                  </label>
                  <PasswordInput
                    minLength={6}
                    placeholder="Minimal 6 karakter"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full min-h-11 sm:min-h-9 rounded-xl border border-input bg-card px-3 py-2 text-base sm:text-xs shadow-xs focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-foreground block mb-1">
                    Konfirmasi Password Baru
                  </label>
                  <PasswordInput
                    minLength={6}
                    placeholder="Ulangi password baru"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full min-h-11 sm:min-h-9 rounded-xl border border-input bg-card px-3 py-2 text-base sm:text-xs shadow-xs focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Sticky Dialog Action Buttons on Mobile & Desktop */}
          <div className="sticky bottom-0 -mx-4 sm:-mx-6 -mb-4 sm:-mb-6 p-4 sm:p-5 bg-card/95 backdrop-blur-md border-t border-border/70 z-10 rounded-b-3xl">
            <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-2.5 w-full">
              <button
                type="button"
                disabled={isSaving}
                onClick={onClose}
                className="w-full sm:w-auto min-h-11 sm:min-h-10 inline-flex items-center justify-center rounded-xl border border-input px-5 text-xs font-semibold text-foreground hover:bg-muted transition-colors active:scale-95 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSaving || isProcessingImg}
                className="w-full sm:w-auto inline-flex min-h-11 sm:min-h-10 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-xs font-bold text-primary-foreground shadow-sm hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin shrink-0" /> : null}
                <span>{isSaving ? "Menyimpan…" : "Simpan Perubahan"}</span>
              </button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
