# Registrasi Tamu Digital Menara Nobu — Rencana Pembangunan

Mengikuti PRD dan Design Spec yang diunggah, dengan satu perubahan: backend Laravel + MySQL diganti **serverless memakai project Supabase milik Anda sendiri** (bukan Lovable Cloud), dan frontend disiapkan agar bisa di-hosting di **Vercel**.

## Langkah awal (dari Anda)

- Hubungkan project Supabase Anda: buka Connectors → Supabase di editor Lovable, lalu pilih project Anda. Setelah terhubung, saya buat tabel, aturan akses, dan fungsi langsung di project tersebut.

## Arsitektur

```text
[Browser: SPA React]  -- HTTPS / JSON -->  [Supabase Anda]
  localStorage (draft)                       - Database Postgres + aturan akses (RLS)
                                             - Fungsi database (RPC) untuk submit & draft
                                             - Login admin (email + password)
```

- Semua logika backend ada di database Supabase (aturan akses + fungsi RPC). Tidak ada server khusus di sisi frontend, jadi aplikasi cukup di-deploy di Vercel dengan 2 variabel lingkungan (URL dan publishable/anon key dari dashboard Supabase → Project Settings → API).
- Istilah "AJAX" di skripsi tetap berlaku: implementasi pakai Fetch API melalui klien Supabase + TanStack Query.

## Halaman

1. `/` — Form registrasi tamu (kiosk/ponsel), satu halaman.
2. `/sukses` dirangkum sebagai layar sukses di halaman yang sama, lalu reset otomatis (mode kiosk, ±8 detik).
3. `/admin/login` — Login admin.
4. `/admin` — Ringkasan: tamu hari ini, per tujuan, jam tersibuk.
5. `/admin/tamu` — Tabel tamu: cari, filter (tanggal, instansi, tujuan, karyawan), sortir, pagination, edit, hapus.
6. `/admin/karyawan` — CRUD karyawan + toggle aktif/nonaktif.
7. `/admin/tujuan` — CRUD tujuan kunjungan.
8. `/admin/laporan` — Laporan per periode, cetak (print view) dan ekspor CSV/PDF.

## Form & Autosave

- Field: nama lengkap, instansi, nomor telepon, tujuan kunjungan (dropdown), nama yang dituju (dropdown dengan pencarian, hanya karyawan aktif), catatan opsional.
- Validasi langsung (saat keluar field dan saat kirim) dengan Zod; divalidasi ulang di fungsi database.
- Draft disimpan ke perangkat setiap perubahan (jeda 500 ms), dan disinkronkan ke server tiap 30 detik bila ada perubahan.
- Saat dibuka kembali: dialog "Lanjutkan" / "Mulai dari awal".
- Indikator status: Menyimpan… / Tersimpan HH:MM / Offline — tersimpan di perangkat / Gagal sinkron, mencoba lagi.
- Coba ulang otomatis bertahap, sinkron ulang saat online kembali, dan kirim draft saat tab ditutup (fetch keepalive).
- Kirim gagal: isian tetap ada, tombol "Coba lagi".
- Setelah sukses: draft lokal dan server dihapus; waktu isi form (dibuka → check-in) dicatat untuk metrik skripsi.
- Draft kedaluwarsa 24 jam, dibersihkan otomatis oleh jadwal di database.

## Desain

- Palet teal sesuai design spec (primary #0A6B73, bg #F7F8FA, aksen #F2A900, dst.) sebagai token warna.
- Bersih, kartu putih, target sentuh ≥ 44 px, kontras WCAG AA, bahasa Indonesia.
- Form dioptimalkan untuk tablet/ponsel; admin untuk desktop.
- Logo: placeholder teks "Menara Nobu" sampai logo resmi diberikan.

## Detail Teknis

**Tabel**

- `employees` (name, department, is_active), `visit_purposes` (name, is_active)
- `guests` (name, institution, phone, employee_id, visit_purpose_id, notes, check_in_time default now(), form_opened_at, fill_duration_seconds)
- `guest_drafts` (draft_token uuid unik, payload jsonb, updated_at, expires_at)
- `user_roles` (user_id, role enum `admin`) + fungsi `has_role` (security definer)

**Akses (RLS)**

- Publik (anon): baca karyawan aktif & tujuan aktif saja.
- Tamu tidak bisa membaca tabel `guests` / `guest_drafts` langsung; hanya lewat RPC:
  - `submit_guest(payload, draft_token)` — validasi, insert, set check_in_time di server, hapus draft.
  - `upsert_draft(token, payload)`, `get_draft(token)`, `delete_draft(token)` — berbasis token UUID.
- Admin (role `admin`): akses penuh semua tabel.
- Batasan panjang & format input di fungsi dan constraint; pembatasan frekuensi sederhana pada `submit_guest` per token.
- `pg_cron` untuk menghapus draft kedaluwarsa.

**Frontend**

- TanStack Router + Query, React Hook Form + Zod, Tailwind token, shadcn.
- Semua akses data lewat klien Cloud di browser (tanpa server function), sehingga mudah di-deploy ke Vercel.
- Admin pertama: dibuat lewat halaman daftar sekali, lalu diberi role admin via migrasi/SQL; pendaftaran publik bisa dimatikan setelahnya.
- Data contoh: beberapa karyawan dan tujuan kunjungan diisi lewat migrasi.

**Catatan Vercel**

- Disiapkan panduan singkat deploy (variabel `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`). Deploy ke Vercel dilakukan sendiri melalui GitHub; dari Lovable juga bisa langsung publish.
