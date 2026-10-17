import { describe, it, expect } from "vitest";
import { guestSchema, employeeSchema, purposeSchema } from "@/lib/validation";

const guest = {
  name: "Budi Santoso",
  institution: "PT Maju",
  phone: "0812 3456 7890",
  visit_purpose_id: "a",
  employee_id: "b",
  notes: "",
  scheduled_at: "",
  is_important: "",
};

describe("validasi", () => {
  it("tamu valid diterima", () => expect(guestSchema.safeParse(guest).success).toBe(true));
  it("nama tamu wajib", () =>
    expect(guestSchema.safeParse({ ...guest, name: " " }).success).toBe(false));
  it("telepon harus nomor ponsel", () =>
    expect(guestSchema.safeParse({ ...guest, phone: "12345678" }).success).toBe(false));
  it("jadwal masa lalu ditolak", () =>
    expect(guestSchema.safeParse({ ...guest, scheduled_at: "2020-01-01T10:00" }).success).toBe(
      false,
    ));
  it("tujuan wajib dipilih", () =>
    expect(guestSchema.safeParse({ ...guest, visit_purpose_id: "" }).success).toBe(false));
  it("email karyawan salah ditolak", () =>
    expect(employeeSchema.safeParse({ name: "Ani", department: "", email: "ani@" }).success).toBe(
      false,
    ));
  it("email karyawan kosong boleh", () =>
    expect(employeeSchema.safeParse({ name: "Ani", department: "", email: "" }).success).toBe(
      true,
    ));
  it("nama tujuan wajib", () => expect(purposeSchema.safeParse({ name: "" }).success).toBe(false));
});
