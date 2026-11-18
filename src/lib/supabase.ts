/**
 * Klien Supabase & Definisi Tipe Domain (`src/lib/supabase.ts`).
 *
 * Arsitektur & Best Practice Keamanan:
 * - Seluruh akses data berjalan langsung dari browser menggunakan `anon / publishable key` (tanpa server functions
 *   maupun `service_role` key di frontend).
 * - Autentikasi memakai PKCE flow (`flowType: "pkce"`) dengan `storageKey: "nobu-auth"` agar aman untuk reset password
 *   dan penyegaran token otomatis.
 * - Penulisan data oleh tamu anonim (registrasi, feedback, cek status pass) wajib melalui fungsi RPC `SECURITY DEFINER`
 *   di Supabase sehingga tabel `guests` tetap tertutup dari pembacaan publik.
 */
import { createClient } from "@supabase/supabase-js";

/** URL proyek Supabase aktif (diambil dari env `VITE_SUPABASE_URL` saat build/runtime). */
export const supabaseUrl =
  import.meta.env["VITE_SUPABASE_URL"] || "https://uugqkbwpjlprtxnjdpcm.supabase.co";
const key =
  import.meta.env["VITE_SUPABASE_ANON_KEY"] ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1Z3FrYndwamxwcnR4bmpkcGNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxNTQ0NDQsImV4cCI6MjEwNzczMDQ0NH0.iKDIQks2uO0o2oNCCwqqMCv7QngZAQOYb12aCtjpXFg";

const isBrowser = typeof window !== "undefined";

/** Instance klien Supabase tunggal untuk seluruh komponen dan rute aplikasi. */
export const supabase = createClient(supabaseUrl, key, {
  auth: {
    // Nonaktifkan persistensi/deteksi URL di lingkungan SSR agar tidak menyentuh `window.localStorage`
    persistSession: isBrowser,
    autoRefreshToken: isBrowser, // Perbarui token JWT otomatis sebelum kedaluwarsa
    detectSessionInUrl: isBrowser, // Tangkap token PKCE dari tautan email reset password
    flowType: "pkce",
    storageKey: "nobu-auth",
    storage: isBrowser ? window.localStorage : undefined,
  },
});

/** Keluar dari sesi di perangkat/browser ini dan bersihkan cache `sessionStorage` sementara. */
export async function signOutLocal() {
  await supabase.auth.signOut({ scope: "local" });
  try {
    sessionStorage.clear();
  } catch {
    /* abaikan jika browser membatasi akses sessionStorage */
  }
}

/**
 * Mengaktifkan timer keluar otomatis (*idle logout*) setelah tidak ada aktivitas pengguna.
 *
 * @param onTimeout Callback yang dijalankan saat batas waktu tidak aktif tercapai.
 * @param minutes Batas durasi tidak aktif dalam menit (default 30 menit).
 * @returns Fungsi pembersih untuk melepas event listener dan timer saat komponen unmount.
 */
export function startIdleLogout(onTimeout: () => void, minutes = 30) {
  let t: ReturnType<typeof setTimeout>;
  const reset = () => {
    clearTimeout(t);
    t = setTimeout(onTimeout, minutes * 60_000);
  };
  const evs = ["mousemove", "keydown", "pointerdown", "scroll", "touchstart"] as const;
  evs.forEach((e) => window.addEventListener(e, reset, { passive: true }));
  reset();
  return () => {
    clearTimeout(t);
    evs.forEach((e) => window.removeEventListener(e, reset));
  };
}

/** Peran akses resmi pada sistem RBAC Menara Nobu (disimpan di tabel terpisah `user_roles`). */
export type AppRole = "admin" | "security" | "staff";

/** Data master karyawan / host penerima tamu. */
export type Employee = { id: string; name: string; department: string | null; is_active: boolean };

/** Data master kategori tujuan / keperluan kunjungan. */
export type Purpose = { id: string; name: string; is_active: boolean };

