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
      <DialogContent className="rounded-3xl max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-soft text-primary shadow-xs">
              <User className="h-5 w-5" />
            </span>
            Profil Akun Saya
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Kelola nama lengkap, foto profil avatar, dan kata sandi akun Anda di Menara Nobu.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSaveProfile} className="space-y-5 pt-1">
          {/* Section 1: Upload & Avatar Preview */}
          <div className="flex flex-col items-center justify-center rounded-2xl border border-border/80 bg-muted/20 p-4 text-center">
            <div className="relative group">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer rounded-full p-1 transition-all duration-300 hover:scale-105 active:scale-95"
                title="Klik untuk memilih foto profil baru"
              >
                <Avatar
                  name={fullName || "Petugas"}
                  src={avatarPreview}
                  size="xl"
                  className="ring-4 ring-background shadow-md"
                />
              </div>

              {/* Camera Action Overlay Badge */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessingImg}
                aria-label="Ubah foto profil"
                className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform hover:scale-110 active:scale-90"
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

            <div className="mt-3 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessingImg}
                className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-brand-soft px-3 py-1 text-xs font-semibold text-primary transition-all hover:bg-primary hover:text-primary-foreground active:scale-95"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>{avatarPreview ? "Ganti Foto" : "Unggah Foto"}</span>
              </button>

              {avatarPreview && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  title="Hapus foto profil dan gunakan inisial nama"
                  className="inline-flex items-center gap-1 rounded-full border border-destructive/20 bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive transition-all hover:bg-destructive hover:text-destructive-foreground active:scale-95"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Hapus</span>
                </button>
              )}
            </div>

            <p className="mt-2 text-[10px] text-muted-foreground/80">
              Format JPG, PNG, atau WebP. Foto akan dipotong presisi bujur sangkar (maks 5MB).
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
                className="w-full rounded-xl border border-input bg-card px-3.5 py-2.5 text-sm text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Email Akun Terdaftar
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3.5 py-2 text-xs font-mono text-muted-foreground">
                <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate flex-1">{userEmail || "Tidak ada email"}</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
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

          {/* Section 3: Ganti Password Mandiri */}
          <div className="rounded-2xl border border-border/80 bg-muted/20 p-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-card text-primary shadow-xs">
                  <KeyRound className="h-3.5 w-3.5" />
                </span>
                <div>
                  <p className="text-xs font-bold text-foreground">Keamanan Sandi</p>
                  <p className="text-[10px] text-muted-foreground">Ubah kata sandi login Anda</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowPasswordSection(!showPasswordSection)}
                className="rounded-xl border border-border bg-card px-2.5 py-1 text-xs font-semibold text-primary hover:bg-brand-soft transition-colors"
              >
                {showPasswordSection ? "Batal Ubah" : "Ganti Sandi"}
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
                    className="w-full rounded-xl border border-input bg-card px-3 py-2 text-xs shadow-xs focus:ring-2 focus:ring-primary/20"
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
                    className="w-full rounded-xl border border-input bg-card px-3 py-2 text-xs shadow-xs focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Dialog Action Buttons */}
          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-border/60">
            <button
              type="button"
              disabled={isSaving}
              onClick={onClose}
              className="w-full sm:w-auto min-h-11 sm:min-h-10 rounded-xl border border-input px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors active:scale-95"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving || isProcessingImg}
              className="w-full sm:w-auto inline-flex min-h-11 sm:min-h-10 items-center justify-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin shrink-0" /> : null}
              <span>{isSaving ? "Menyimpan…" : "Simpan Perubahan"}</span>
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
