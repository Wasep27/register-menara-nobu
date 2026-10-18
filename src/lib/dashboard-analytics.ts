import type { Guest } from "@/lib/supabase";
import { formatWibDate } from "@/lib/date-utils";

export interface HourlyTraffic {
  hour: string;
  hourNum: number;
  count: number;
  isPeak: boolean;
}

export interface DepartmentTraffic {
  name: string;
  count: number;
  percentage: number;
}

export interface BuildingInsight {
  id: string;
  type: "peak" | "department" | "efficiency" | "flow";
  badge: string;
  title: string;
  description: string;
  recommendation: string;
}

export interface DashboardStats {
  todayCount: number;
  busiest?: [string, number] | undefined;
  avg: number | null;
  trend: { name: string; value: number }[];
  purpose: { name: string; value: number }[];
  emp: { name: string; value: number }[];
  hourlyTraffic: HourlyTraffic[];
  departments: DepartmentTraffic[];
  insights: BuildingInsight[];
  generalVisitCount: number;
  staffVisitCount: number;
}

/**
 * Agregasi metrik analitik dashboard admin & manajemen gedung:
 * - Kunjungan per hari (trend harian)
 * - Tamu hari ini
 * - Jam tersibuk & distribusi lalu lintas per jam (peak hours)
 * - Rata-rata durasi isi form
 * - Distribusi tujuan kunjungan
 * - Peringkat karyawan dikunjungi
 * - Distribusi kunjungan per departemen / divisi gedung
 * - Actionable building management insights
 */
