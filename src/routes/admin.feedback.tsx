import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Star,
  MessageSquare,
  ThumbsUp,
  Clock,
  Sparkles,
  Search,
  Trash2,
  RefreshCw,
  Download,
  X,
  Building,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  LayoutGrid,
  Table as TableIcon,
  Quote,
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { supabase, type GuestFeedback } from "@/lib/supabase";
import { formatWibDateTime } from "@/lib/date-utils";
import { exportToCsv } from "@/lib/csv-export";
import { useAdminRole } from "@/hooks/useAdminRole";

export const Route = createFileRoute("/admin/feedback")({
  head: () => ({
    meta: [
      { title: "Feedback Tamu — Admin Menara Nobu" },
      {
        name: "description",
        content: "Pantau kepuasan pengunjung, penilaian bintang, dan masukan lobi Menara Nobu.",
      },
    ],
  }),
  component: AdminFeedbackPage,
});

export function AdminFeedbackPage() {
  const { isAdmin } = useAdminRole();
  const [rows, setRows] = useState<GuestFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filterRating, setFilterRating] = useState<number>(0);
  const [toDelete, setToDelete] = useState<GuestFeedback | null>(null);

  // View Mode & Pagination State
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(12);
  const listTopRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("guest_feedback")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) {
        // Fallback to local storage if table is not yet migrated or RLS restricted
        const local = JSON.parse(localStorage.getItem("nobu_guest_feedback") || "[]");
        const formattedLocal: GuestFeedback[] = local.map(
          (item: Record<string, unknown>, idx: number) => ({
            id: String(item["id"] ?? idx),
            guest_name: String(item["guest_name"] || ""),
            institution: String(item["institution"] || ""),
            rating: Number(item["rating"] || 5),
            tags: Array.isArray(item["tags"]) ? (item["tags"] as string[]) : [],
            comment: item["comment"] ? String(item["comment"]) : null,
            fill_duration_seconds: item["fill_duration_seconds"]
              ? Number(item["fill_duration_seconds"])
              : null,
            created_at: String(
              item["submitted_at"] || item["created_at"] || new Date().toISOString(),
            ),
          }),
        );
        setRows(formattedLocal);
      } else {
        setRows((data as GuestFeedback[]) ?? []);
      }
    } catch {
      // Local fallback
      try {
        const local = JSON.parse(localStorage.getItem("nobu_guest_feedback") || "[]");
        setRows(
          local.map((item: Record<string, unknown>, idx: number) => ({
            id: String(item["id"] ?? idx),
            guest_name: String(item["guest_name"] || ""),
            institution: String(item["institution"] || ""),
            rating: Number(item["rating"] || 5),
            tags: Array.isArray(item["tags"]) ? (item["tags"] as string[]) : [],
            comment: item["comment"] ? String(item["comment"]) : null,
            fill_duration_seconds: item["fill_duration_seconds"]
              ? Number(item["fill_duration_seconds"])
              : null,
            created_at: String(
              item["submitted_at"] || item["created_at"] || new Date().toISOString(),
            ),
          })),
        );
      } catch {
        setRows([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Reset to page 1 on filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [q, filterRating, pageSize]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    if (listTopRef.current) {
      listTopRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;

    // Check if id is UUID (from database)
    const isDb = toDelete.id.includes("-");
    if (isDb) {
      const { error } = await supabase.from("guest_feedback").delete().eq("id", toDelete.id);
      if (error) {
        toast.error("Gagal menghapus feedback dari server");
        return;
      }
    }

    // Also remove from localStorage if present
    try {
      const local = JSON.parse(localStorage.getItem("nobu_guest_feedback") || "[]");
      const updated = local.filter(
        (x: Record<string, unknown>) =>
          x["submitted_at"] !== toDelete.created_at && x["guest_name"] !== toDelete.guest_name,
      );
      localStorage.setItem("nobu_guest_feedback", JSON.stringify(updated));
    } catch {
      // ignore
    }

    toast.success("Feedback berhasil dihapus");
    setToDelete(null);
    load();
  };

  // Metrics calculation
  const metrics = useMemo(() => {
    if (rows.length === 0) {
      return {
        avgRating: 0,
        total: 0,
        distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } as Record<number, number>,
        topTags: [] as { tag: string; count: number }[],
        avgDuration: 0,
        highRatingPct: 0,
      };
    }

    const dist: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    const tagCounts: Record<string, number> = {};
    let totalScore = 0;
    const durations: number[] = [];

    rows.forEach((r) => {
      const rate = Math.min(5, Math.max(1, r.rating));
      dist[rate] = (dist[rate] ?? 0) + 1;
      totalScore += rate;

      if (r.tags && Array.isArray(r.tags)) {
        r.tags.forEach((t) => {
          tagCounts[t] = (tagCounts[t] ?? 0) + 1;
        });
      }

      if (r.fill_duration_seconds && r.fill_duration_seconds > 0) {
        durations.push(r.fill_duration_seconds);
      }
    });

    const avgRating = totalScore / rows.length;
    const highRatings = (dist[5] ?? 0) + (dist[4] ?? 0);
    const highRatingPct = Math.round((highRatings / rows.length) * 100);

    const sortedTags = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);

    const avgDuration =
      durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0;

    return {
      avgRating: Number(avgRating.toFixed(1)),
      total: rows.length,
      distribution: dist,
      topTags: sortedTags,
      avgDuration,
      highRatingPct,
    };
  }, [rows]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const matchRating = filterRating === 0 || r.rating === filterRating;
      const term = q.trim().toLowerCase();
      const matchText =
        !term ||
        (r.guest_name ?? "").toLowerCase().includes(term) ||
        (r.institution ?? "").toLowerCase().includes(term) ||
        (r.comment ?? "").toLowerCase().includes(term) ||
        (r.tags ?? []).some((t) => t.toLowerCase().includes(term));
      return matchRating && matchText;
    });
  }, [rows, filterRating, q]);

  // Derived Pagination Values
  const totalItems = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const paginatedRows = useMemo(() => {
    return filteredRows.slice(startIndex, endIndex);
  }, [filteredRows, startIndex, endIndex]);

  const pageNumbers = useMemo(() => {
    if (totalPages <= 6) {
      return Array.from({ length: totalPages }, (_, idx) => idx + 1);
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

  // Export CSV function
  const handleExportCsv = () => {
    if (filteredRows.length === 0) {
      toast.error("Tidak ada data feedback untuk diekspor");
      return;
    }
    exportToCsv({
      filename: `feedback-tamu-nobu-${new Date().toISOString().slice(0, 10)}`,
      headers: [
        "Waktu (WIB)",
        "Nama Tamu",
        "Instansi",
        "Rating (Bintang)",
        "Aspek Dipilih",
        "Komentar / Saran",
        "Durasi Pengisian (detik)",
      ],
      rows: filteredRows.map((r) => [
        formatWibDateTime(r.created_at, false),
        r.guest_name || "Tamu Anonim",
        r.institution || "-",
        `${r.rating} / 5`,
        (r.tags || []).join("; "),
        r.comment || "-",
        r.fill_duration_seconds ? `${r.fill_duration_seconds}` : "-",
      ]),
    });
    toast.success("Data feedback berhasil diekspor ke CSV");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Customer Satisfaction (CSAT)
          </div>
          <h1 className="mt-1 font-display text-2xl font-black text-foreground sm:text-3xl">
            Feedback & Penilaian Tamu
          </h1>
          <p className="text-sm text-muted-foreground">
            Tinjau kepuasan pengunjung mengenai kemudahan dan kecepatan pengisian buku tamu digital.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCsv}
            disabled={filteredRows.length === 0}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-xs font-semibold text-foreground shadow-sm transition-all hover:bg-muted active:scale-95 disabled:opacity-60"
          >
            <Download className="h-3.5 w-3.5 text-muted-foreground" />
            Ekspor CSV
          </button>
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground shadow-sm transition-all hover:brightness-110 active:scale-95 disabled:opacity-60"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? "animate-spin text-primary-foreground" : ""}`}
            />
            Segarkan
          </button>
        </div>
      </div>

      {/* KPI Cards & Metrics */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {/* Card 1: Rata-Rata Bintang */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Skor Rata-Rata</span>
            <div className="flex text-amber-400">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            </div>
          </div>
          {loading ? (
            <div className="mt-2 space-y-2">
              <div className="h-8 w-20 rounded-lg skeleton-shimmer" />
              <div className="h-3.5 w-32 rounded-md skeleton-shimmer" />
            </div>
          ) : (
            <>
              <p className="mt-1 font-display text-2xl font-black text-foreground sm:text-3xl">
                {metrics.total > 0 ? metrics.avgRating : "-"}
                <span className="text-xs font-medium text-muted-foreground sm:text-sm"> / 5.0</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {metrics.total > 0
                  ? `${metrics.highRatingPct}% tamu memberi nilai 4 atau 5 ⭐`
                  : "Belum ada ulasan"}
              </p>
            </>
          )}
        </div>

        {/* Card 2: Total Responden */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Total Responden</span>
            <MessageSquare className="h-4 w-4 text-primary" />
          </div>
          {loading ? (
            <div className="mt-2 space-y-2">
              <div className="h-8 w-16 rounded-lg skeleton-shimmer" />
              <div className="h-3.5 w-28 rounded-md skeleton-shimmer" />
            </div>
          ) : (
            <>
              <p className="mt-1 font-display text-2xl font-black text-primary sm:text-3xl">
                {metrics.total}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {metrics.total > 0 ? "Ulasan pengunjung tersimpan" : "Menunggu pengisian form"}
              </p>
            </>
          )}
        </div>

        {/* Card 3: Kepuasan Cepat (< 1 Menit) */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Rata-Rata Waktu Isi</span>
            <Clock className="h-4 w-4 text-brand" />
          </div>
          {loading ? (
            <div className="mt-2 space-y-2">
              <div className="h-8 w-20 rounded-lg skeleton-shimmer" />
              <div className="h-3.5 w-24 rounded-md skeleton-shimmer" />
            </div>
          ) : (
            <>
              <p className="mt-1 font-display text-2xl font-black text-foreground sm:text-3xl">
                {metrics.avgDuration > 0 ? `${metrics.avgDuration} dtk` : "-"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {metrics.avgDuration > 0
                  ? metrics.avgDuration <= 60
                    ? "Target tercapai: Sangat Cepat ⚡"
                    : "Waktu pengisian efisien"
                  : "Belum ada data durasi"}
              </p>
            </>
          )}
        </div>

        {/* Card 4: Sentimen Sangat Puas */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Kepuasan Positif</span>
            <ThumbsUp className="h-4 w-4 text-primary" />
          </div>
          {loading ? (
            <div className="mt-2 space-y-2">
              <div className="h-8 w-16 rounded-lg skeleton-shimmer" />
              <div className="h-3.5 w-28 rounded-md skeleton-shimmer" />
            </div>
          ) : (
            <>
              <p className="mt-1 font-display text-2xl font-black text-primary sm:text-3xl">
                {metrics.total > 0 ? `${metrics.highRatingPct}%` : "-"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {metrics.total > 0 ? "Menilai mudah & sangat cepat" : "Menunggu ulasan"}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Aspect Breakdown & Star Distribution */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Star Distribution Breakdown */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-soft">
          <h2 className="font-display text-sm font-bold text-foreground sm:text-base">
            Distribusi Rating Bintang
          </h2>
          <div className="mt-3.5 space-y-2.5">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = metrics.distribution[stars] ?? 0;
              const pct = metrics.total > 0 ? Math.round((count / metrics.total) * 100) : 0;
              return (
                <div key={stars} className="flex items-center gap-3 text-xs sm:text-sm">
                  <span className="flex w-14 sm:w-16 items-center gap-1 font-semibold text-foreground">
                    <span>{stars}</span>
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  </span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-16 text-right font-medium text-muted-foreground">
                    {count} ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Aspect Tag Highlights */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-soft">
          <h2 className="font-display text-sm font-bold text-foreground sm:text-base">
            Aspek Paling Disukai Tamu
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Frekuensi pemilihan fitur kemudahan & kenyamanan formulir
          </p>

          {metrics.topTags.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {metrics.topTags.map((item) => (
                <div
                  key={item.tag}
                  className="flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand-soft/70 px-3 py-1.5 text-xs font-semibold text-primary"
                >
                  <span>{item.tag}</span>
                  <span className="rounded-full bg-primary px-1.5 py-0.2 text-[10px] text-primary-foreground">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 text-center text-xs text-muted-foreground">
              Belum ada pilihan aspek yang masuk.
            </div>
          )}
        </div>
      </div>

      {/* Filter and Search Controls Toolbar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card p-4 shadow-soft sm:p-5">
        {/* Search Row */}
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Cari tamu, instansi, saran, atau aspek..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full rounded-xl border border-input bg-background pl-9 pr-9 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Hapus pencarian"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* View Mode Toggle (Desktop) & Counter */}
          <div className="flex items-center justify-between gap-2.5 sm:justify-start">
            <span className="inline-flex items-center rounded-lg bg-muted px-2.5 py-1.5 text-xs font-medium text-muted-foreground whitespace-nowrap">
              {filteredRows.length} ulasan{" "}
              {totalPages > 1 && `(Hal. ${validCurrentPage}/${totalPages})`}
            </span>

            {/* Desktop View Switcher */}
            <div className="hidden sm:flex rounded-xl bg-muted p-1">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                  viewMode === "cards"
                    ? "bg-card text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Kartu
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                  viewMode === "table"
                    ? "bg-card text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <TableIcon className="h-3.5 w-3.5" />
                Tabel
              </button>
            </div>
          </div>
        </div>

        {/* Rating Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 border-t border-border/80 pt-3">
          <span className="text-xs font-semibold text-muted-foreground shrink-0">
            Filter Bintang:
          </span>
          {[
            { value: 0, label: "Semua Bintang" },
            { value: 5, label: "5 Bintang" },
            { value: 4, label: "4 Bintang" },
            { value: 3, label: "3 Bintang" },
            { value: 2, label: "2 Bintang" },
            { value: 1, label: "1 Bintang" },
          ].map((pill) => (
            <button
              key={pill.value}
              type="button"
              onClick={() => setFilterRating(pill.value)}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                filterRating === pill.value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "border border-border bg-background text-foreground hover:bg-muted"
              }`}
            >
              {pill.value > 0 && <Star className="h-3 w-3 fill-amber-400 text-amber-400" />}
              {pill.label}
            </button>
          ))}

          {(q || filterRating > 0) && (
            <button
              type="button"
              onClick={() => {
                setQ("");
                setFilterRating(0);
              }}
              className="ml-auto text-xs font-semibold text-primary transition-colors hover:underline"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* Anchor for smooth scroll on page change */}
      <div ref={listTopRef} className="scroll-mt-24" />

      {/* Main Feedback Content (Cards or Table) */}
      {loading ? (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-border/80 bg-card p-4 shadow-soft space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="h-4 w-28 rounded-full skeleton-shimmer" />
                <div className="h-5 w-16 rounded-full skeleton-shimmer" />
              </div>
              <div className="h-3 w-40 rounded-full skeleton-shimmer opacity-70" />
              <div className="h-14 w-full rounded-xl skeleton-shimmer opacity-40" />
              <div className="flex justify-between">
                <div className="h-3 w-20 rounded-full skeleton-shimmer" />
                <div className="h-3 w-12 rounded-full skeleton-shimmer" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-12 text-center shadow-soft">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-primary shadow-sm">
            <MessageSquare className="h-7 w-7" />
          </div>
          <p className="mt-4 font-display text-base font-bold text-foreground">
            {q || filterRating > 0 ? "Tidak ada feedback yang cocok" : "Belum ada feedback tamu"}
          </p>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            {q || filterRating > 0
              ? "Coba ubah kata kunci pencarian atau bersihkan filter bintang di atas."
              : "Setelah pengunjung memberikan ulasan melalui formulir registrasi lobi, ulasan akan tampil di sini."}
          </p>
        </div>
      ) : viewMode === "cards" ? (
        /* RESPONSIVE CARDS VIEW (Optimized for Mobile & Compact Display) */
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {paginatedRows.map((r) => (
            <div
              key={r.id}
              className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-card p-4 shadow-soft transition-all hover:border-brand/40 hover:shadow-md"
            >
              {/* Card Header: Name, Institution, Star Rating Badge, Date */}
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-sm font-bold text-foreground">
                      {r.guest_name || "Tamu Anonim"}
                    </p>
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <Building className="h-3 w-3 shrink-0 text-muted-foreground/70" />
                      <span className="truncate">{r.institution || "Pengunjung Lobi"}</span>
                    </div>
                  </div>

                  {/* Rating Badge */}
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-400">
                    <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                    {r.rating} / 5
                  </span>
                </div>

                {/* Comment / Review Quote */}
                {r.comment ? (
                  <div className="relative rounded-xl border border-border/70 bg-muted/40 p-3 text-xs text-foreground italic leading-relaxed">
                    <Quote className="absolute right-2 top-2 h-3.5 w-3.5 text-muted-foreground/30 pointer-events-none" />
                    "{r.comment}"
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground/70 italic">
                    Tanpa catatan tambahan
                  </p>
                )}

                {/* Tags Chips */}
                {r.tags && r.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {r.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md border border-brand/20 bg-brand-soft/70 px-2 py-0.5 text-[10.5px] font-semibold text-primary"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Card Footer: Fill Duration, Date, and Delete Button */}
              <div className="mt-3.5 flex items-center justify-between border-t border-border/60 pt-2.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-[11px]">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    {r.fill_duration_seconds ? `${r.fill_duration_seconds} dtk` : "—"}
                  </span>
                  <span className="text-muted-foreground/40">•</span>
                  <span className="text-[11px]">{formatWibDateTime(r.created_at, false)}</span>
                </div>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setToDelete(r)}
                    className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive active:scale-95"
                    title="Hapus ulasan ini"
                    aria-label="Hapus ulasan"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* TABLE VIEW (For Desktop users who prefer structured rows) */
        <div className="overflow-x-auto rounded-2xl border border-border/80 bg-card shadow-soft">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/50 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-3.5">Waktu</th>
                <th className="p-3.5">Nama & Instansi</th>
                <th className="p-3.5">Rating</th>
                <th className="p-3.5">Aspek Dipilih</th>
                <th className="p-3.5">Komentar / Saran</th>
                <th className="p-3.5">Durasi</th>
                {isAdmin && <th className="p-3.5 text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {paginatedRows.map((r) => (
                <tr key={r.id} className="border-b border-border/60 hover:bg-muted/20">
                  <td className="whitespace-nowrap p-3.5 text-xs text-muted-foreground">
                    {formatWibDateTime(r.created_at, false)}
                  </td>
                  <td className="p-3.5">
                    <p className="font-bold text-foreground">{r.guest_name || "Tamu Anonim"}</p>
                    {r.institution && (
                      <p className="text-xs text-muted-foreground">{r.institution}</p>
                    )}
                  </td>
                  <td className="whitespace-nowrap p-3.5">
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-400">
                      <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                      {r.rating} / 5
                    </span>
                  </td>
                  <td className="p-3.5">
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {r.tags && r.tags.length > 0 ? (
                        r.tags.map((t) => (
                          <span
                            key={t}
                            className="rounded-md border border-brand/20 bg-brand-soft/70 px-2 py-0.5 text-[11px] font-semibold text-primary"
                          >
                            {t}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                  </td>
                  <td className="p-3.5 text-xs text-foreground max-w-sm">
                    {r.comment ? (
                      <span className="italic">"{r.comment}"</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap p-3.5 text-xs text-muted-foreground">
                    {r.fill_duration_seconds ? `${r.fill_duration_seconds} dtk` : "—"}
                  </td>
                  {isAdmin && (
                    <td className="whitespace-nowrap p-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => setToDelete(r)}
                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive active:scale-95"
                        title="Hapus Feedback"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Controls Component */}
      {filteredRows.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3.5 rounded-2xl border border-border/80 bg-card p-3.5 sm:p-4 shadow-soft">
          {/* Info Item & Page Size */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 text-xs text-muted-foreground">
            <span>
              Menampilkan{" "}
              <span className="font-bold text-foreground">
                {totalItems === 0 ? 0 : startIndex + 1}
              </span>
              –<span className="font-bold text-foreground">{endIndex}</span> dari{" "}
              <span className="font-bold text-foreground">{totalItems}</span> ulasan
            </span>

            <span className="hidden sm:inline text-muted-foreground/40">•</span>

            <div className="inline-flex items-center gap-1.5">
              <span>Per halaman:</span>
              <select
                aria-label="Jumlah feedback per halaman"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  handlePageChange(1);
                }}
                className="rounded-lg border border-input bg-background px-2 py-1 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value={9}>9</option>
                <option value={12}>12</option>
                <option value={24}>24</option>
                <option value={48}>48</option>
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

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Hapus data feedback?"
        description={`Ulasan dari ${toDelete?.guest_name || "tamu ini"} (${toDelete?.rating} ⭐) akan dihapus secara permanen.`}
        confirmLabel="Hapus"
        destructive={true}
        onConfirm={handleDelete}
      />
    </div>
  );
}
