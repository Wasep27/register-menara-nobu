import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { escapeCsvCell, exportToExcel, exportToPdf, exportToCsv } from "@/lib/export-utils";

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
    it("creates an xlsx workbook and triggers download without throwing", () => {
      expect(() => {
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
        });
      }).not.toThrow();
    });
  });

  describe("exportToPdf", () => {
    it("generates a PDF document without throwing", () => {
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
