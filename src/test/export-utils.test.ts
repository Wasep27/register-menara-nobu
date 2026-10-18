import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  escapeCsvCell,
  exportToExcel,
  exportToPdf,
  exportToCsv,
  exportBadgePassPdf,
  exportDailyVisitLogPdf,
} from "@/lib/export-utils";

describe("export-utils", () => {
  let clickSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  });

  afterEach(() => {
    clickSpy?.mockRestore();
  });

  describe("escapeCsvCell", () => {
    it("handles null and undefined", () => {
      expect(escapeCsvCell(null)).toBe('""');
      expect(escapeCsvCell(undefined)).toBe('""');
    });

    it("escapes CSV formula injection characters", () => {
      expect(escapeCsvCell("=1+1")).toBe('"\'=1+1"');
      expect(escapeCsvCell("+628123")).toBe('"\'+628123"');
      expect(escapeCsvCell("-100")).toBe('"\'-100"');
      expect(escapeCsvCell("@sum")).toBe('"\'@sum"');
    });

    it("escapes double quotes", () => {
      expect(escapeCsvCell('PT "Maju" Jaya')).toBe('"PT ""Maju"" Jaya"');
    });
  });

  describe("exportToExcel", () => {
    it("creates an xlsx workbook and triggers download without throwing", async () => {
      await expect(
        exportToExcel({
          filename: "test-laporan",
          title: "Test Laporan Kunjungan",
          subtitle: "Menara Nobu",
          period: "2026-10-01 s/d 2026-10-18",
          headers: ["No", "Nama", "Instansi", "Tujuan"],
          rows: [
            [1, "Budi", "PT ABC", "Meeting"],
            [2, "Siti", "PT XYZ", "Interview"],
          ],
        }),
      ).resolves.not.toThrow();
    });
  });

  describe("exportToPdf", () => {
    it("generates a PDF document with Nobu theme and logo without throwing", () => {
      expect(() => {
        exportToPdf({
          filename: "test-laporan-pdf",
          title: "Laporan Kunjungan",
          period: "2026-10-18",
          headers: ["No", "Waktu", "Nama Tamu", "Instansi", "Tujuan"],
          rows: [
            [1, "10:00 WIB", "Ahmad", "PT Nobu", "Meeting"],
            [2, "11:00 WIB", "Dewi", "Bank Central", "Pengiriman"],
          ],
        });
      }).not.toThrow();
    });
  });

  describe("exportBadgePassPdf", () => {
    it("generates visitor badge PDF with lanyard format without throwing", () => {
      expect(() => {
        exportBadgePassPdf({
          data: {
            id: "guest-test-123",
            name: "Budi Santoso",
            institution: "PT Teknologi Indonesia",
            badgeNumber: "VTR-001",
            checkInTime: "10:30 WIB",
            checkInDate: "18 Okt 2026",
            employeeName: "Andi Wijaya",
            purposeName: "Meeting Proyek",
          },
          format: "lanyard",
        });
      }).not.toThrow();
    });

    it("generates visitor badge PDF with compact format without throwing", () => {
      expect(() => {
        exportBadgePassPdf({
          data: {
            id: "guest-test-456",
            name: "Siti Rahma",
            institution: "Kementerian Keuangan",
            badgeNumber: "VTR-002",
          },
          format: "compact",
        });
      }).not.toThrow();
    });
  });

  describe("exportDailyVisitLogPdf", () => {
    it("generates daily security visit log PDF with 3-party sign-off without throwing", () => {
      expect(() => {
        exportDailyVisitLogPdf({
          date: "2026-10-18",
          rows: [
            {
              id: "g1",
              name: "Joko",
              institution: "PT Sentosa",
              phone: "08123456789",
              check_in_time: "2026-10-18T03:00:00Z",
              badge_code: "VTR-001",
              is_important: false,
              scheduled_at: null,
              signature_url: null,
              notes: "Tamu VIP",
              created_at: "2026-10-18T03:00:00Z",
              fill_duration_seconds: 30,
              visit_purpose_id: "p1",
              employee_id: "e1",
              employees: { name: "Rina", department: "IT" },
              visit_purposes: { name: "Diskusi Teknis" },
            },
          ],
        });
      }).not.toThrow();
    });
  });

  describe("exportToCsv", () => {
    it("triggers browser download for CSV", () => {
      const appendSpy = vi
        .spyOn(document.body, "appendChild")
        .mockImplementation(() => document.body);
      const removeSpy = vi
        .spyOn(document.body, "removeChild")
        .mockImplementation(() => document.body);

      exportToCsv({
        filename: "test-data",
        headers: ["Nama", "Instansi"],
        rows: [["John", "Acme Corp"]],
      });

      expect(appendSpy).toHaveBeenCalled();
      expect(removeSpy).toHaveBeenCalled();

      appendSpy.mockRestore();
      removeSpy.mockRestore();
    });
  });
});
