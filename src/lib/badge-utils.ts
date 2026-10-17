import type { Guest } from "@/lib/supabase";
import { formatWibDate, formatWibTime } from "@/lib/date-utils";

export interface VisitorBadgeData {
  id?: string;
  name: string;
  institution: string;
  phone?: string;
  employeeName?: string;
  purposeName?: string;
  checkInTime?: string;
  checkInDate?: string;
  badgeNumber?: string;
}

/**
 * Pemetaan terpusat objek Guest dari database ke VisitorBadgeData untuk modal cetak badge.
 * Menghilangkan duplikasi fungsi openBadgeForGuest / openBadgeModal antar komponen.
 */
export function createVisitorBadgeFromGuest(r: Guest): VisitorBadgeData {
  return {
    id: r.id,
    name: r.name,
    institution: r.institution,
    phone: r.phone,
    employeeName: r.employees?.name ?? undefined,
    purposeName: r.visit_purposes?.name ?? undefined,
    checkInTime: formatWibTime(r.check_in_time),
    checkInDate: formatWibDate(r.check_in_time, true),
    badgeNumber: r.badge_code || undefined,
  };
}
