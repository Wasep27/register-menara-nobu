/** Palet warna yang senada dan harmonis dengan tema utama Menara Nobu (Emerald, Teal, Forest, Sage, Slate Pine).
 * Menghindari warna yang terlalu kontras/menyolok (seperti neon merah/pink/kuning terang) agar visual tetap elegan dan menyatu.
 */
const NOBU_AVATAR_PALETTES = [
  // 1. Signature Nobu Emerald
  { bg: "linear-gradient(135deg, #07936e, #046249)", border: "rgba(16, 213, 160, 0.3)" },
  // 2. Deep Ocean Teal
  { bg: "linear-gradient(135deg, #0d9488, #0f766e)", border: "rgba(45, 212, 191, 0.3)" },
  // 3. Dark Pine Forest
  { bg: "linear-gradient(135deg, #166534, #14532d)", border: "rgba(74, 222, 128, 0.25)" },
  // 4. Cyan Teal
  { bg: "linear-gradient(135deg, #0891b2, #0e7490)", border: "rgba(56, 189, 248, 0.25)" },
  // 5. Deep Spruce Slate
  { bg: "linear-gradient(135deg, #164e63, #083344)", border: "rgba(6, 182, 212, 0.25)" },
  // 6. Forest Evergreen
  { bg: "linear-gradient(135deg, #065f46, #064e3b)", border: "rgba(52, 211, 153, 0.25)" },
  // 7. Dark Teal Jade
  { bg: "linear-gradient(135deg, #115e59, #134e4a)", border: "rgba(45, 212, 191, 0.25)" },
  // 8. Slate Moss / Deep Nobu Pine
  { bg: "linear-gradient(135deg, #1f4e43, #123029)", border: "rgba(16, 213, 160, 0.3)" },
];

/** Avatar inisial dengan warna harmonis dan konsisten berdasarkan nama. */
export function Avatar({
  name,
  size = "md",
  className = "",
}: {
  name: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}) {
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "?";

  // Hitung hash deterministik dari nama agar tiap akun punya warna tetap yang senada
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  const palette =
    NOBU_AVATAR_PALETTES[hash % NOBU_AVATAR_PALETTES.length] ?? NOBU_AVATAR_PALETTES[0]!;

  const cls =
    size === "xs"
      ? "h-6 w-6 text-[10px]"
      : size === "sm"
        ? "h-8 w-8 text-xs"
        : size === "lg"
          ? "h-12 w-12 text-base"
          : "h-10 w-10 text-sm";
  return (
    <span
      aria-hidden
      className={`grid ${cls} shrink-0 select-none place-items-center rounded-full font-display font-bold text-white shadow-xs ${className}`}
      style={{
        background: palette.bg,
        boxShadow: `inset 0 0 0 1px ${palette.border}, 0 2px 6px -1px rgba(7, 147, 110, 0.25)`,
      }}
    >
      {initials}
    </span>
  );
}