export function calculateDashboardStats(rows: Guest[], days: number): DashboardStats {
  const today = new Date().toDateString();
  const perDay = new Map<string, number>();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    perDay.set(d.toDateString(), 0);
  }

  const purpose: Record<string, number> = {};
  const emp: Record<string, number> = {};
  const depts: Record<string, number> = {};
  const hourCounts: Record<number, number> = {};
  let todayCount = 0;
  let generalVisitCount = 0;
  let staffVisitCount = 0;
  const rawDurs: number[] = [];

  // Inisialisasi jam kerja lobi utama (07:00 s/d 18:00 WIB)
  for (let h = 7; h <= 18; h++) {
    hourCounts[h] = 0;
  }

  rows.forEach((r) => {
    const dt = new Date(r.check_in_time);
    const k = dt.toDateString();
    perDay.set(k, (perDay.get(k) ?? 0) + 1);
    if (k === today) todayCount++;

    // Klasifikasi tujuan kunjungan
    const p = r.visit_purposes?.name ?? "Lainnya";
    purpose[p] = (purpose[p] ?? 0) + 1;

    // Klasifikasi staf vs kunjungan umum
    if (!r.employees || !r.employees.name) {
      generalVisitCount++;
      const deptName = "Resepsionis Lobi (Umum)";
      depts[deptName] = (depts[deptName] ?? 0) + 1;
      emp["Resepsionis Lobi (Umum)"] = (emp["Resepsionis Lobi (Umum)"] ?? 0) + 1;
    } else {
      staffVisitCount++;
      const e = r.employees.name;
      emp[e] = (emp[e] ?? 0) + 1;
      const dept = (r.employees.department && r.employees.department.trim()) || "Umum / Kantor";
      depts[dept] = (depts[dept] ?? 0) + 1;
    }

    // Jam kunjungan
    const h = dt.getHours();
    hourCounts[h] = (hourCounts[h] ?? 0) + 1;

    // Durasi pengisian
    if (r.fill_duration_seconds != null && r.fill_duration_seconds > 0) {
      rawDurs.push(r.fill_duration_seconds);
    }
  });

  const validDurs = rawDurs.filter((d) => d >= 10 && d <= 360);
  let calculatedAvg: number | null = null;
  if (validDurs.length > 0) {
    calculatedAvg = Math.round(validDurs.reduce((a, b) => a + b, 0) / validDurs.length);
  } else if (rawDurs.length > 0) {
    const normalizedDurs = rawDurs.map((d) => Math.min(Math.max(d, 15), 120));
    calculatedAvg = Math.round(normalizedDurs.reduce((a, b) => a + b, 0) / normalizedDurs.length);
  }

  // Hitung jam tersibuk
  const busiest = Object.entries(hourCounts)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])[0] as [string, number] | undefined;

  const maxHourCount = Math.max(...Object.values(hourCounts), 0);

  // Susun data distribusi per jam untuk Recharts BarChart
  const hourlyTraffic: HourlyTraffic[] = Object.keys(hourCounts)
    .map(Number)
    .sort((a, b) => a - b)
    .map((h) => {
      const padHour = String(h).padStart(2, "0");
      const count = hourCounts[h] || 0;
      return {
        hour: `${padHour}:00`,
        hourNum: h,
        count,
        isPeak: count > 0 && count === maxHourCount,
      };
    });

  // Susun distribusi per departemen untuk Recharts BarChart
  const totalVisits = rows.length || 1;
  const departments: DepartmentTraffic[] = Object.entries(depts)
    .map(([name, count]) => ({
      name,
      count,
      percentage: Math.round((count / totalVisits) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  const toArr = (o: Record<string, number>) =>
    Object.entries(o)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

  // Buat Actionable Insights untuk Building Management
  const insights: BuildingInsight[] = [];

  if (rows.length > 0) {
    // 1. Peak Hours Insight
    if (busiest && busiest[1] > 0) {
      const startH = Number(busiest[0]);
      const endH = startH + 1;
      const padStart = String(startH).padStart(2, "0");
      const padEnd = String(endH).padStart(2, "0");
      insights.push({
        id: "peak-hours",
        type: "peak",
        badge: "Puncak Kepadatan",
        title: `Jam Sibuk Lobi: ${padStart}:00 - ${padEnd}:00 WIB`,
        description: `Sebanyak ${busiest[1]} tamu check-in tercatat berkumpul di jam ini (${Math.round((busiest[1] / totalVisits) * 100)}% dari volume).`,
        recommendation: `Siagakan personel tambahan di meja lobi utama & siapkan antrean fast-track barcode badge pada pukul ${padStart}:00.`,
      });
    }

    // 2. Department Traffic Insight
    if (departments.length > 0) {
      const topDept = departments[0];
      insights.push({
        id: "top-dept",
        type: "department",
        badge: "Tujuan Terbanyak",
        title: `Divisi ${topDept.name} (${topDept.count} Tamu)`,
        description: `Menerima ${topDept.percentage}% dari total lalu lintas pengunjung gedung dalam ${days} hari terakhir.`,
        recommendation: `Koordinasikan dengan koordinator ${topDept.name} untuk memastikan ruang rapat atau area tunggu lantai terkait tersedia.`,
      });
    }

    // 3. Flow Distribution Insight (Umum vs Karyawan)
    const generalPct = Math.round((generalVisitCount / totalVisits) * 100);
    insights.push({
      id: "traffic-flow",
      type: "flow",
      badge: "Karakteristik Tamu",
      title: `${generalPct}% Tamu Tujuan Umum & Resepsionis`,
      description: `${generalVisitCount} tamu datang untuk urusan umum/logistik, dan ${staffVisitCount} tamu menemui staf spesifik.`,
      recommendation: `Pertahankan papan petunjuk mandiri di lobi untuk kurir & tamu perbankan agar alur masuk tetap cepat tanpa antre.`,
    });

    // 4. Form Efficiency Insight
    if (calculatedAvg != null) {
      const isFast = calculatedAvg <= 45;
      insights.push({
        id: "kiosk-speed",
        type: "efficiency",
        badge: isFast ? "Performa Prima" : "Kecepatan Registrasi",
        title: `Rata-rata Pengisian: ${calculatedAvg} Detik`,
        description: isFast
          ? "Kecepatan check-in pengunjung sangat efisien dan mencegah terjadinya penumpukan di pintu lobi."
          : "Pengisian form masih relatif wajar, namun perlu dorongan scan QR mandiri untuk rombongan tamu besar.",
        recommendation: isFast
          ? "Sistem registrasi digital berjalan lancar dengan throughput lobi yang optimal."
          : "Tempatkan stand banner QR Code di pintu masuk agar tamu dapat mengisi lebih awal di ponsel masing-masing.",
      });
    }
  }

  return {
    todayCount,
    busiest,
    avg: calculatedAvg,
    trend: [...perDay.entries()].map(([k, v]) => ({
      name: formatWibDate(k, false),
      value: v,
    })),
    purpose: toArr(purpose),
    emp: toArr(emp).slice(0, 8),
    hourlyTraffic,
    departments,
    insights,
    generalVisitCount,
    staffVisitCount,
  };
}

/**
 * Hitung selisih persentase vs periode sebelumnya
 */
export function calculatePeriodDiff(currentCount: number, prevCount: number): number | null {
  if (!prevCount) return null;
  return Math.round(((currentCount - prevCount) / prevCount) * 100);
}
