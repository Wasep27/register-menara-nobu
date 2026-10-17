import { Activity, Clock, Layers, UserCheck, Users } from "lucide-react";

export interface ActivitySummaryDashboardProps {
  todayGuestCount: number;
  totalGuestCount: number;
  todayActivityCount: number;
  totalActivityCount: number;
  loading?: boolean;
}

export function ActivitySummaryDashboard({
  todayGuestCount,
  totalGuestCount,
  todayActivityCount,
  totalActivityCount,
  loading = false,
}: ActivitySummaryDashboardProps) {
  return (
    <section aria-label="Ringkasan Registrasi Tamu & Aktivitas" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-base font-bold text-foreground">
          <Activity className="h-4 w-4 text-primary" />
          Ringkasan Registrasi & Audit
        </h2>
        <span className="text-xs text-muted-foreground">Pembaruan otomatis real-time</span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Today's Guest Registrations */}
        <div className="relative overflow-hidden rounded-2xl border border-brand/30 bg-gradient-to-br from-brand-soft/80 via-card to-card p-4 shadow-soft sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary">
                Hari Ini
              </span>
              <p className="mt-2 text-xs font-semibold text-muted-foreground">
                Registrasi Tamu Hari Ini
              </p>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-brand/20">
              <UserCheck className="h-5 w-5" />
            </div>
          </div>
          {loading ? (
            <div className="mt-3 space-y-1.5">
              <div className="h-8 w-16 rounded-lg skeleton-shimmer" />
              <div className="h-3 w-28 rounded skeleton-shimmer" />
            </div>
          ) : (
            <>
              <p className="mt-2 font-display text-3xl font-black text-primary">
                {todayGuestCount.toLocaleString("id-ID")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Tamu mendaftar di lobi hari ini</p>
            </>
          )}
        </div>

        {/* Card 2: Overall Total Guest Registrations */}
        <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-muted/40 via-card to-card p-4 shadow-soft sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-bold text-foreground">
                Total Keseluruhan
              </span>
              <p className="mt-2 text-xs font-semibold text-muted-foreground">
                Total Registrasi Tamu
              </p>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-muted text-foreground">
              <Users className="h-5 w-5 text-primary" />
            </div>
          </div>
          {loading ? (
            <div className="mt-3 space-y-1.5">
              <div className="h-8 w-16 rounded-lg skeleton-shimmer" />
              <div className="h-3 w-28 rounded skeleton-shimmer" />
            </div>
          ) : (
            <>
              <p className="mt-2 font-display text-3xl font-black text-foreground">
                {totalGuestCount.toLocaleString("id-ID")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Semua kunjungan tercatat di sistem
              </p>
            </>
          )}
        </div>

        {/* Card 3: Today's System Activities */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-soft sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold text-muted-foreground">Audit Hari Ini</span>
              <p className="mt-2 text-xs font-semibold text-muted-foreground">
                Aktivitas Sistem Hari Ini
              </p>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-primary">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          {loading ? (
            <div className="mt-3 space-y-1.5">
              <div className="h-8 w-16 rounded-lg skeleton-shimmer" />
              <div className="h-3 w-28 rounded skeleton-shimmer" />
            </div>
          ) : (
            <>
              <p className="mt-2 font-display text-2xl font-bold text-foreground">
                {todayActivityCount.toLocaleString("id-ID")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Kejadian & audit hari ini</p>
            </>
          )}
        </div>

        {/* Card 4: Total System Logs */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-soft sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold text-muted-foreground">Database Log</span>
              <p className="mt-2 text-xs font-semibold text-muted-foreground">
                Total Riwayat Aktivitas
              </p>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
              <Layers className="h-4 w-4 text-sky-500" />
            </div>
          </div>
          {loading ? (
            <div className="mt-3 space-y-1.5">
              <div className="h-8 w-16 rounded-lg skeleton-shimmer" />
              <div className="h-3 w-28 rounded skeleton-shimmer" />
            </div>
          ) : (
            <>
              <p className="mt-2 font-display text-2xl font-bold text-foreground">
                {totalActivityCount.toLocaleString("id-ID")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Log audit terpantau</p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
