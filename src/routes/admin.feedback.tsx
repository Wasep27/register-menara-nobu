import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Star,
  MessageSquare,
  ThumbsUp,
  Clock,
  Sparkles,
  Search,
  Filter,
  Trash2,
  RefreshCw,
  TrendingUp,
  AlertCircle,
  Building,
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { supabase, type GuestFeedback } from "@/lib/supabase";
import { formatWibDateTime } from "@/lib/date-utils";

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
  const [rows, setRows] = useState<GuestFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filterRating, setFilterRating] = useState<number | 0>(0);
  const [toDelete, setToDelete] = useState<GuestFeedback | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("guest_feedback")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) {
        // Fallback to local storage if table is not yet migrated
        const local = JSON.parse(localStorage.getItem("nobu_guest_feedback") || "[]");
        const formattedLocal: GuestFeedback[] = local.map(
          (item: Record<string, unknown>, idx: number) => ({
            id: String(idx),
            guest_name: String(item["guest_name"] || ""),
            institution: String(item["institution"] || ""),
            rating: Number(item["rating"] || 5),
            tags: Array.isArray(item["tags"]) ? (item["tags"] as string[]) : [],
            comment: item["comment"] ? String(item["comment"]) : null,
            fill_duration_seconds: item["fill_duration_seconds"]
              ? Number(item["fill_duration_seconds"])
              : null,
            created_at: String(item["submitted_at"] || new Date().toISOString()),
          }),
        );
        setRows(formattedLocal);
      } else {
        setRows((data as GuestFeedback[]) ?? []);
      }
    } catch {
      // Local fallback
      const local = JSON.parse(localStorage.getItem("nobu_guest_feedback") || "[]");
      setRows(
        local.map((item: Record<string, unknown>, idx: number) => ({
          id: String(idx),
          guest_name: String(item["guest_name"] || ""),
          institution: String(item["institution"] || ""),
          rating: Number(item["rating"] || 5),
          tags: Array.isArray(item["tags"]) ? (item["tags"] as string[]) : [],
          comment: item["comment"] ? String(item["comment"]) : null,
          fill_duration_seconds: item["fill_duration_seconds"]
            ? Number(item["fill_duration_seconds"])
            : null,
          created_at: String(item["submitted_at"] || new Date().toISOString()),
        })),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async () => {
    if (!toDelete) return;

    // Check if id is UUID (from database)
    const isDb = toDelete.id.includes("-");
    if (isDb) {
      const { error } = await supabase.from("guest_feedback").delete().eq("id", toDelete.id);
      if (error) {
        toast.error("Gagal menghapus feedback");
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

  const i = "rounded-xl border border-input bg-card px-3.5 py-2 text-sm text-foreground";

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

        <button
          onClick={load}
          disabled={loading}
          className="inline-flex min-h-10 items-center gap-2 self-start rounded-xl border border-border bg-card px-4 text-xs font-semibold text-foreground shadow-sm transition-all hover:bg-muted active:scale-95 disabled:opacity-60"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
          Segarkan
        </button>
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
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-soft">
          <h2 className="font-display text-sm font-bold text-foreground sm:text-base">
            Distribusi Rating Bintang
          </h2>
          <div className="mt-3.5 space-y-2.5">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = metrics.distribution[stars] ?? 0;
              const pct = metrics.total > 0 ? Math.round((count / metrics.total) * 100) : 0;
              return (
                <div key={stars} className="flex items-center gap-3 text-xs sm:text-sm">
                  <span className="flex w-16 items-center gap-1 font-semibold text-foreground">
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
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-soft">
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

      {/* Filter and Search Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Cari tamu / instansi / kata saran..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className={`${i} w-full pl-9`}
            />
          </div>

          <select
            value={filterRating}
            onChange={(e) => setFilterRating(Number(e.target.value))}
            className={`${i} w-full sm:w-auto`}
          >
            <option value={0}>Semua Bintang</option>
            <option value={5}>⭐⭐⭐⭐⭐ (5 Bintang)</option>
            <option value={4}>⭐⭐⭐⭐ (4 Bintang)</option>
            <option value={3}>⭐⭐⭐ (3 Bintang)</option>
            <option value={2}>⭐⭐ (2 Bintang)</option>
            <option value={1}>⭐ (1 Bintang)</option>
          </select>

          {(q || filterRating > 0) && (
            <button
              onClick={() => {
                setQ("");
                setFilterRating(0);
              }}
              className="text-xs font-medium text-primary hover:underline"
            >
              Reset Filter
            </button>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Menampilkan <b>{filteredRows.length}</b> dari {rows.length} ulasan
        </p>
      </div>

      {/* Table & Feedback List */}
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
              <th className="p-3.5 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={idx} className="border-b border-border/60">
                  <td className="p-3.5">
                    <div className="h-4 w-24 rounded-full skeleton-shimmer" />
                  </td>
                  <td className="p-3.5">
                    <div className="space-y-1.5">
                      <div className="h-4 w-32 rounded-full skeleton-shimmer" />
                      <div className="h-3 w-24 rounded-full skeleton-shimmer opacity-75" />
                    </div>
                  </td>
                  <td className="p-3.5">
                    <div className="h-5 w-20 rounded-full skeleton-shimmer" />
                  </td>
                  <td className="p-3.5">
                    <div className="h-4 w-36 rounded-full skeleton-shimmer opacity-80" />
                  </td>
                  <td className="p-3.5">
                    <div className="h-4 w-44 rounded-full skeleton-shimmer opacity-60" />
                  </td>
                  <td className="p-3.5">
                    <div className="h-4 w-14 rounded-full skeleton-shimmer opacity-70" />
                  </td>
                  <td className="p-3.5 text-right">
                    <div className="ml-auto h-4 w-12 rounded-full skeleton-shimmer opacity-50" />
                  </td>
                </tr>
              ))
            ) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-12 text-center">
                  <div className="mx-auto flex max-w-sm flex-col items-center justify-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-primary shadow-sm">
                      <MessageSquare className="h-6 w-6" />
                    </div>
                    <p className="mt-3 font-display text-base font-bold text-foreground">
                      {q || filterRating > 0
                        ? "Tidak ada feedback yang cocok"
                        : "Belum ada feedback tamu"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {q || filterRating > 0
                        ? "Coba ubah kata kunci pencarian atau bersihkan filter bintang."
                        : "Setelah tamu mengirim formulir registrasi dan memberi penilaian, data akan muncul di sini."}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredRows.map((r) => (
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
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-400">
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
                            className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground"
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
                  <td className="whitespace-nowrap p-3.5 text-right">
                    <button
                      onClick={() => setToDelete(r)}
                      className="rounded-lg p-1.5 text-destructive transition-colors hover:bg-destructive/10"
                      title="Hapus Feedback"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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
