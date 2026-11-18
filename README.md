# Buku Tamu Digital — Menara Nobu

Aplikasi registrasi tamu digital untuk gedung **Menara Nobu (Bank Nobu)**. Tamu mengisi data kunjungan dari ponsel, karyawan yang dituju langsung mendapat notifikasi, dan admin memantau semua kunjungan lewat dashboard.

- **Live Aplikasi**: https://register-menara-nobu.vercel.app
- **Menu Laporan Admin**: https://register-menara-nobu.vercel.app/admin/laporan

---

## Fitur

### Untuk tamu

- **Beranda** dengan foto bergerak otomatis (carousel), penjelasan fitur, langkah registrasi, dan FAQ.
- **Formulir registrasi** (`/registrasi`): nama, instansi, nomor HP, tujuan kunjungan, karyawan yang dituju, jadwal (opsional), tanda kunjungan penting, dan catatan.
  - Isian tersimpan otomatis (juga saat offline) dan bisa dilanjutkan kembali.
  - Validasi lengkap: kolom wajib, format nomor HP Indonesia, jadwal tidak boleh lewat atau lebih dari 180 hari.
- Halaman **Panduan**, **Kebijakan Privasi**, **Kebijakan Cookie**, banner persetujuan cookie, tombol kembali ke atas, dan halaman 404 khusus.

### Untuk karyawan (`/karyawan`)

- Login dengan email yang terdaftar di data karyawan.
- Notifikasi langsung saat tamu baru datang atau kunjungan dijadwalkan.
- Pengingat kunjungan penting: 30 menit sebelumnya dan tepat waktu.

### Untuk admin (`/admin`)

- **Ringkasan**: grafik kunjungan per hari, per tujuan, dan per karyawan (7 / 30 / 90 hari), jam tersibuk.
- **Data tamu**: cari, filter lanjutan (nama, tanggal, tujuan, karyawan), hapus aman, cetak badge, dan **Ekspor Lengkap** (Excel `.xlsx` rapi dengan kop dokumen & lebar otomatis, Dokumen PDF resmi korporat A4 Landscape, Lembar Log Kunjungan Harian Satpam PDF, dan CSV).
- **Karyawan** dan **Tujuan kunjungan**: tambah / ubah lewat jendela pop-up dengan validasi, aktif / nonaktif, hapus dengan konfirmasi.
- **Email Admin**: daftar email yang otomatis menjadi admin, tanpa perlu menjalankan SQL.
- **Pengguna**: daftar akun beserta nama, email, dan peran.
- Keamanan login: akun dikunci 15 menit setelah 5 kali salah password, lupa password lewat email, keluar otomatis setelah 30 menit tidak aktif, dan keluar bersamaan di semua tab.
- **Dokumentasi Lengkap Sistem & Pengujian**: Tersedia di [`DOKUMENTASI_SISTEM.md`](./DOKUMENTASI_SISTEM.md) mencakup Diagram Kelas (_Class Diagram_), Diagram Alur (_Activity Diagram_), Diagram Urutan (_Sequence Diagram_), dan Laporan Hasil Pengujian Kotak Putih (_White-Box Testing_ 100% Passed).

---

## Teknologi

Aplikasi dibangun dengan tumpukan teknologi modern berbasis TypeScript dari ujung frontend hingga lapisan database:

### 1. Frontend, Routing & Runtime Build

| Teknologi | Versi / Modul | Peran dalam Aplikasi |
| --- | --- | --- |
| **React** | `^19.2.0` | Pustaka utama antarmuka pengguna berbasis komponen fungsional & hooks. |
| **TypeScript** | `^5.8.3` | Pengetikan statis penuh untuk keamanan data formulir, RPC Supabase, dan analitik. |
| **TanStack Start** | `1.168.60` | Framework SSR full-stack di atas Vite untuk rendering awal halaman dan error boundary. |
| **TanStack Router** | `1.170.41` | File-based routing tipe-aman (`src/routes/`), generator `routeTree.gen.ts`, dan `<head>` SEO per rute. |
| **TanStack React Query** | `^5.101.1` | Infrastruktur manajemen query & caching data sisi klien. |
| **Vite + Rolldown** | `8.1.5` (`rolldown 1.2.1`) | Bundler super cepat dengan `@lovable.dev/vite-tanstack-config` & fallback runtime plugin di `vite.config.ts`. |
| **Nitro** | `3.0.260603-beta` | Engine server SSR dengan preset `vercel` (`vercel.json`) agar refresh rute langsung tidak 404. |

### 2. UI, Desain & Animasi

