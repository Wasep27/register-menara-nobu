import { describe, it, expect } from "vitest";
import {
  filterActivityLogs,
  calculateActivityStats,
  buildSyntheticLogs,
} from "@/lib/activity-log-utils";
import { escapeCsvCell } from "@/lib/csv-export";
import type { ActivityLog } from "@/lib/supabase";

describe("activity-log-utils", () => {
  const sampleLogs: ActivityLog[] = [
    {
      id: "1",
      category: "registration",
      action: "GUEST_REGISTERED",
      title: "Registrasi Tamu: John Doe",
      details: { guest_name: "John Doe", institution: "PT ABC", phone: "081234567890" },
      actor_type: "guest",
      actor_id: null,
      actor_email: "Pengunjung Lobi",
      created_at: new Date().toISOString(),
    },
    {
      id: "2",
      category: "feedback",
      action: "FEEDBACK_RECEIVED",
      title: "Ulasan Tamu: 5 ⭐",
      details: { rating: 5, comment: "Layanan sangat memuaskan" },
      actor_type: "guest",
      actor_id: null,
      actor_email: "Pengunjung Lobi",
      created_at: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: "3",
      category: "master_data",
      action: "EMPLOYEE_RECORD",
      title: "Master Karyawan: Siti",
      details: { name: "Siti", department: "HRD" },
      actor_type: "admin",
      actor_id: null,
      actor_email: "admin@menaranobu.com",
      created_at: new Date(Date.now() - 172800000).toISOString(),
    },
  ];

  it("filters logs by category correctly", () => {
    const regLogs = filterActivityLogs(sampleLogs, {
      selectedCategory: "registration",
      timeFilter: "all",
      startDate: "",
      endDate: "",
      searchQuery: "",
    });
    expect(regLogs).toHaveLength(1);
    expect(regLogs[0]?.category).toBe("registration");
  });

  it("filters logs by search term in title or details", () => {
    const result = filterActivityLogs(sampleLogs, {
      selectedCategory: "all",
      timeFilter: "all",
      startDate: "",
      endDate: "",
      searchQuery: "John",
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.title).toContain("John");
  });

  it("calculates activity stats correctly", () => {
    const stats = calculateActivityStats(sampleLogs);
    expect(stats.total).toBe(3);
    expect(stats.registrations).toBe(1);
    expect(stats.feedbackCount).toBe(1);
    expect(stats.masterDataMutations).toBe(1);
  });

  it("builds synthetic logs from raw entities", () => {
    const synthetic = buildSyntheticLogs(
      [
        {
          id: "g1",
          name: "Alice",
          institution: "Nobu",
          phone: "0812345678",
          check_in_time: new Date().toISOString(),
        },
      ],
      [{ id: "f1", rating: 5, guest_name: "Bob", created_at: new Date().toISOString() }],
      [{ id: "e1", name: "Charlie", department: "IT", created_at: new Date().toISOString() }],
    );
    expect(synthetic.length).toBe(3);
    expect(synthetic.some((l) => l.category === "registration")).toBe(true);
    expect(synthetic.some((l) => l.category === "feedback")).toBe(true);
    expect(synthetic.some((l) => l.category === "master_data")).toBe(true);
  });
});

describe("csv-export security", () => {
  it("escapes formula injection characters (=, +, -, @)", () => {
    expect(escapeCsvCell("=SUM(A1:A10)")).toBe('"\'=SUM(A1:A10)"');
    expect(escapeCsvCell("+123456")).toBe('"\'+123456"');
    expect(escapeCsvCell("-500")).toBe('"\'-500"');
    expect(escapeCsvCell("@command")).toBe('"\'@command"');
  });

  it("escapes quotes properly", () => {
    expect(escapeCsvCell('Hello "World"')).toBe('"Hello ""World"""');
  });
});
