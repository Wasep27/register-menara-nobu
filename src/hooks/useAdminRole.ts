/**
 * Context & Hook RBAC Portal Admin (`src/hooks/useAdminRole.ts`).
 *
 * Menyediakan informasi peran pengguna aktif (`admin`, `security`, `staff`), data profil,
 * serta aksi pembuka modal profil atau penyegaran profil ke seluruh rute turunan `/admin/*`.
 */
import { createContext, useContext, createElement, type ReactNode } from "react";
import type { AppRole } from "@/lib/supabase";

/** Struktur nilai yang dibagikan oleh `AdminRoleContext`. */
export interface AdminRoleContextType {
  /** Daftar peran RBAC yang dimiliki akun dari tabel `user_roles`. */
  userRoles: AppRole[];
  /** Bernilai `true` jika pengguna memiliki hak akses penuh Super Admin. */
  isAdmin: boolean;
  /** Bernilai `true` jika pengguna bertugas di Pos Keamanan / Satpam. */
  isSecurity: boolean;
  /** Bernilai `true` jika pengguna bertugas di Front Desk / Resepsionis. */
  isStaff: boolean;
  /** Nama tampilan pengguna dari tabel `profiles` atau fallback email. */
  userName: string;
  /** URL/DataURL foto avatar pengguna jika sudah diatur. */
  userAvatar?: string | null;
  /** Email akun yang sedang login. */
  userEmail?: string;
  /** Callback untuk membuka dialog edit profil dari sidebar/navbar admin. */
  openProfileModal?: () => void;
  /** Callback untuk memuat ulang data profil & avatar terbaru dari Supabase. */
  refreshProfile?: () => Promise<void>;
}

/** Context React untuk menyebarkan status peran RBAC di dalam layout admin. */
export const AdminRoleContext = createContext<AdminRoleContextType>({
  userRoles: ["admin"],
  isAdmin: true,
  isSecurity: false,
  isStaff: false,
  userName: "",
  userAvatar: null,
  userEmail: "",
});

/** Hook untuk membaca status peran (`isAdmin`, `isSecurity`, `isStaff`) dan profil pengguna aktif. */
export function useAdminRole(): AdminRoleContextType {
  return useContext(AdminRoleContext);
}

/** Properti komponen pembungkus `AdminRoleProvider`. */
export interface AdminRoleProviderProps {
  value: AdminRoleContextType;
  children: ReactNode;
}

/** Provider pembungkus layout admin untuk mendistribusikan konteks RBAC dan profil. */
export function AdminRoleProvider({ value, children }: AdminRoleProviderProps) {
  return createElement(AdminRoleContext.Provider, { value }, children);
}