/** Entitas catatan kunjungan tamu beserta relasi opsional karyawan dan tujuan kunjungan. */
export type Guest = {
  id: string;
  name: string;
  institution: string;
  phone: string;
  employee_id: string | null;
  visit_purpose_id: string | null;
  notes: string | null;
  check_in_time: string;
  fill_duration_seconds: number | null;
  badge_code?: string | null;
  employees?: { name: string; department?: string | null } | null;
  visit_purposes?: { name: string } | null;
};

/** Entitas ulasan kepuasan tamu (CSAT) setelah menyelesaikan registrasi. */
export type GuestFeedback = {
  id: string;
  guest_name: string | null;
  institution: string | null;
  rating: number;
  tags: string[];
  comment: string | null;
  fill_duration_seconds: number | null;
  created_at: string;
};

/**
 * Mengirim feedback kepuasan tamu secara anonim lewat RPC `submit_guest_feedback`.
 * Jika RPC belum tersedia (misalnya skema belum dimigrasi), fungsi mengembalikan `{ success: false }`
 * agar UI tetap bisa menyimpan salinan lokal di `localStorage`.
 */
export async function submitGuestFeedback(payload: {
  guest_name?: string;
  institution?: string;
  rating: number;
  tags?: string[];
  comment?: string;
  fill_duration_seconds?: number;
}) {
  try {
    const { data, error } = await supabase.rpc("submit_guest_feedback", {
      _payload: payload,
    });
    if (error) {
      console.warn("RPC submit_guest_feedback failed (schema not run yet?), saving locally", error);
      return { success: false, error };
    }
    return { success: true, data };
  } catch (err) {
    console.warn("Error calling submit_guest_feedback", err);
    return { success: false, error: err };
  }
}

/** Entitas log audit sistem dan aktivitas lobi real-time (`activity_logs`). */
export type ActivityLog = {
  id: string;
  category: "registration" | "master_data" | "security" | "feedback" | "system";
  action: string;
  title: string;
  details: Record<string, unknown>;
  actor_type: "guest" | "admin" | "system";
  actor_id: string | null;
  actor_email: string | null;
  created_at: string;
};

/** Hasil verifikasi atau pelacakan status tiket / pass tamu berdasarkan kode badge atau UUID. */
export type GuestStatusResult = {
  found: boolean;
  id?: string | undefined;
  name?: string | undefined;
  institution?: string | undefined;
  phone?: string | undefined;
  check_in_time?: string | undefined;
  check_in_date?: string | undefined;
  badge_code?: string | undefined;
  purpose_name?: string | undefined;
  employee_name?: string | undefined;
  department?: string | undefined;
  status?: string | undefined;
  scheduled_at?: string | undefined;
  error?: string | undefined;
};

/**
 * Memeriksa status tiket/kunjungan tamu menggunakan kode badge (mis. `VTR-001`) atau ID tiket
 * melalui RPC publik aman `check_guest_status` tanpa mengekspos daftar tamu lain.
 */
export async function checkGuestStatus(code: string): Promise<GuestStatusResult> {
  try {
    const { data, error } = await supabase.rpc("check_guest_status", { _code: code });
    if (error || !data) {
      console.warn("RPC check_guest_status error or schema not run yet", error);
      return { found: false, error: error?.message };
    }
    return data as GuestStatusResult;
  } catch (err) {
    return { found: false, error: (err as Error).message };
  }
}

/**
 * Memproses check-in atau check-out cepat di Pos Keamanan / Resepsionis dari hasil pindai QR/Barcode
 * menggunakan fungsi RPC `quick_checkin_by_code`.
 */
export async function quickCheckInByCode(code: string): Promise<GuestStatusResult> {
  try {
    const { data, error } = await supabase.rpc("quick_checkin_by_code", { _code: code });
    if (error || !data) {
      return { found: false, error: error?.message };
    }
    return data as GuestStatusResult;
  } catch (err) {
    return { found: false, error: (err as Error).message };
  }
}
