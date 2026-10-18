import { supabase } from "@/lib/supabase";

export interface UserProfileData {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url?: string | null;
  created_at?: string;
}

/**
 * Validasi berkas foto profil / avatar.
 */
export function validateAvatarFile(file: File): { valid: boolean; error?: string } {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: "Format berkas harus berupa gambar (JPG, PNG, WebP, atau GIF).",
    };
  }

  // Maksimum 5MB sebelum kompresi
  const maxBytes = 5 * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      valid: false,
      error: "Ukuran berkas gambar maksimal 5MB.",
    };
  }

  return { valid: true };
}

/**
 * Mengompres dan memotong gambar menjadi bujur sangkar (center-crop square)
 * dengan resolusi optimal (256x256 px) format WebP/JPEG berukuran sangat ringan (<40KB).
 */
export function compressAndCropAvatar(file: File, targetSize = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Gagal membaca berkas gambar."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Gagal memuat elemen gambar."));
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = targetSize;
          canvas.height = targetSize;
          const ctx = canvas.getContext("2d");

          if (!ctx) {
            reject(new Error("Canvas context 2D tidak tersedia."));
            return;
          }

          // Hitung pemotongan tengah (center-crop)
          const srcSize = Math.min(img.naturalWidth, img.naturalHeight);
          const srcX = (img.naturalWidth - srcSize) / 2;
          const srcY = (img.naturalHeight - srcSize) / 2;

          // Gambar dengan latar transparan halus
          ctx.clearRect(0, 0, targetSize, targetSize);
          ctx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, targetSize, targetSize);

          // Coba ekspor ke format WebP (efisien), fallback ke JPEG
          let dataUrl = canvas.toDataURL("image/webp", 0.88);
          if (!dataUrl.startsWith("data:image/webp")) {
            dataUrl = canvas.toDataURL("image/jpeg", 0.88);
          }

          resolve(dataUrl);
        } catch (err) {
          reject(err);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Simpan data profil pengguna yang sedang login (Nama Lengkap & Avatar).
 * Menggunakan sinkronisasi multi-lapisan: RPC Supabase -> Tabel profiles -> auth user metadata -> Cache Lokal.
 */
export async function saveOwnProfile(
  userId: string,
  payload: { full_name: string; avatar_url: string | null },
): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanName = payload.full_name.trim();

    // 1. Coba panggil RPC update_own_profile
    try {
      await supabase.rpc("update_own_profile", {
        _full_name: cleanName || null,
        _avatar_url: payload.avatar_url || null,
      });
    } catch (rpcErr) {
      console.warn("RPC update_own_profile fallback ke direct update:", rpcErr);
    }

    // 2. Direct update pada tabel public.profiles
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        full_name: cleanName || null,
        avatar_url: payload.avatar_url || null,
      })
      .eq("id", userId);

    if (profileError) {
      console.warn("Update tabel profiles gagal:", profileError);
    }

    // 3. Sinkronkan ke auth.users raw_user_meta_data melalui SDK klien
    try {
      await supabase.auth.updateUser({
        data: {
          full_name: cleanName,
          name: cleanName,
          avatar_url: payload.avatar_url,
        },
      });
    } catch (authErr) {
      console.warn("Sinkronisasi auth metadata:", authErr);
    }

    // 4. Cache profil ke localStorage untuk hidrasi cepat tanpa jeda
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(
          `nobu_user_profile_${userId}`,
          JSON.stringify({
            full_name: cleanName,
            avatar_url: payload.avatar_url,
            updated_at: Date.now(),
          }),
        );
      } catch {
        // Abaikan jika storage penuh
      }
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Pembaruan nama profil pengguna oleh Administrator di halaman Manajemen Pengguna.
 */
export async function adminUpdateUserName(
  targetUserId: string,
  fullName: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanName = fullName.trim();

    // 1. Coba RPC admin_update_user_name
    try {
      const { error: rpcErr } = await supabase.rpc("admin_update_user_name", {
        _target_user_id: targetUserId,
        _full_name: cleanName || null,
      });

      if (!rpcErr) {
        return { success: true };
      }
    } catch {
      // lanjut fallback
    }

    // 2. Fallback direct update pada tabel profiles
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: cleanName || null })
      .eq("id", targetUserId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
