import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Filter,
  Layers,
  MessageSquare,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  Sparkles,
  Star,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  Eye,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { supabase, type ActivityLog, type Guest, type Employee } from "@/lib/supabase";
import { exportToCsv } from "@/lib/csv-export";
import { formatWibDateTime } from "@/lib/date-utils";
import {
  buildSyntheticLogs,
  filterActivityLogs,
  calculateActivityStats,
} from "@/lib/activity-log-utils";
import { useAdminRole } from "@/hooks/useAdminRole";
import { ActivitySummaryDashboard } from "@/components/ActivitySummaryDashboard";

export const Route = createFileRoute("/admin/aktivitas")({
  head: () => ({
    meta: [
      { title: "Log Aktivitas — Admin Menara Nobu" },
      {
        name: "description",
        content: "Pantau registrasi tamu, mutasi sistem, dan aktivitas gedung secara real-time.",
      },
    ],
  }),
  component: AdminActivityLogPage,
});

export function AdminActivityLogPage() {
  const { isAdmin } = useAdminRole();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayGuestRegistrations, setTodayGuestRegistrations] = useState<number>(0);
  const [totalGuestRegistrations, setTotalGuestRegistrations] = useState<number>(0);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [timeFilter, setTimeFilter] = useState<"today" | "7d" | "30d" | "all">("today");
  const [viewMode, setViewMode] = useState<"timeline" | "table">("timeline");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [toClearLogs, setToClearLogs] = useState(false);

  // Pagination State & Scrolling Anchor
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);
  const listTopRef = useRef<HTMLDivElement | null>(null);

  // Auto reset to page 1 on filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, timeFilter, startDate, endDate, searchQuery, pageSize]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    if (listTopRef.current) {
      listTopRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Load activities from DB with graceful synthetic fallback
  const loadActivities = useCallback(async () => {
    setLoading(true);
    try {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      // 1. Fetch counts independently
      void (async () => {
        try {
          const res = await supabase
            .from("guests")
            .select("id", { count: "exact", head: true })
            .gte("check_in_time", startOfToday.toISOString());
          if (typeof res.count === "number") setTodayGuestRegistrations(res.count);
        } catch {
          // ignore
        }
      })();

      void (async () => {
        try {
          const res = await supabase.from("guests").select("id", { count: "exact", head: true });
          if (typeof res.count === "number") setTotalGuestRegistrations(res.count);
        } catch {
          // ignore
        }
      })();

      // 2. Coba ambil dari tabel activity_logs
      let directLogs: ActivityLog[] = [];
      try {
        const { data, error } = await supabase
          .from("activity_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(1000);

        if (!error && data && data.length > 0) {
          directLogs = data as ActivityLog[];
        }
      } catch (err) {
        console.warn("Query activity_logs ditangani dengan fallback", err);
      }

      if (directLogs.length > 0) {
        setLogs(directLogs);
        setLoading(false);
        return;
      }

      // 3. Fallback sintetis: ambil data tamu, feedback, dan karyawan secara terpisah
      let guestsData: unknown[] = [];
      try {
        const res = await supabase
          .from("guests")
          .select("*, employees(name), visit_purposes(name)")
          .order("check_in_time", { ascending: false })
          .limit(300);

        if (!res.error && res.data) {
          guestsData = res.data;
        } else {
          // Coba tanpa join jika foreign key schema belum sinkron
          const fallbackRes = await supabase
            .from("guests")
            .select("*")
            .order("check_in_time", { ascending: false })
            .limit(300);
          if (fallbackRes.data) guestsData = fallbackRes.data;
        }
      } catch (err) {
        console.warn("Fallback guests query error", err);
      }

      let feedbackData: unknown[] = [];
      try {
        const res = await supabase
          .from("guest_feedback")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50);

        if (!res.error && res.data) {
          feedbackData = res.data;
        } else if (typeof window !== "undefined") {
          feedbackData = JSON.parse(localStorage.getItem("nobu_guest_feedback") || "[]");
        }
      } catch {
        if (typeof window !== "undefined") {
          try {
            feedbackData = JSON.parse(localStorage.getItem("nobu_guest_feedback") || "[]");
          } catch {
            feedbackData = [];
          }
        }
      }

      let employeesData: unknown[] = [];
      try {
        const res = await supabase
          .from("employees")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(20);
        if (res.data) employeesData = res.data;
      } catch (err) {
        console.warn("Fallback employees query error", err);
      }

      const synthetic = buildSyntheticLogs(guestsData, feedbackData, employeesData);
      setLogs(synthetic);
    } catch (err) {
      console.warn("Gagal memuat activity logs", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  // Real-time listener on activity_logs and guests table
  useEffect(() => {
    const channel = supabase
      .channel("admin-realtime-activity")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activity_logs" },
        (payload) => {
          const newEntry = payload.new as ActivityLog;
          setLogs((prev) => [newEntry, ...prev]);
          toast.info(`Aktivitas baru: ${newEntry.title}`);
        },
      )
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "guests" }, (payload) => {
        const newGuest = payload.new as Guest;
        const syntheticEntry: ActivityLog = {
          id: `guest-live-${newGuest.id}`,
          category: "registration",
          action: "GUEST_REGISTERED",
          title: `Registrasi Tamu Baru: ${newGuest.name}`,
          details: {
            guest_name: newGuest.name,
            institution: newGuest.institution,
            phone: newGuest.phone,
          },
          actor_type: "guest",
          actor_id: null,
          actor_email: "Pengunjung Lobi",
          created_at: newGuest.check_in_time || new Date().toISOString(),
        };

        setTodayGuestRegistrations((prev) => prev + 1);
        setTotalGuestRegistrations((prev) => prev + 1);
        setLogs((prev) => {
          if (prev.some((x) => x.id === syntheticEntry.id)) return prev;
          return [syntheticEntry, ...prev];
        });
        toast.success(`Tamu baru tiba di lobi: ${newGuest.name}`);
      })
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "guest_feedback" },
        (payload) => {
          const newFb = payload.new as {
            id?: string;
            rating?: number;
            guest_name?: string | null;
            created_at?: string;
            [key: string]: unknown;
          };
          const fbEntry: ActivityLog = {
            id: `fb-live-${String(newFb.id || Date.now())}`,
            category: "feedback",
            action: "FEEDBACK_RECEIVED",
            title: `Ulasan Masuk: ${newFb.rating ?? 5} ⭐ dari ${newFb.guest_name || "Pengunjung"}`,
            details: newFb as Record<string, unknown>,
            actor_type: "guest",
            actor_id: null,
            actor_email: newFb.guest_name || "Pengunjung Lobi",
            created_at: newFb.created_at || new Date().toISOString(),
          };
          setLogs((prev) => [fbEntry, ...prev]);
        },
      )
      .subscribe((status) => {
        setIsRealtimeConnected(status === "SUBSCRIBED");
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  // Filtered Activities menggunakan pure utility function terpisah
  const filteredLogs = useMemo(() => {
    return filterActivityLogs(logs, {
      selectedCategory,
      timeFilter,
      startDate,
      endDate,
      searchQuery,
    });
  }, [logs, selectedCategory, timeFilter, startDate, endDate, searchQuery]);

  // Derived Pagination Values
  const totalItems = filteredLogs.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const paginatedLogs = useMemo(() => {
    return filteredLogs.slice(startIndex, endIndex);
  }, [filteredLogs, startIndex, endIndex]);

  const pageNumbers = useMemo(() => {
    if (totalPages <= 6) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | "...")[] = [1];
    const left = Math.max(2, validCurrentPage - 1);
    const right = Math.min(totalPages - 1, validCurrentPage + 1);

    if (left > 2) pages.push("...");
    for (let i = left; i <= right; i++) pages.push(i);
    if (right < totalPages - 1) pages.push("...");
    pages.push(totalPages);
    return pages;
  }, [validCurrentPage, totalPages]);

  // Statistics calculation menggunakan pure utility function terpisah
  const stats = useMemo(() => {
    return calculateActivityStats(logs);
  }, [logs]);

  // Export CSV menggunakan centralized exportToCsv
  const exportLogCsv = () => {
    if (filteredLogs.length === 0) {
      toast.error("Tidak ada aktivitas untuk diekspor");
      return;
    }
    exportToCsv({
      filename: `log-aktivitas-menara-nobu-${new Date().toISOString().slice(0, 10)}`,
      headers: [
        "Waktu (WIB)",
        "Kategori",
        "Aksi",
        "Judul Aktivitas",
        "Pelaku / Pengguna",
        "Rincian",
      ],
      rows: filteredLogs.map((l) => [
        formatWibDateTime(l.created_at),
        l.category,
        l.action,
        l.title,
        l.actor_email || l.actor_type,
        JSON.stringify(l.details),
      ]),
    });
    toast.success("Log aktivitas berhasil diekspor");
  };

  const handleClearLogs = async () => {
    try {
      await supabase
        .from("activity_logs")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");
      toast.success("Catatan log aktivitas dibersihkan");
      loadActivities();
    } catch {
      setLogs([]);
      toast.success("Tampilan log aktivitas disetel ulang");
    } finally {
      setToClearLogs(false);
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "registration":
        return {
          label: "Registrasi Tamu",
          bg: "bg-brand-soft text-primary border-brand/30",
          icon: UserCheck,
        };
      case "master_data":
        return {
          label: "Master Data",
          bg: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border-sky-200",
          icon: Layers,
        };
      case "feedback":
        return {
          label: "Feedback",
          bg: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200",
          icon: Star,
        };
      case "security":
        return {
          label: "Keamanan",
          bg: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 border-violet-200",
          icon: Shield,
        };
      default:
        return {
          label: "Sistem",
          bg: "bg-muted text-foreground border-border",
          icon: Activity,
        };
    }
  };

  const getActivityStatusBadge = (log: ActivityLog) => {
    const actionUpper = (log.action || "").toUpperCase();
    const titleLower = (log.title || "").toLowerCase();
    const statusInDetails = String(log.details?.["status"] || "").toUpperCase();

    // Check-out
    if (
      actionUpper.includes("CHECK_OUT") ||
      actionUpper.includes("CHECKOUT") ||
      titleLower.includes("check-out") ||
      titleLower.includes("checkout") ||
      titleLower.includes("keluar") ||
      statusInDetails === "CHECKED_OUT" ||
      statusInDetails === "CHECK-OUT" ||
      statusInDetails === "CHECKOUT"
    ) {
      return {
        label: "Check-out",
        bg: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
        dot: "bg-blue-500",
      };
    }

    // Pre-registered
    if (
      actionUpper.includes("PRE_REG") ||
      actionUpper.includes("PREREG") ||
      actionUpper.includes("RESERV") ||
      actionUpper.includes("INVIT") ||
      titleLower.includes("pre-registered") ||
      titleLower.includes("pra-registrasi") ||
      titleLower.includes("reservasi") ||
      titleLower.includes("undangan") ||
      statusInDetails === "PRE_REGISTERED" ||
      statusInDetails === "PREREGISTERED" ||
      statusInDetails === "RESERVED"
    ) {
      return {
        label: "Pre-registered",
        bg: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
        dot: "bg-purple-500",
      };
    }

    // Check-in (Registrasi Tamu)
    if (
      log.category === "registration" ||
      actionUpper.includes("GUEST_REGISTERED") ||
      actionUpper.includes("CHECK_IN") ||
      actionUpper.includes("CHECKIN") ||
      titleLower.includes("registrasi tamu") ||
      titleLower.includes("tamu baru") ||
      titleLower.includes("check-in") ||
      statusInDetails === "CHECKED_IN" ||
      statusInDetails === "CHECK-IN"
    ) {
      return {
        label: "Check-in",
        bg: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
        dot: "bg-emerald-500",
      };
    }

    // Feedback
    if (log.category === "feedback" || actionUpper.includes("FEEDBACK")) {
      return {
        label: "Feedback",
        bg: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
        dot: "bg-amber-500",
      };
    }

    // Master Data
    if (log.category === "master_data" || actionUpper.includes("RECORD")) {
      return {
        label: "Master Data",
        bg: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800",
        dot: "bg-sky-500",
      };
    }

    // Security
    if (
      log.category === "security" ||
      actionUpper.includes("AUTH") ||
      actionUpper.includes("LOGIN")
    ) {
      return {
        label: "Keamanan",
        bg: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800",
        dot: "bg-violet-500",
      };
    }

    return {
      label: "Sistem",
      bg: "bg-muted text-foreground border-border",
      dot: "bg-muted-foreground",
    };
  };

  return (
    <div className="space-y-6">
      {/* Header & Real-time Indicator */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
              <Activity className="h-3.5 w-3.5 text-primary" />
              Sistem Audit & Pelacakan
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                isRealtimeConnected
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  isRealtimeConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                }`}
              />
              {isRealtimeConnected ? "Real-Time Aktif" : "Menghubungkan..."}
            </span>
          </div>

          <h1 className="mt-1.5 font-display text-2xl font-black text-foreground sm:text-3xl">
            Log Aktivitas & Audit Real-Time
          </h1>
          <p className="text-sm text-muted-foreground">
            Lacak setiap kedatangan tamu, modifikasi master data, ulasan, dan tindakan administratif
            di Menara Nobu secara langsung.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && logs.length > 0 && (
            <button
              onClick={() => setToClearLogs(true)}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 text-xs font-semibold text-destructive shadow-sm transition-all hover:bg-destructive hover:text-destructive-foreground active:scale-95"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Bersihkan Log
            </button>
          )}
          <button
            onClick={exportLogCsv}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-xs font-semibold text-foreground shadow-sm transition-all hover:bg-muted active:scale-95"
          >
            <Download className="h-3.5 w-3.5 text-muted-foreground" />
            Ekspor CSV
          </button>
          <button
            onClick={loadActivities}
            disabled={loading}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground shadow-sm transition-all hover:brightness-110 active:scale-95 disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Segarkan
          </button>
        </div>
      </div>

      {/* Summary Dashboard Component above the activity log */}
      <ActivitySummaryDashboard
        todayGuestCount={
          todayGuestRegistrations > 0 ? todayGuestRegistrations : stats.todayRegistrations
        }
        totalGuestCount={
          totalGuestRegistrations > 0 ? totalGuestRegistrations : stats.registrations
        }
        todayActivityCount={stats.todayCount}
        totalActivityCount={stats.total}
        loading={loading}
      />

      {/* Filter Toolbar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card p-4 shadow-soft sm:p-5">
        {/* Search Bar Row */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Cari tamu (nama, instansi, nomor telepon, tujuan), aktivitas, pelaku..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-input bg-background pl-9 pr-9 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Hapus pencarian"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 sm:justify-start">
            <span className="inline-flex items-center rounded-lg bg-muted px-2.5 py-1.5 text-xs font-medium text-muted-foreground whitespace-nowrap">
              {filteredLogs.length} aktivitas{" "}
              {totalPages > 1 && `(Hal. ${validCurrentPage}/${totalPages})`}
            </span>

            {/* View Mode Toggle */}
            <div className="flex rounded-xl bg-muted p-1">
              <button
                onClick={() => setViewMode("timeline")}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                  viewMode === "timeline"
                    ? "bg-card text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Timeline
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                  viewMode === "table"
                    ? "bg-card text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Tabel
              </button>
            </div>
          </div>
        </div>

        {/* Date Range & Time Preset Row */}
        <div className="flex flex-col gap-2.5 border-t border-border/80 pt-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Custom Date Range Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              <span>Rentang Tanggal:</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1.5 rounded-xl border border-input bg-background px-3 py-1.5 text-xs text-muted-foreground focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/25">
                <span className="font-medium shrink-0">Dari</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setTimeFilter("all");
                  }}
                  className="bg-transparent text-foreground focus:outline-none"
                />
              </label>

              <label className="flex items-center gap-1.5 rounded-xl border border-input bg-background px-3 py-1.5 text-xs text-muted-foreground focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/25">
                <span className="font-medium shrink-0">Sampai</span>
                <input
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setTimeFilter("all");
                  }}
                  className="bg-transparent text-foreground focus:outline-none"
                />
              </label>

              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setStartDate("");
                    setEndDate("");
                    setTimeFilter("today");
                  }}
                  className="rounded-lg border border-border bg-muted/60 px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  title="Hapus filter rentang tanggal"
                >
                  Clear Rentang
                </button>
              )}
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            <span className="text-xs font-semibold text-muted-foreground shrink-0 hidden sm:inline">
              Preset:
            </span>
            <div className="flex rounded-xl bg-muted p-1 shrink-0">
              {(
                [
                  { id: "today", label: "Hari Ini" },
                  { id: "7d", label: "7 Hari" },
                  { id: "30d", label: "30 Hari" },
                  { id: "all", label: "Semua" },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setTimeFilter(t.id);
                    setStartDate("");
                    setEndDate("");
                  }}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                    timeFilter === t.id && !startDate && !endDate
                      ? "bg-card text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Category Filter Pills & Reset */}
        <div className="flex flex-wrap items-center gap-2 border-t border-border/80 pt-3">
          <span className="text-xs font-semibold text-muted-foreground">Kategori:</span>
          {[
            { id: "all", label: "Semua Kategori" },
            { id: "registration", label: "Registrasi Tamu" },
            { id: "master_data", label: "Master Data" },
            { id: "feedback", label: "Feedback Tamu" },
            { id: "security", label: "Keamanan" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                selectedCategory === cat.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "border border-border bg-background text-foreground hover:bg-muted"
              }`}
            >
              {cat.label}
            </button>
          ))}

          {(searchQuery ||
            selectedCategory !== "all" ||
            startDate ||
            endDate ||
            timeFilter !== "today") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
                setStartDate("");
                setEndDate("");
                setTimeFilter("today");
              }}
              className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-primary transition-colors hover:bg-brand-soft"
            >
              Reset Semua Filter
            </button>
          )}
        </div>
      </div>

      {/* Anchor scroll saat navigasi pagination */}
      <div ref={listTopRef} className="scroll-mt-24" />

      {/* Main Activity Content (Timeline or Table) */}
      {loading ? (
        <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-soft space-y-4">
          {[1, 2, 3, 4, 5].map((k) => (
            <div
              key={k}
              className="flex items-start gap-4 border-b border-border/60 pb-4 last:border-0"
            >
              <div className="h-10 w-10 shrink-0 rounded-full skeleton-shimmer" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="h-4 w-48 rounded-full skeleton-shimmer" />
                  <div className="h-3.5 w-24 rounded-full skeleton-shimmer opacity-70" />
                </div>
                <div className="h-3 w-72 rounded-full skeleton-shimmer opacity-60" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-12 text-center shadow-soft">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-primary shadow-sm">
            <Activity className="h-7 w-7" />
          </div>
          <p className="mt-4 font-display text-base font-bold text-foreground">
            Belum ada aktivitas tercatat
          </p>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            {searchQuery || selectedCategory !== "all" || timeFilter !== "today"
              ? "Tidak ada kejadian yang cocok dengan kriteria filter yang Anda pilih."
              : "Setiap registrasi tamu baru atau pembaruan sistem akan otomatis muncul di feed ini secara real-time."}
          </p>
        </div>
      ) : viewMode === "timeline" ? (
        /* TIMELINE VIEW */
        <div className="overflow-hidden rounded-2xl border border-border/80 bg-card p-3.5 shadow-soft sm:p-7">
          <div className="relative pl-5 sm:pl-8">
            {/* Vertical timeline line */}
            <div className="absolute bottom-4 left-2.5 top-4 w-0.5 bg-border sm:left-4" />

            <div className="space-y-4 sm:space-y-6">
              {paginatedLogs.map((log) => {
                const badge = getCategoryBadge(log.category);
                const statusBadge = getActivityStatusBadge(log);
                const IconComponent = badge.icon;
                const isExpanded = expandedLogId === log.id;

                return (
                  <div key={log.id} className="group relative">
                    {/* Bead Icon */}
                    <div
                      className={`absolute -left-5 sm:-left-8 flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-full border-2 border-card shadow-sm transition-transform group-hover:scale-110 ${badge.bg}`}
                    >
                      <IconComponent className="h-3 w-3 sm:h-4 sm:w-4" />
                    </div>

                    {/* Content Box */}
                    <div className="min-w-0 max-w-full overflow-hidden rounded-xl border border-border/80 bg-background/80 p-3 transition-all hover:border-brand/40 hover:shadow-sm sm:rounded-2xl sm:p-4">
                      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          {/* Visual Status Badge (Check-in, Check-out, Pre-registered, etc.) */}
                          <span
                            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${statusBadge.bg}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${statusBadge.dot}`} />
                            {statusBadge.label}
                          </span>

                          {/* Category Badge */}
                          <span
                            className={`inline-block shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badge.bg}`}
                          >
                            {badge.label}
                          </span>

                          <span className="min-w-0 break-words font-display text-sm font-bold text-foreground">
                            {log.title}
                          </span>
                        </div>

                        <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                          <Clock className="h-3 w-3" />
                          {new Date(log.created_at).toLocaleString("id-ID", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          WIB
                        </span>
                      </div>

                      {/* Actor & Action Description - Responsive Mobile Layout */}
                      <div className="mt-2.5 flex min-w-0 max-w-full flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 max-w-full flex-wrap items-center gap-x-2 gap-y-1.5">
                          <div className="inline-flex min-w-0 max-w-full items-center gap-1">
                            <span className="shrink-0 font-semibold text-foreground">Pelaku:</span>
                            <span className="max-w-[200px] truncate rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground sm:max-w-none">
                              {log.actor_email || log.actor_type}
                            </span>
                          </div>
                          <span className="hidden shrink-0 text-muted-foreground/40 sm:inline-block">
                            •
                          </span>
                          <span className="max-w-full break-all rounded border border-border/70 bg-card/70 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground sm:text-[11px]">
                            {log.action}
                          </span>
                        </div>

                        {log.details && Object.keys(log.details).length > 0 && (
                          <button
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            className="inline-flex shrink-0 self-start items-center gap-1 text-xs font-semibold text-primary hover:underline sm:self-auto"
                          >
                            {isExpanded ? (
                              <>
                                Tutup Rincian <ChevronUp className="h-3.5 w-3.5" />
                              </>
                            ) : (
                              <>
                                Lihat Rincian <ChevronDown className="h-3.5 w-3.5" />
                              </>
                            )}
                          </button>
                        )}
                      </div>

                      {/* Expandable JSON details */}
                      {isExpanded && log.details && (
                        <div className="fade-up mt-3 max-w-full overflow-hidden rounded-xl border border-border bg-card p-3 text-xs sm:p-3.5">
                          <p className="mb-1 font-bold text-foreground">Rincian Data Aktivitas:</p>
                          <div className="grid min-w-0 max-w-full gap-2 sm:grid-cols-2">
                            {Object.entries(log.details).map(([k, v]) => (
                              <div
                                key={k}
                                className="flex min-w-0 max-w-full flex-col overflow-hidden"
                              >
                                <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                                  {k}:
                                </span>
                                <span className="break-all text-xs font-semibold text-foreground">
                                  {typeof v === "object" ? JSON.stringify(v) : String(v)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="overflow-x-auto rounded-2xl border border-border/80 bg-card shadow-soft">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/50 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-3.5">Waktu</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Kategori</th>
                <th className="p-3.5">Judul Aktivitas</th>
                <th className="p-3.5">Aksi</th>
                <th className="p-3.5">Pelaku</th>
                <th className="p-3.5 text-right">Rincian</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLogs.map((log) => {
                const badge = getCategoryBadge(log.category);
                const statusBadge = getActivityStatusBadge(log);
                return (
                  <tr key={log.id} className="border-b border-border/60 hover:bg-muted/20">
                    <td className="whitespace-nowrap p-3.5 text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleString("id-ID", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="whitespace-nowrap p-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${statusBadge.bg}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${statusBadge.dot}`} />
                        {statusBadge.label}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-bold ${badge.bg}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="p-3.5 font-semibold text-foreground">{log.title}</td>
                    <td className="p-3.5 font-mono text-xs text-muted-foreground">{log.action}</td>
                    <td className="p-3.5 text-xs text-foreground">
                      {log.actor_email || log.actor_type}
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                        className="rounded-lg p-1 text-primary hover:bg-brand-soft"
                        title="Lihat detail"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Controls Component */}
      {filteredLogs.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3.5 rounded-2xl border border-border/80 bg-card p-3.5 sm:p-4 shadow-soft">
          {/* Info Item & Page Size */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 text-xs text-muted-foreground">
            <span>
              Menampilkan{" "}
              <span className="font-bold text-foreground">
                {totalItems === 0 ? 0 : startIndex + 1}
              </span>
              –<span className="font-bold text-foreground">{endIndex}</span> dari{" "}
              <span className="font-bold text-foreground">{totalItems}</span> aktivitas
            </span>

            <span className="hidden sm:inline text-muted-foreground/40">•</span>

            <div className="inline-flex items-center gap-1.5">
              <span>Per halaman:</span>
              <select
                aria-label="Jumlah log per halaman"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  handlePageChange(1);
                }}
                className="rounded-lg border border-input bg-background px-2 py-1 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          {/* Navigation Controls */}
          {totalPages > 1 && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => handlePageChange(1)}
                disabled={validCurrentPage === 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-all hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
                title="Halaman Pertama"
              >
                <ChevronsLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => handlePageChange(Math.max(1, validCurrentPage - 1))}
                disabled={validCurrentPage === 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-all hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-1 px-1">
                {pageNumbers.map((p, idx) =>
                  p === "..." ? (
                    <span
                      key={`dots-${idx}`}
                      className="px-1 text-xs text-muted-foreground select-none"
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handlePageChange(p as number)}
                      className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-bold transition-all ${
                        validCurrentPage === p
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "border border-border bg-background text-foreground hover:bg-muted"
                      }`}
                    >
                      {p}
                    </button>
                  ),
                )}
              </div>

              <button
                type="button"
                onClick={() => handlePageChange(Math.min(totalPages, validCurrentPage + 1))}
                disabled={validCurrentPage === totalPages}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-all hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
                title="Halaman Berikutnya"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => handlePageChange(totalPages)}
                disabled={validCurrentPage === totalPages}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-all hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
                title="Halaman Terakhir"
              >
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Dialog to Clear Logs */}
      <ConfirmDialog
        open={toClearLogs}
        onOpenChange={setToClearLogs}
        title="Bersihkan Semua Catatan Log?"
        description="Seluruh catatan audit aktivitas akan dihapus permanen. Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Bersihkan"
        destructive={true}
        onConfirm={handleClearLogs}
      />
    </div>
  );
}
