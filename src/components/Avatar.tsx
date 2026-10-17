/** Avatar inisial dengan warna konsisten berdasarkan nama. */
export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "?";
  // Warna diturunkan dari nama agar tiap akun punya warna tetap
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
  const cls = size === "sm" ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm";
  return (
    <span
      aria-hidden
      className={`grid ${cls} shrink-0 select-none place-items-center rounded-full font-display font-bold text-white`}
      style={{ background: `linear-gradient(135deg, hsl(${h} 65% 42%), hsl(${(h + 40) % 360} 65% 32%))` }}
    >
      {initials}
    </span>
  );
}
