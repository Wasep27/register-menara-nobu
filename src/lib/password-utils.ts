export type PasswordStrengthLevel = "weak" | "medium" | "strong";

export interface PasswordCriterion {
  id: "length" | "uppercase" | "lowercase" | "number" | "symbol";
  label: string;
  met: boolean;
  message: string;
}

export interface PasswordStrength {
  score: number; // 0 to 4
  level: PasswordStrengthLevel;
  label: string;
  colorClass: string;
  textColorClass: string;
  badgeClass: string;
  bgLightClass: string;
  hasMinLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSymbol: boolean;
  isComplete: boolean;
  criteria: PasswordCriterion[];
  missingCriteria: string[];
  feedbackMessage: string;
}

/**
 * Mengevaluasi kekuatan password dengan indikator visual dan pesan validasi spesifik.
 * Level:
 * - weak (merah): < 8 karakter atau hanya 1 jenis karakter
 * - medium (kuning/oranye): 8+ karakter dengan 2-3 jenis karakter
 * - strong (hijau): 8+ karakter dengan kombinasi lengkap (huruf besar, kecil, angka, dan simbol)
 */
export function evaluatePassword(password: string): PasswordStrength {
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);

  const criteria: PasswordCriterion[] = [
    {
      id: "length",
      label: "Minimal 8 karakter",
      met: hasMinLength,
      message: hasMinLength
        ? `Panjang karakter terpenuhi (${password.length} karakter)`
        : `Panjang minimal 8 karakter (saat ini ${password.length}/8)`,
    },
    {
      id: "uppercase",
      label: "Huruf besar (A-Z)",
      met: hasUpper,
      message: hasUpper
        ? "Mengandung huruf kapital (A-Z)"
        : "Wajib mengandung setidaknya 1 huruf besar (A-Z)",
    },
    {
      id: "lowercase",
      label: "Huruf kecil (a-z)",
      met: hasLower,
      message: hasLower
        ? "Mengandung huruf kecil (a-z)"
        : "Wajib mengandung setidaknya 1 huruf kecil (a-z)",
    },
    {
      id: "number",
      label: "Angka (0-9)",
      met: hasNumber,
      message: hasNumber ? "Mengandung angka (0-9)" : "Wajib mengandung setidaknya 1 angka (0-9)",
    },
    {
      id: "symbol",
      label: "Simbol khusus (!@#$%^&*)",
      met: hasSymbol,
      message: hasSymbol
        ? "Mengandung karakter simbol khusus"
        : "Wajib mengandung setidaknya 1 karakter khusus/simbol (!@#$%^&*)",
    },
  ];

  const missingCriteria = criteria.filter((c) => !c.met).map((c) => c.message);
  const isComplete = hasMinLength && hasUpper && hasLower && hasNumber && hasSymbol;

  let score = 0;
  if (hasMinLength) score++;
  if (hasUpper && hasLower) score++;
  if (hasNumber) score++;
  if (hasSymbol) score++;

  let level: PasswordStrengthLevel = "weak";
  let label = "Lemah";
  let colorClass = "bg-rose-500";
  let textColorClass = "text-rose-600 dark:text-rose-400";
  let badgeClass =
    "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-800";
  let bgLightClass = "bg-rose-50 dark:bg-rose-950/20";
  let feedbackMessage =
    missingCriteria.length > 0
      ? missingCriteria[0]
      : "Password masih terlalu pendek dan rentan ditebak.";

  if (!password) {
    label = "Belum diisi";
    feedbackMessage = "Silakan masukkan password yang aman.";
  } else if (score <= 1 || !hasMinLength) {
    level = "weak";
    label = "Lemah";
    colorClass = "bg-rose-500";
    textColorClass = "text-rose-600 dark:text-rose-400";
    badgeClass =
      "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-800";
    bgLightClass = "bg-rose-50 dark:bg-rose-950/20";
    feedbackMessage = missingCriteria[0] || "Kombinasi password masih lemah.";
  } else if (score === 2 || score === 3) {
    level = "medium";
    label = "Sedang";
    colorClass = "bg-amber-500";
    textColorClass = "text-amber-600 dark:text-amber-400";
    badgeClass =
      "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-800";
    bgLightClass = "bg-amber-50 dark:bg-amber-950/20";
    feedbackMessage =
      missingCriteria[0] ||
      "Tingkat keamanan cukup, lengkapi simbol/angka untuk kekuatan maksimal.";
  } else if (score >= 4 && isComplete) {
    level = "strong";
    label = "Kuat";
    colorClass = "bg-emerald-600";
    textColorClass = "text-emerald-600 dark:text-emerald-400";
    badgeClass =
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800";
    bgLightClass = "bg-emerald-50 dark:bg-emerald-950/20";
    feedbackMessage = "Kombinasi password sangat kuat dan memenuhi semua standar keamanan.";
  }

  return {
    score,
    level,
    label,
    colorClass,
    textColorClass,
    badgeClass,
    bgLightClass,
    hasMinLength,
    hasUpper,
    hasLower,
    hasNumber,
    hasSymbol,
    isComplete,
    criteria,
    missingCriteria,
    feedbackMessage,
  };
}

/**
 * Menghasilkan password acak berkekuatan tinggi (14 karakter)
 * Menggabungkan huruf besar, huruf kecil, angka, dan simbol aman.
 */
export function generateStrongPassword(length = 14): string {
  const uppers = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lowers = "abcdefghijkmnopqrstuvwxyz";
  const numbers = "23456789";
  const symbols = "!@#$%^&*_-+=";
  const all = uppers + lowers + numbers + symbols;

  // Pastikan masing-masing kategori ada setidaknya 1 karakter
  const res = [
    uppers[Math.floor(Math.random() * uppers.length)],
    lowers[Math.floor(Math.random() * lowers.length)],
    numbers[Math.floor(Math.random() * numbers.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
  ];

  for (let i = res.length; i < length; i++) {
    res.push(all[Math.floor(Math.random() * all.length)]);
  }

  // Acak posisi karakter dengan Fisher-Yates
  for (let i = res.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [res[i], res[j]] = [res[j], res[i]];
  }

  return res.join("");
}
