import { Check, X, ShieldAlert, ShieldCheck, Shield } from "lucide-react";
import type { PasswordStrength } from "@/lib/password-utils";

interface PasswordStrengthIndicatorProps {
  strength: PasswordStrength;
  password?: string;
  showCriteria?: boolean;
}

export function PasswordStrengthIndicator({
  strength,
  password = "",
  showCriteria = true,
}: PasswordStrengthIndicatorProps) {
  if (!password) {
    return null;
  }

  return (
    <div className="space-y-2.5 pt-1 text-left animate-in fade-in duration-200">
      {/* Header bar: Label & Score Meter */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-medium text-muted-foreground">
          {strength.level === "weak" && <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />}
          {strength.level === "medium" && <Shield className="h-3.5 w-3.5 text-amber-500" />}
          {strength.level === "strong" && <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />}
          <span>Kekuatan Password:</span>
        </div>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${strength.badgeClass}`}
        >
          {strength.label}
        </span>
      </div>

      {/* Segmented Color-Coded Strength Bar */}
      <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full bg-muted/50 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            strength.score >= 1 ? strength.colorClass : "bg-transparent"
          }`}
        />
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            strength.score >= 2 ? strength.colorClass : "bg-transparent"
          }`}
        />
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            strength.score >= 3 ? strength.colorClass : "bg-transparent"
          }`}
        />
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            strength.score >= 4 && strength.isComplete ? strength.colorClass : "bg-transparent"
          }`}
        />
      </div>

      {/* Specific Validation Feedback Message */}
      <div
        className={`rounded-xl border px-3 py-2 text-[11px] leading-relaxed transition-colors ${
          strength.isComplete
            ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-300"
            : strength.level === "medium"
              ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300"
              : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-300"
        }`}
      >
        <div className="flex items-start gap-1.5">
          <span className="font-semibold shrink-0">{strength.isComplete ? "✓" : "ℹ"}</span>
          <span>{strength.feedbackMessage}</span>
        </div>
      </div>

      {/* Detailed Criteria Checklist */}
      {showCriteria && (
        <div className="rounded-xl border border-border/70 bg-muted/30 p-2.5 sm:p-3 space-y-1.5 text-[11px]">
          <p className="font-semibold text-foreground text-xs mb-1.5">
            Kriteria Kompleksitas Password:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1">
            {strength.criteria.map((c) => (
              <div
                key={c.id}
                className={`flex items-center gap-1.5 transition-colors ${
                  c.met
                    ? "text-emerald-600 dark:text-emerald-400 font-medium"
                    : "text-muted-foreground"
                }`}
              >
                <span
                  className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-[9px] shrink-0 ${
                    c.met
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {c.met ? (
                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                  ) : (
                    <X className="h-2.5 w-2.5" />
                  )}
                </span>
                <span className="truncate">{c.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
