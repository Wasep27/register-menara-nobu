import { createClient } from "@supabase/supabase-js";

const url = import.meta.env["VITE_SUPABASE_URL"] || "https://uugqkbwpjlprtxnjdpcm.supabase.co";
const key =
  import.meta.env["VITE_SUPABASE_ANON_KEY"] ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1Z3FrYndwamxwcnR4bmpkcGNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxNTQ0NDQsImV4cCI6MjEwNzczMDQ0NH0.iKDIQks2uO0o2oNCCwqqMCv7QngZAQOYb12aCtjpXFg";

export const supabase = createClient(url, key, {
  auth: {
    persistSession: typeof window !== "undefined",
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  },
});

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
