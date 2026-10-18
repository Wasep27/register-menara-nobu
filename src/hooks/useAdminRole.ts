import { createContext, useContext, createElement, type ReactNode } from "react";
import type { AppRole } from "@/lib/supabase";

export interface AdminRoleContextType {
  userRoles: AppRole[];
  isAdmin: boolean;
  isSecurity: boolean;
  isStaff: boolean;
  userName: string;
  userAvatar?: string | null;
  userEmail?: string;
  openProfileModal?: () => void;
  refreshProfile?: () => Promise<void>;
}

export const AdminRoleContext = createContext<AdminRoleContextType>({
  userRoles: ["admin"],
  isAdmin: true,
  isSecurity: false,
  isStaff: false,
  userName: "",
  userAvatar: null,
  userEmail: "",
});

export function useAdminRole(): AdminRoleContextType {
  return useContext(AdminRoleContext);
}

export interface AdminRoleProviderProps {
  value: AdminRoleContextType;
  children: ReactNode;
}

export function AdminRoleProvider({ value, children }: AdminRoleProviderProps) {
  return createElement(AdminRoleContext.Provider, { value }, children);
}
