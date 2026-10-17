import type { ActivityLog } from "@/lib/supabase";

export interface LogFilterParams {
  selectedCategory: string;
  timeFilter: "today" | "7d" | "30d" | "all";
  startDate: string;
  endDate: string;
  searchQuery: string;
}

export interface ActivityStats {
  total: number;
  todayCount: number;
  todayRegistrations: number;
  registrations: number;
  masterDataMutations: number;
  feedbackCount: number;
}

/**
 * Membangun synthetic activity logs dari data tamu, feedback, dan karyawan
 * sebagai fallback transparan jika tabel activity_logs belum memiliki rekaman.
 */
export function buildSyntheticLogs(
  guestsData: unknown[] | null,
  feedbackData: unknown[] | null,
  employeesData: unknown[] | null,
): ActivityLog[] {
  const synthetic: ActivityLog[] = [];

  if (Array.isArray(guestsData)) {
    (guestsData as Record<string, unknown>[]).forEach((g) => {
      synthetic.push({
        id: `guest-${String(g["id"])}`,
        category: "registration",
        action: "GUEST_REGISTERED",
        title: `Registrasi Tamu: ${String(g["name"])}`,
        details: {
          guest_name: g["name"],
          institution: g["institution"],
          phone: g["phone"],
          employee_name: (g["employees"] as Record<string, unknown> | null)?.["name"] ?? "-",
          purpose_name: (g["visit_purposes"] as Record<string, unknown> | null)?.["name"] ?? "-",
          is_important: g["is_important"],
          fill_duration_seconds: g["fill_duration_seconds"],
        },
        actor_type: "guest",
        actor_id: null,
        actor_email: "Pengunjung Lobi",
        created_at: String(g["check_in_time"]),
      });
    });
  }

  if (Array.isArray(feedbackData)) {
    (feedbackData as Record<string, unknown>[]).forEach((f) => {
      synthetic.push({
        id: `feedback-${String(f["id"])}`,
        category: "feedback",
        action: "FEEDBACK_RECEIVED",
        title: `Ulasan Tamu: ${Number(f["rating"])} ⭐ dari ${String(f["guest_name"] || "Pengunjung")}`,
        details: {
          rating: f["rating"],
          tags: f["tags"],
          comment: f["comment"],
          guest_name: f["guest_name"],
          institution: f["institution"],
        },
        actor_type: "guest",
        actor_id: null,
        actor_email: String(f["guest_name"] || "Pengunjung Lobi"),
        created_at: String(f["created_at"]),
      });
    });
  }

  if (Array.isArray(employeesData)) {
    (employeesData as Record<string, unknown>[]).forEach((e) => {
      synthetic.push({
        id: `emp-${String(e["id"])}`,
        category: "master_data",
        action: "EMPLOYEE_RECORD",
        title: `Master Karyawan: ${String(e["name"])} (${String(e["department"] || "Umum")})`,
        details: {
          name: e["name"],
          department: e["department"],
          is_active: e["is_active"],
        },
        actor_type: "admin",
        actor_id: null,
        actor_email: "Sistem Admin",
        created_at: String(e["created_at"] || new Date().toISOString()),
      });
    });
  }

  synthetic.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return synthetic;
}

/**
 * Filter murni data log aktivitas berdasarkan kriteria multi-dimensi.
 */
export function filterActivityLogs(logs: ActivityLog[], params: LogFilterParams): ActivityLog[] {
  const { selectedCategory, timeFilter, startDate, endDate, searchQuery } = params;
  const now = new Date();
  const todayStr = now.toDateString();
  const term = searchQuery.trim().toLowerCase();

  return logs.filter((l) => {
    if (selectedCategory !== "all" && l.category !== selectedCategory) {
      return false;
    }

    const logDate = new Date(l.created_at);

    if (startDate) {
      const start = new Date(`${startDate}T00:00:00`);
      if (logDate < start) return false;
    }

    if (endDate) {
      const end = new Date(`${endDate}T23:59:59.999`);
      if (logDate > end) return false;
    }

    if (!startDate && !endDate) {
      if (timeFilter === "today" && logDate.toDateString() !== todayStr) {
        return false;
      }
      if (timeFilter === "7d") {
        const diffDays = (now.getTime() - logDate.getTime()) / (1000 * 3600 * 24);
        if (diffDays > 7) return false;
      }
      if (timeFilter === "30d") {
        const diffDays = (now.getTime() - logDate.getTime()) / (1000 * 3600 * 24);
        if (diffDays > 30) return false;
      }
    }

    if (term) {
      const matchesTitle = l.title.toLowerCase().includes(term);
      const matchesAction = l.action.toLowerCase().includes(term);
      const matchesActor = (l.actor_email || l.actor_type || "").toLowerCase().includes(term);

      const guestName = String(l.details?.["guest_name"] || "").toLowerCase();
      const guestInst = String(l.details?.["institution"] || "").toLowerCase();
      const guestPhone = String(l.details?.["phone"] || "").toLowerCase();
      const employeeName = String(l.details?.["employee_name"] || "").toLowerCase();
      const purposeName = String(l.details?.["purpose_name"] || "").toLowerCase();
      const detailsJson = JSON.stringify(l.details || {}).toLowerCase();

      return (
        matchesTitle ||
        matchesAction ||
        matchesActor ||
        guestName.includes(term) ||
        guestInst.includes(term) ||
        guestPhone.includes(term) ||
        employeeName.includes(term) ||
        purposeName.includes(term) ||
        detailsJson.includes(term)
      );
    }

    return true;
  });
}

/**
 * Agregasi metrik analitik ringkasan log aktivitas.
 */
export function calculateActivityStats(logs: ActivityLog[]): ActivityStats {
  const todayStr = new Date().toDateString();
  let todayCount = 0;
  let todayRegistrations = 0;
  let registrations = 0;
  let masterDataMutations = 0;
  let feedbackCount = 0;

  logs.forEach((l) => {
    const isToday = new Date(l.created_at).toDateString() === todayStr;
    if (isToday) {
      todayCount++;
      if (l.category === "registration") todayRegistrations++;
    }
    if (l.category === "registration") registrations++;
    if (l.category === "master_data") masterDataMutations++;
    if (l.category === "feedback") feedbackCount++;
  });

  return {
    total: logs.length,
    todayCount,
    todayRegistrations,
    registrations,
    masterDataMutations,
    feedbackCount,
  };
}
