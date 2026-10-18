import { describe, it, expect } from "vitest";
import { evaluatePassword, generateStrongPassword } from "@/lib/password-utils";

describe("password-utils", () => {
  describe("evaluatePassword", () => {
    it("menandai password kosong sebagai belum diisi", () => {
      const res = evaluatePassword("");
      expect(res.label).toBe("Belum diisi");
      expect(res.score).toBe(0);
      expect(res.isComplete).toBe(false);
      expect(res.level).toBe("weak");
    });

    it("menandai password pendek (< 8 karakter) sebagai lemah", () => {
      const res = evaluatePassword("Ab1!");
      expect(res.level).toBe("weak");
      expect(res.label).toBe("Lemah");
      expect(res.hasMinLength).toBe(false);
      expect(res.isComplete).toBe(false);
      expect(res.colorClass).toContain("rose");
      expect(res.missingCriteria[0]).toContain("Panjang minimal 8 karakter");
    });

    it("menandai password tanpa kombinasi angka atau simbol sebagai sedang/lemah", () => {
      const res = evaluatePassword("SemangatPagi");
      expect(res.hasMinLength).toBe(true);
      expect(res.hasUpper).toBe(true);
      expect(res.hasLower).toBe(true);
      expect(res.hasNumber).toBe(false);
      expect(res.hasSymbol).toBe(false);
      expect(res.level).toBe("medium");
      expect(res.label).toBe("Sedang");
      expect(res.colorClass).toContain("amber");
      expect(res.isComplete).toBe(false);
    });

    it("menandai password lengkap dengan huruf besar, kecil, angka, dan simbol sebagai kuat", () => {
      const res = evaluatePassword("NobuTower#2026");
      expect(res.hasMinLength).toBe(true);
      expect(res.hasUpper).toBe(true);
      expect(res.hasLower).toBe(true);
      expect(res.hasNumber).toBe(true);
      expect(res.hasSymbol).toBe(true);
      expect(res.isComplete).toBe(true);
      expect(res.level).toBe("strong");
      expect(res.label).toBe("Kuat");
      expect(res.colorClass).toContain("emerald");
      expect(res.feedbackMessage).toContain("sangat kuat");
    });
  });

  describe("generateStrongPassword", () => {
    it("menghasilkan password acak dengan panjang default 14 karakter", () => {
      const pwd = generateStrongPassword();
      expect(pwd.length).toBe(14);
    });

    it("menghasilkan password acak yang memenuhi seluruh kriteria keamanan kuat", () => {
      for (let i = 0; i < 10; i++) {
        const pwd = generateStrongPassword(16);
        expect(pwd.length).toBe(16);
        const evalRes = evaluatePassword(pwd);
        expect(evalRes.hasMinLength).toBe(true);
        expect(evalRes.hasUpper).toBe(true);
        expect(evalRes.hasLower).toBe(true);
        expect(evalRes.hasNumber).toBe(true);
        expect(evalRes.hasSymbol).toBe(true);
        expect(evalRes.isComplete).toBe(true);
        expect(evalRes.level).toBe("strong");
      }
    });
  });
});
