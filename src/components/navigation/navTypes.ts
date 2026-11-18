/**
 * @module navTypes
 * @description Definisi tipe data bersama untuk sistem navigasi desktop, dock seluler, dan drawer menu.
 */
import type { ComponentType, ReactNode } from "react";

/** Representasi satu item menu atau tautan navigasi pada navbar maupun drawer. */
export type NavItem = {
  /** Path rute TanStack Router (mis. `/admin/tamu`) atau anchor hash (`#fitur`). */
  to: string;
  /** Label teks yang tampil pada tautan navigasi. */
  label: string;
  /** Komponen ikon Lucide opsional untuk dock dan drawer seluler. */
  icon?: ComponentType<{ className?: string }>;
  /** Keterangan singkat fungsi halaman (ditampilkan di drawer seluler). */
  description?: string;
  /** Pengelompokan kategori menu secara manual (menggantikan metadata bawaan). */
  category?: string;
};

/** Properti konfigurasi untuk komponen navbar utama `SiteNav`. */
export interface SiteNavProps {
  /** Daftar menu navigasi yang dirender di header/drawer. */
  items: NavItem[];
  /** Slot elemen tambahan opsional di sisi kanan navbar desktop. */
  right?: ReactNode;
  /** Nama lengkap pengguna terautentikasi (untuk kartu profil & avatar). */
  userName?: string;
  /** URL atau Data URI foto avatar pengguna. */
  userAvatar?: string | null;
  /** Callback saat pengguna menekan tombol keluar sesi. */
  onLogout?: () => void;
  /** Callback untuk membuka modal ubah profil pengguna. */
  onOpenProfile?: () => void;
  /** Menandakan mode panel internal (`/admin/*` atau `/karyawan`) vs halaman publik. */
  isDashboard?: boolean;
  /** Menyembunyikan pintasan tombol Registrasi Tamu (misal di mode petugas/scan). */
  hideRegistration?: boolean;
}

/** Kategori pengelompokan rute di dalam drawer navigasi seluler. */
export type RouteCategory =
  "Menu Utama" | "Operasional & Data" | "Sistem & Akses" | "Informasi" | "Navigasi";

/** Metadata visual dan deskriptif untuk setiap path rute aplikasi. */
export interface RouteMetaItem {
  /** Ikon representatif halaman pada drawer seluler. */
  icon: ComponentType<{ className?: string }>;
  /** Deskripsi singkat fitur halaman di bawah label menu. */
  desc: string;
  /** Kategori grup untuk penyusunan daftar menu di drawer. */
  category: RouteCategory;
}
