import type { Guest } from "@/lib/supabase";
import { formatWibDate } from "@/lib/date-utils";

export interface DashboardStats {
  todayCount: number;
  busiest?: [string, number];
  avg: number | null;
  trend: { name: string; value: number }[];
  purpose: { name: string; value: number }[];
  emp: { name: string; value: number }[];
}

/**
 * Agregasi metrik analitik dashboard admin:
 * - Kunjungan per hari (trend)
 * - Tamu hari ini
 * - Jam tersibuk
 * - Rata-rata durasi isi
 * - Distribusi tujuan kunjungan
 * - Peringkat karyawan paling sering dikunjungi
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
  const hour: Record<number, number> = {};
  let todayCount = 0;
  const rawDurs: number[] = [];

  rows.forEach((r) => {
    const dt = new Date(r.check_in_time);
    const k = dt.toDateString();
    perDay.set(k, (perDay.get(k) ?? 0) + 1);
    if (k === today) todayCount++;
    const p = r.visit_purposes?.name ?? "Lainnya";
    purpose[p] = (purpose[p] ?? 0) + 1;
    const e = r.employees?.name ?? "-";
    emp[e] = (emp[e] ?? 0) + 1;
    hour[dt.getHours()] = (hour[dt.getHours()] ?? 0) + 1;
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

  const busiest = Object.entries(hour).sort((a, b) => b[1] - a[1])[0] as [string, number] | undefined;
  const toArr = (o: Record<string, number>) =>
    Object.entries(o)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

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
  };
}

/**
 * Hitung selisih persentase vs periode sebelumnya
 */
export function calculatePeriodDiff(currentCount: number, prevCount: number): number | null {
  if (!prevCount) return null;
  return Math.round(((currentCount - prevCount) / prevCount) * 100);
}
