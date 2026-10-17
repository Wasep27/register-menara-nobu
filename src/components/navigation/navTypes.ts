import type { ComponentType, ReactNode } from "react";

export type NavItem = {
  to: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  description?: string;
  category?: string;
};

export interface SiteNavProps {
  items: NavItem[];
  right?: ReactNode;
  userName?: string;
  onLogout?: () => void;
  isDashboard?: boolean;
  hideRegistration?: boolean;
}

export type RouteCategory =
  "Menu Utama" | "Operasional & Data" | "Sistem & Akses" | "Informasi" | "Navigasi";

export interface RouteMetaItem {
  icon: ComponentType<{ className?: string }>;
  desc: string;
  category: RouteCategory;
}
