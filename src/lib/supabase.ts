import { createClient } from "@supabase/supabase-js";

export const supabaseUrl =
  import.meta.env["VITE_SUPABASE_URL"] || "https://uugqkbwpjlprtxnjdpcm.supabase.co";
const key =
  import.meta.env["VITE_SUPABASE_ANON_KEY"] ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1Z3FrYndwamxwcnR4bmpkcGNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxNTQ0NDQsImV4cCI6MjEwNzczMDQ0NH0.iKDIQks2uO0o2oNCCwqqMCv7QngZAQOYb12aCtjpXFg";

const isBrowser = typeof window !== "undefined";

export const supabase = createClient(supabaseUrl, key, {
  auth: {
    persistSession: isBrowser,
    autoRefreshToken: isBrowser, // perbarui token sebelum kedaluwarsa
    detectSessionInUrl: isBrowser, // tautan reset password
    flowType: "pkce",
    storageKey: "nobu-auth",
    storage: isBrowser ? window.localStorage : undefined,
  },
});

/** Keluar dari perangkat ini dan bersihkan data sementara. */
export async function signOutLocal() {
  await supabase.auth.signOut({ scope: "local" });
  try {
    sessionStorage.clear();
  } catch {
    /* abaikan */
  }
}

/** Keluar otomatis setelah tidak ada aktivitas. Mengembalikan fungsi pembersih. */
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

export type Employee = { id: string; name: string; department: string | null; is_active: boolean };
export type Purpose = { id: string; name: string; is_active: boolean };
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
  employees?: { name: string } | null;
  visit_purposes?: { name: string } | null;
};

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
