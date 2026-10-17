import {
  Activity,
  BarChart3,
  BookOpen,
  Building2,
  Compass,
  HelpCircle,
  Home,
  LayoutDashboard,
  Mail,
  MessageSquareHeart,
  QrCode,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
} from "lucide-react";
import type { NavItem, RouteMetaItem } from "./navTypes";

export const ROUTE_METADATA: Record<string, RouteMetaItem> = {
  "/admin": {
    icon: LayoutDashboard,
    desc: "Ikhtisar statistik & metrik hari ini",
    category: "Menu Utama",
  },
  "/admin/tamu": {
    icon: Users,
    desc: "Kelola daftar hadir & check-in tamu",
    category: "Menu Utama",
  },
  "/admin/laporan": {
    icon: BarChart3,
    desc: "Grafik analitik & ekspor data",
    category: "Menu Utama",
  },
  "/admin/aktivitas": {
    icon: Activity,
    desc: "Jejak audit & riwayat operasional",
    category: "Menu Utama",
  },
  "/admin/karyawan": {
    icon: UserCheck,
    desc: "Direktori staf penerima tamu",
    category: "Operasional & Data",
  },
  "/admin/tujuan": {
    icon: Building2,
    desc: "Unit kerja, divisi & ruang meeting",
    category: "Operasional & Data",
  },
  "/admin/feedback": {
    icon: MessageSquareHeart,
    desc: "Evaluasi & indeks kepuasan tamu",
    category: "Operasional & Data",
  },
  "/admin/email-admin": {
    icon: Mail,
    desc: "Konfigurasi penerima notifikasi",
    category: "Sistem & Akses",
  },
  "/admin/pengguna": {
    icon: ShieldCheck,
    desc: "Pengaturan akun admin & akses",
    category: "Sistem & Akses",
  },
  "/admin/panduan": {
    icon: BookOpen,
    desc: "Dokumentasi & panduan teknis",
    category: "Sistem & Akses",
  },
  "#fitur": {
    icon: Sparkles,
    desc: "Keunggulan & fitur sistem",
    category: "Informasi",
  },
  "#alur": {
    icon: Compass,
    desc: "Alur pendaftaran & kunjungan",
    category: "Informasi",
  },
  "#faq": {
    icon: HelpCircle,
    desc: "Pertanyaan yang sering diajukan",
    category: "Informasi",
  },
  "/panduan": {
    icon: BookOpen,
    desc: "Buku petunjuk operasional",
    category: "Navigasi",
  },
  "/registrasi": {
    icon: Users,
    desc: "Pendaftaran tamu & buku tamu",
    category: "Navigasi",
  },
  "/admin/scan": {
    icon: QrCode,
    desc: "Pos verifikasi keamanan & pemindai pass",
    category: "Operasional & Data",
  },
  "/karyawan": {
    icon: UserCheck,
    desc: "Portal notifikasi staf",
    category: "Navigasi",
  },
  "/": {
    icon: Home,
    desc: "Halaman beranda utama",
    category: "Navigasi",
  },
};

export const CORE_PUBLIC_LINKS: NavItem[] = [
  { to: "/", label: "Beranda", icon: Home },
  { to: "/registrasi", label: "Registrasi", icon: Users },
  { to: "/panduan", label: "Panduan", icon: BookOpen },
  { to: "/karyawan", label: "Karyawan", icon: UserCheck },
];
