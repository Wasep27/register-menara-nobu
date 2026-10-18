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
- **Data tamu**: cari, filter (nama, tanggal, tujuan), hapus dengan konfirmasi, dan **ekspor CSV**.
- **Karyawan** dan **Tujuan kunjungan**: tambah / ubah lewat jendela pop-up dengan validasi, aktif / nonaktif, hapus dengan konfirmasi.
- **Email Admin**: daftar email yang otomatis menjadi admin, tanpa perlu menjalankan SQL.
- **Pengguna**: daftar akun beserta nama, email, dan peran.
- Keamanan login: akun dikunci 15 menit setelah 5 kali salah password, lupa password lewat email, keluar otomatis setelah 30 menit tidak aktif, dan keluar bersamaan di semua tab.

---

## Teknologi

| Bagian   | Teknologi                                                   |
| -------- | ----------------------------------------------------------- |
| Tampilan | React 19, TanStack Start / Router, Vite 7                   |
| Gaya     | Tailwind CSS v4, shadcn/ui, font Nunito + Plus Jakarta Sans |
| Grafik   | Recharts                                                    |
| Validasi | Zod (`src/lib/validation.ts`)                               |
| Backend  | Supabase (database, login, realtime, pg_cron)               |
| Hosting  | Vercel                                                      |

Warna brand: hijau `#10D5A0` (aksen) dan `#07936E` (tombol / teks).

---

## Struktur folder

```text
src/
  routes/          Halaman (index, registrasi, karyawan, admin.*, privasi, cookies, ...)
  components/      Navbar, footer, carousel, banner cookie, dialog konfirmasi, CRUD admin
  lib/supabase.ts  Koneksi Supabase dan pengaturan sesi login
  lib/validation.ts Aturan validasi formulir
  assets/          Logo dan foto
  test/            Tes otomatis (vitest)
supabase/
  schema.sql       Seluruh tabel, fungsi, trigger, dan aturan akses (aman dijalankan ulang)
  verify.sql       Pemeriksaan kesiapan database (hanya membaca)
vercel.json        Pengaturan deploy Vercel
```

---

## Menjalankan di komputer

```bash
npm install
cp .env.example .env   # atau buat file .env, lihat di bawah
npm run dev            # http://localhost:3000
npm test               # menjalankan tes
```

Variabel lingkungan (`.env`):

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon / publishable key>
```

> Jangan pernah memakai `service_role` key di aplikasi ini.

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