| Teknologi | Versi / Modul | Peran dalam Aplikasi |
| --- | --- | --- |
| **Tailwind CSS** | `^4.2.1` (`@tailwindcss/vite`) | Utilitas styling modern dengan token tema `@theme` & animasi `tw-animate-css`. |
| **shadcn/ui & Radix UI** | `@radix-ui/react-*` | Komponen UI aksesibel (Dialog, AlertDialog, Select, Tabs, Tooltip, Sheet, dll.) dengan `clsx`, `tailwind-merge`, dan `class-variance-authority`. |
| **Lucide React** | `^0.575.0` | Paket ikon vektor ringan di seluruh navigasi, formulir, dan dashboard. |
| **Framer Motion** | `^14.3.0` | Transisi halus halaman dan animasi komponen interaktif. |
| **Embla Carousel** | `^8.6.0` | Carousel foto gedung & lobi Menara Nobu di halaman beranda. |
| **Sonner** | `^2.0.7` | Notifikasi toast non-intrusif untuk umpan balik aksi pengguna & petugas. |
| **Tipografi** | Google Fonts | `Nunito` & `Plus Jakarta Sans` (aksen merek hijau `#10D5A0` & `#07936E`). |

### 3. Formulir, Validasi & Penanganan Waktu

| Teknologi | Versi / Modul | Peran dalam Aplikasi |
| --- | --- | --- |
| **Zod** | `^3.25.76` | Skema validasi ketat input tamu, nomor HP Indonesia, email, jadwal kunjungan, dan sanitasi query (`src/lib/validation.ts`). |
| **React Hook Form** | `^7.71.2` + `@hookform/resolvers` | Pengelolaan state formulir efisien dan terhubung dengan skema Zod. |
| **date-fns & Intl WIB** | `^4.1.0` | Pemformatan tanggal/jam lokal Indonesia Barat (`Asia/Jakarta` WIB) secara konsisten (`src/lib/date-utils.ts`). |

### 4. Analitik, Pemindaian QR/Barcode & Ekspor Dokumen

| Teknologi | Versi / Modul | Peran dalam Aplikasi |
| --- | --- | --- |
| **Recharts** | `^2.15.4` | Visualisasi tren harian, jam tersibuk (*peak hours*), sebaran divisi, dan kategori tujuan kunjungan. |
| **jsQR + Web MediaDevices** | `jsqr ^1.4.0` | Pemindai QR Code kamera real-time (*throttled* 110ms) + dukungan USB *barcode scanner* & Web Audio API beep (`QrCodeScanner.tsx`). |
| **Generator Barcode & Badge** | `src/lib/barcode.ts`, `badge-download.ts` | Generator mandiri barcode 1D **Code 39**, matriks **QR ISO**, dan ekspor PNG resolusi Retina 2x via HTML5 Canvas. |
| **ExcelJS & SheetJS** | `exceljs ^4.4.0`, `xlsx ^0.18.5` | Ekspor Excel `.xlsx` multi-sheet berkop logo Nobu, kartu KPI, *in-cell bar chart*, zebra striping, auto-filter, dan freeze panes (`src/lib/export-utils.ts`). |
| **jsPDF & AutoTable** | `jspdf ^4.2.1`, `jspdf-autotable ^5.0.9` | Pembuatan PDF resmi korporat A4 Landscape, Lembar Log Harian Satpam, dan cetak Visitor Pass Lanyard/Compact. |
| **CSV Aman** | `src/lib/csv-export.ts` | Ekspor CSV ber-UTF-8 BOM dengan perlindungan anti *CSV Formula Injection* (`=`, `+`, `-`, `@`). |

### 5. Backend, Database & Keamanan

| Teknologi | Peran & Best Practice |
| --- | --- |
| **Supabase (`@supabase/supabase-js ^2.118.0`)** | PostgreSQL, **PKCE Auth** (`flowType: "pkce"`, `storageKey: "nobu-auth"`), **Row-Level Security (RLS)**, fungsi RPC `SECURITY DEFINER`, **Realtime** (`postgres_changes`), dan **`pg_cron`** untuk pengingat otomatis. |
| **Arsitektur Keamanan Sisi Klien** | Seluruh akses berjalan lewat *anon/publishable client* (`src/lib/supabase.ts`) tanpa `service_role` key di frontend; tamu anonim hanya menulis data lewat RPC tervalidasi tanpa hak baca tabel tamu; peran RBAC (`admin`, `security`, `staff`) dipisah di tabel `user_roles`. |

### 6. PWA, Pengujian & Kualitas Kode

| Teknologi | Versi / Modul | Peran dalam Aplikasi |
| --- | --- | --- |
| **PWA & Offline Draft** | `/public/sw.js`, `manifest.webmanifest` | Service Worker untuk caching aset statis, fallback `/offline.html`, serta antrean draf registrasi offline dengan *exponential backoff*. |
| **Vitest & Testing Library** | `vitest ^4.1.10`, `@testing-library/react ^16.0.0`, `jsdom` | Unit test & integration test untuk validasi, analitik, ekspor dokumen, password strength, dan routing. |
| **ESLint & Prettier** | `eslint ^9.32.0`, `prettier ^3.7.3` | Penegakan standar sintaks TypeScript, React Hooks rules, dan format kode otomatis. |
| **Bun / Node.js** | `bun.lock` & `npm` | Manajemen dependensi dan eksekusi skrip pengembangan/build. |

---

## Struktur folder

