import { describe, it, expect } from "vitest";
import { calculateDashboardStats, calculatePeriodDiff } from "@/lib/dashboard-analytics";
import type { Guest } from "@/lib/supabase";

describe("dashboard-analytics", () => {
  const mockGuests: Guest[] = [
    {
      id: "1",
      name: "Andi",
      institution: "PT ABC",
      phone: "081234567890",
      employee_id: "emp-1",
      visit_purpose_id: "pur-1",
      notes: "Meeting",
      check_in_time: "2026-10-18T09:15:00Z",
      fill_duration_seconds: 35,
      employees: { name: "Budi", department: "IT Support" },
      visit_purposes: { name: "Meeting / Rapat" },
    },
    {
      id: "2",
      name: "Citra",
      institution: "PT XYZ",
      phone: "081234567891",
      employee_id: "emp-2",
      visit_purpose_id: "pur-2",
      notes: "Interview",
      check_in_time: "2026-10-18T09:45:00Z",
      fill_duration_seconds: 40,
      employees: { name: "Siti", department: "HRD" },
      visit_purposes: { name: "Interview / Rekrutmen" },
    },
    {
      id: "3",
      name: "Doni",
      institution: "JNE Express",
      phone: "081234567892",
      employee_id: null,
      visit_purpose_id: "pur-3",
      notes: "Kirim dokumen",
      check_in_time: "2026-10-18T14:10:00Z",
      fill_duration_seconds: 25,
      employees: null,
      visit_purposes: { name: "Pengiriman Dokumen / Kurir Paket" },
    },
  ];

  it("calculates peak hours correctly", () => {
    const stats = calculateDashboardStats(mockGuests, 7);
    expect(stats.hourlyTraffic).toBeDefined();
    expect(stats.hourlyTraffic.length).toBeGreaterThan(0);

    // There should be a peak marked where visits occurred
    const peakEntries = stats.hourlyTraffic.filter((h) => h.isPeak);
    expect(peakEntries.length).toBeGreaterThan(0);
  });

  it("aggregates visitor counts per department", () => {
    const stats = calculateDashboardStats(mockGuests, 7);
    expect(stats.departments).toBeDefined();

    const itDept = stats.departments.find((d) => d.name === "IT Support");
    const hrdDept = stats.departments.find((d) => d.name === "HRD");
    const generalDept = stats.departments.find((d) => d.name.includes("Resepsionis"));

    expect(itDept).toBeDefined();
    expect(itDept?.count).toBe(1);
    expect(hrdDept).toBeDefined();
    expect(hrdDept?.count).toBe(1);
    expect(generalDept).toBeDefined();
    expect(generalDept?.count).toBe(1);
  });

  it("generates actionable building management insights", () => {
    const stats = calculateDashboardStats(mockGuests, 7);
    expect(stats.insights).toBeDefined();
    expect(stats.insights.length).toBeGreaterThanOrEqual(3);

    const hasPeakInsight = stats.insights.some((i) => i.type === "peak");
    const hasDeptInsight = stats.insights.some((i) => i.type === "department");
    const hasFlowInsight = stats.insights.some((i) => i.type === "flow");

    expect(hasPeakInsight).toBe(true);
    expect(hasDeptInsight).toBe(true);
    expect(hasFlowInsight).toBe(true);
  });

  it("calculates period difference correctly", () => {
    expect(calculatePeriodDiff(120, 100)).toBe(20);
    expect(calculatePeriodDiff(80, 100)).toBe(-20);
    expect(calculatePeriodDiff(100, 0)).toBeNull();
  });
});