```text
src/
  routes/          Halaman berbasis berkas TanStack Router (index, registrasi, karyawan, admin.*, ...)
  components/      Komponen aplikasi (navigasi, carousel, scanner QR/barcode, cetak badge, CRUD master)
  hooks/           Custom hooks (useAdminRole RBAC, useOnlineStatus jaringan, usePWAInstall)
  lib/             Utilitas inti (koneksi Supabase, validasi Zod, analitik, ekspor Excel/PDF/CSV, keamanan sandi)
  assets/          Logo resmi Menara Nobu (termasuk Base64 untuk dokumen cetak) dan foto lobi
  test/            Suite pengujian otomatis (vitest)
public/
  sw.js            Service Worker PWA untuk cache aset dan fallback halaman offline
supabase/
  schema.sql       Seluruh tabel, fungsi RPC SECURITY DEFINER, trigger, RLS, dan jadwal pg_cron
  verify.sql       Skrip pemeriksaan kesiapan database (read-only)
vercel.json        Konfigurasi deploy Vercel dengan preset Nitro SSR
```

---

## Menjalankan di Komputer Lokal

### ⚡ Cara Cepat 1-Klik (Khusus Pengguna Windows)

Cukup **klik ganda (double-click)** file:
👉 **`jalankan-aplikasi.bat`** (atau **`start-dev.bat`**)

Script akan otomatis:

1. Mendeteksi apakah di sistem Anda ada **Bun** atau **Node.js/npm**.
2. Menyalin `.env.example` ke `.env` secara otomatis.
3. Memasang dependensi (`node_modules`).
4. Menjalankan server lokal di **`http://localhost:3000`** dan langsung membukanya di browser!

_(Untuk pengguna macOS/Linux: jalankan `./jalankan-aplikasi.sh`)_

---

### 💻 Cara Manual (Bun / npm)

Proyek ini memiliki `bun.lock` (bawaan Bun) dan juga 100% kompatibel dengan Node.js/npm:

```bash
# Opsi 1: Menggunakan Bun (Sangat Cepat - Rekomendasi):
bun install
bun run dev

# Opsi 2: Menggunakan npm (Standar Node.js):
npm install
npm run dev

# Menjalankan pengujian (35 tests):
npm test
```

Variabel lingkungan (`.env`):

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon / publishable key>
```

> Jangan pernah memakai `service_role` key di aplikasi ini.

---

## 📱 Progressive Web App (PWA)

Aplikasi telah dioptimalkan dengan standar PWA modern:

- **Installable**: Tombol instalasi langsung di aplikasi (Desktop Chrome/Edge, Android, dan panduan iOS Safari).
- **Offline Support**: Layar fallback `/offline.html` dan penyimpanan draf lokal saat jaringan terputus.
- **Service Worker**: Cache aset statis dan navigasi andal via `/sw.js`.
- **Ikon PWA Lengkap**: 192x192, 512x512, serta ikon maskable Android dengan safe margin.

---

## Menyiapkan Supabase

1. Buka **SQL Editor** di Supabase → **New query** → tempel isi `supabase/schema.sql` → **Run**.
2. (Opsional) Aktifkan **Database → Extensions → pg_cron**, lalu jalankan ulang `schema.sql` agar pengingat berjalan tiap menit.
3. Daftarkan email admin:
   ```sql
   insert into public.admin_emails (email) values ('admin@nobu.id');
   ```
4. Buat akun di **Authentication → Users** dengan email tersebut. Profil dan peran admin dibuat otomatis.
5. Di **Authentication → URL Configuration**, isi **Site URL** dengan alamat Vercel Anda dan tambahkan `https://<domain>/reset-password` ke Redirect URLs.
6. Jalankan `supabase/verify.sql` — semua baris harus berstatus **OK**.

Peran disimpan di tabel `user_roles` (bukan di profil) supaya pengguna tidak bisa mengubah perannya sendiri.

---

## Dokumentasi Teknis & Pengujian

Dokumentasi lengkap diagram arsitektur dan hasil pengujian kotak putih tersedia di:

- **[DOKUMENTASI_SISTEM.md](DOKUMENTASI_SISTEM.md)**:
  - **Class Diagram**: Struktur entitas data, model TypeScript, dan modul analitik.
  - **Activity Diagram**: Pemodelan alur proses registrasi lobi, pemindaian pos keamanan, dan analitik laporan.
  - **Sequence Diagram**: Interaksi pesan pendaftaran realtime, pemindaian QR pass, dan pembuatan berkas Excel/PDF.
  - **Hasil White-Box Testing**: Analisis kompleksitas siklomatis ($V(G)$), boundary values, dan matriks pengujian unit test (26 test case, 100% lulus).
- **[PANDUAN_SETUP_DAN_DEPLOY.md](PANDUAN_SETUP_DAN_DEPLOY.md)**: Panduan konfigurasi Supabase dan deploy Vercel.

---

## Deploy ke Vercel

1. Import repository di Vercel.
2. **Settings → General → Framework Preset**: pilih **Other** (pengaturan build sudah ada di `vercel.json`).
3. **Settings → Environment Variables**: tambahkan `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` untuk Production, Preview, dan Development.
4. Redeploy. Semua halaman bisa di-refresh tanpa error 404.

---

## Lisensi

Proyek internal Menara Nobu. Hak cipta © Bank Nobu.
