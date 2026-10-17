# Panduan Instalasi Lokal, Integrasi Supabase, dan Deploy ke Vercel

## Buku Tamu Digital — Menara Nobu

Dokumentasi ini memuat panduan lengkap dari awal untuk:

1. **Prasyarat & software** yang harus terpasang di komputer/device lokal.
2. **Langkah instalasi & menjalankan aplikasi** di lingkungan lokal (_development_).
3. **Langkah integrasi database & autentikasi** menggunakan **Supabase**.
4. **Langkah deployment** aplikasi ke **Vercel** (server-side rendering & static assets).

---

## 1. Prasyarat Perangkat Lunak di Komputer Lokal

Sebelum memulai, pastikan perangkat lokal Anda telah terpasang:

| Perangkat Lunak | Versi Rekomendasi             | Keterangan & Tautan Unduh                                                                   |
| :-------------- | :---------------------------- | :------------------------------------------------------------------------------------------ |
| **Node.js**     | `v20.x` atau `v22.x` LTS      | Runtime JavaScript utama. Unduh di [nodejs.org](https://nodejs.org).                        |
| **npm**         | `v10.x` atau lebih baru       | Paket manajer resmi (otomatis terpasang bersama Node.js).                                   |
| **Git**         | Versi terbaru                 | Untuk kloning dan sinkronisasi kode ke GitHub. Unduh di [git-scm.com](https://git-scm.com). |
| **Code Editor** | VS Code / Cursor              | Editor kode yang disarankan.                                                                |
| **Web Browser** | Chrome, Edge, Safari, Firefox | Mendukung WebRTC / akses kamera untuk fitur pemindai QR code.                               |

Periksa instalasi melalui terminal / command prompt:

```bash
node -v
npm -v
git --version
```

---

## 2. Instalasi Awal & Menjalankan di Lingkungan Lokal

### Langkah 2.1: Kloning Repository

Buka terminal dan unduh kode sumber (ganti `<username-anda>` dan `<nama-repo-anda>` sesuai repository GitHub Anda):

```bash
# Contoh perintah klon dari repository GitHub milik Anda:
git clone https://github.com/<username-github-anda>/<nama-repository-anda>.git
cd <nama-repository-anda>
```

> **Catatan jika Anda baru pertama kali membuat repository di GitHub:**  
> Jika Anda memiliki salinan kode lokal dan ingin mengunggahnya ke akun GitHub pribadi/organisasi Anda:
>
> 1. Buat repository baru di [github.com/new](https://github.com/new) (misal: `buku-tamu-nobu`).
> 2. Di terminal lokal proyek Anda, jalankan:
>    ```bash
>    git init
>    git add .
>    git commit -m "feat: inisialisasi sistem registrasi tamu digital"
>    git branch -M main
>    git remote add origin https://github.com/<username-github-anda>/<nama-repo-anda>.git
>    git push -u origin main
>    ```
> 3. Jika repository sudah ada dan ingin memperbarui remote URL:
>    ```bash
>    git remote set-url origin https://github.com/<username-github-anda>/<nama-repo-anda>.git
>    git push -u origin main
>    ```

### Langkah 2.2: Pasang Dependencies

Jalankan perintah instalasi paket:

```bash
npm install
```

### Langkah 2.3: Siapkan File Konfigurasi Lingkungan (`.env`)

Salin file template `.env.example` menjadi `.env`:

```bash
cp .env.example .env
```

Buka file `.env` di text editor dan sesuaikan kredensial Supabase Anda:

```env
VITE_SUPABASE_URL=https://uugqkbwpjlprtxnjdpcm.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

_(Lihat Bagian 3 di bawah untuk cara mendapatkan URL dan Anon Key dari project Supabase milik Anda sendiri)._

### Langkah 2.4: Jalankan Development Server

Mulai server lokal:

```bash
npm run dev
```

Aplikasi akan aktif di **`http://localhost:3000`**. Buka tautan tersebut di peramban Anda.

### Perintah Berguna Lainnya:

- **Menjalankan pengujian otomatis**:
  ```bash
  npm test
  ```
- **Memeriksa kualitas kode (Linting)**:
  ```bash
  npm run lint
  ```
- **Format kode otomatis**:
  ```bash
  npm run format
  ```
- **Membangun versi produksi lokal**:
  ```bash
  npm run build
  ```

---

## 3. Panduan Integrasi ke Supabase (Database & Auth)

Aplikasi ini menggunakan backend Supabase milik Anda sendiri (PostgreSQL, Row Level Security, RPC Functions, dan Auth).

### Langkah 3.1: Buat Project Baru di Supabase

1. Masuk ke [supabase.com](https://supabase.com) dan masuk ke akun Anda.
2. Klik tombol **New Project**.
3. Masukkan nama project (contoh: `Buku Tamu Menara Nobu`), buat kata sandi database yang kuat, dan pilih region terdekat (misal: `Singapore (ap-southeast-1)`).
4. Klik **Create new project** dan tunggu proses inisialisasi (~1-2 menit).

### Langkah 3.2: Ambil API URL & Anon Key

1. Buka menu **Project Settings** (ikon gerigi di bilah kiri bawah) -> **API**.
2. Pada bagian **Project URL**, salin URL Anda (format: `https://[project-id].supabase.co`).
3. Pada bagian **Project API Keys**, salin nilai token **`anon` `public`**.
4. Tempelkan kedua nilai tersebut ke file `.env` di komputer lokal Anda dan ke pengaturan environment Vercel.

### Langkah 3.3: Jalankan Skrip Database (`schema.sql`)

1. Di dashboard Supabase, buka menu **SQL Editor** di bilah navigasi kiri.
2. Klik tombol **+ New query**.
3. Buka file `supabase/schema.sql` dari repository ini, salin seluruh isinya (Ctrl+A / Cmd+A, lalu Copy).
4. Tempelkan (_paste_) ke SQL Editor Supabase, lalu klik tombol **Run** (atau tekan `Ctrl + Enter`).
5. Skrip ini akan secara otomatis:
   - Mengaktifkan ekstensi `pgcrypto`.
   - Membuat tabel: `employees`, `visit_purposes`, `guests`, `guest_drafts`, `user_roles`, `profiles`, `admin_emails`, `guest_feedback`, `activity_logs`, dan `notifications`.
   - Mengatur Row Level Security (RLS) agar data tamu terlindungi dan hanya bisa ditulis tamu melalui fungsi RPC.
   - Memasang fungsi RPC penting: `submit_guest`, `check_guest_status`, `quick_checkin_by_code`, `upsert_draft`, `submit_guest_feedback`, dll.
   - Menanamkan data master contoh awal.

### Langkah 3.4: Jalankan Verifikasi Kesiapan Database (`verify.sql`)

1. Buka query baru di SQL Editor Supabase.
2. Salin seluruh isi file `supabase/verify.sql` dan klik **Run**.
3. Skrip ini hanya membaca (read-only) untuk memverifikasi apakah semua tabel, RLS, kolom, dan fungsi RPC sudah siap digunakan. Pastikan semua baris berstatus **OK**.

### Langkah 3.5: Daftarkan Akun Administrator Pertama

1. Buka kembali **SQL Editor** di Supabase, lalu jalankan query untuk mendaftarkan email admin Anda:
   ```sql
   insert into public.admin_emails (email)
   values ('email-admin-anda@perusahaan.com');
   ```
2. Buka menu **Authentication** -> **Users** di dashboard Supabase.
3. Klik tombol **Add user** -> **Create user**.
4. Masukkan email yang sama (`email-admin-anda@perusahaan.com`) dan buat password akun admin Anda.
5. Trigger otomatis di database akan mendeteksi email tersebut di daftar `admin_emails`, lalu memberikan peran `admin` pada tabel `user_roles`.
6. Anda kini dapat masuk ke portal admin melalui menu `/admin/login`.

---

## 4. Panduan Deployment ke Vercel

Aplikasi ini telah dikonfigurasi dengan `vercel.json` dan preset Nitro SSR agar seluruh rute dinamis (seperti `/registrasi`, `/scan`, `/admin`, dll.) dapat di-refresh tanpa kendala 404.

### Langkah 4.1: Hubungkan Repository ke Vercel

1. Buka [vercel.com](https://vercel.com) dan login menggunakan akun GitHub Anda.
2. Klik tombol **Add New...** -> pilih **Project**.
3. Cari repository Anda (misal: **`<nama-repository-anda>`**) dan klik tombol **Import**.

### Langkah 4.2: Konfigurasi Proyek & Build

Di halaman konfigurasi Vercel:

- **Project Name**: `<nama-proyek-anda>` (misal: `buku-tamu-menara-nobu`)
- **Framework Preset**: Pilih **Vite** (atau biarkan default terdeteksi)
- **Root Directory**: `./`
- **Build Command**: `npm run build`
- **Output Directory**: `.output/public`

### Langkah 4.3: Masukkan Environment Variables di Vercel

Di bagian accordion **Environment Variables**, tambahkan 3 kunci berikut:

| Key                      | Value                              | Keterangan                        |
| :----------------------- | :--------------------------------- | :-------------------------------- |
| `VITE_SUPABASE_URL`      | `https://[project-id].supabase.co` | URL project Supabase Anda         |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI...`   | Anon public key Supabase Anda     |
| `NITRO_PRESET`           | `vercel`                           | Preset serverless rendering Nitro |

### Langkah 4.4: Deploy

1. Klik tombol **Deploy**.
2. Tunggu proses instalasi paket, kompilasi TypeScript, dan deploy Vercel selesai (~1 menit).
3. Setelah berhasil, Anda akan mendapatkan URL domain aktif (misal: `https://<nama-proyek-anda>.vercel.app`).

### Langkah 4.5: Sinkronisasi URL di Supabase Authentication

1. Kembali ke dashboard Supabase Anda -> **Authentication** -> **URL Configuration**.
2. Pada kolom **Site URL**, masukkan URL produksi Vercel Anda:
   ```
   https://<nama-proyek-anda>.vercel.app
   ```
3. Pada bagian **Redirect URLs**, tambahkan:
   - `https://<nama-proyek-anda>.vercel.app/**`
   - `http://localhost:3000/**`
4. Klik **Save**. Ini memastikan tautan email konfirmasi, notifikasi, dan reset password mengarahkan pengunjung kembali ke domain yang tepat.

---

## 5. Audit & Best Practice: Fitur Pemindai Barcode / QR Code (`/scan`)

Berdasarkan audit standar industri _Visitor Management System_ (VMS) dan keamanan gedung perkantoran:

### 1. Siapa yang Menggunakan Fitur Scan Barcode / QR?

Fitur ini dirancang memiliki **dua fungsi utama (Dual-Purpose)**:

1. **Untuk Tamu Publik (Self Check-In & Verifikasi Undangan):**
   - Tamu yang telah mendaftar sebelumnya (_pre-registered_) atau memiliki barcode/QR pass dapat memindai dari ponsel atau di tablet kios lobi.
   - Mengurangi antrean di resepsionis pada jam-jam sibuk gedung.
2. **Untuk Petugas Resepsionis & Petugas Keamanan (Security Gate / Turnstile):**
   - Petugas memindai **Visitor Badge Pass** (lanyard atau stiker) tamu untuk memvalidasi:
     - Apakah pass tersebut asli dan berstatus **AKTIF HARI INI**.
     - Siapa staf/karyawan Bank Nobu penanggung jawab kunjungan.
     - Departemen dan keperluan kunjungan tamu.
   - Petugas dapat mengakses pemindai langsung dari **Dashboard Admin (`/admin/tamu`)** tanpa harus berpindah ke antarmuka publik.

### 2. Best Practice Keamanan & Privasi Data Tamu (Zero-Trust):

- **Isolasi Data Publik:** Pemanggilan scan publik menggunakan fungsi database tersimpan `check_guest_status(_code text)` yang berjalan di balik _Security Definer_ PostgreSQL dengan output terbatas.
- **Tidak Membocorkan Database:** Pemindai publik **tidak memiliki akses `SELECT`** langsung ke tabel `guests`. Publik hanya bisa melihat data milik kode pass yang dipindai, sehingga pengunjung lain tidak dapat mengintip daftar nomor telepon atau identitas tamu gedung lainnya.
- **Akses Kamera (WebRTC):** Fitur pemindai QR menggunakan Web API `navigator.mediaDevices.getUserMedia`.
- **Protokol HTTPS Wajib:** Browser modern hanya mengizinkan akses kamera pada domain **`localhost`** atau domain yang terenkripsi **`HTTPS`** (Vercel otomatis menyediakan sertifikat SSL).

### 3. Format QR Code yang Didukung:

1. `MENARA-NOBU:VTR-YYMMDD-XXXX:Nama:Instansi` (Format resmi Kartu Akses Badge Tamu Menara Nobu).
2. Kode teks serial `VTR-YYMMDD-XXXX`.
3. URL tautan undangan digital kunjungan.
4. Pengunggahan foto kartu/gambar QR dari galeri (opsi jika perangkat tidak memiliki kamera).
5. Ketik kode pass manual secara instan dengan pencarian real-time.

---

## 6. Pemecahan Masalah (Troubleshooting)

1. **Kamera tidak mau terbuka di ponsel saat buka website**:
   - Pastikan Anda mengakses website melalui protokol **`https://`**, bukan `http://`.
   - Periksa izin kamera pada pengaturan peramban (ikon gembok di sebelah bilah URL peramban).
2. **Halaman menampilkan status "Karyawan tidak valid" saat kirim data**:
   - Pastikan skrip `supabase/schema.sql` sudah dijalankan di Supabase.
   - Periksa di tabel `employees` apakah data staf berstatus `is_active = true`.
3. **Error "RPC submit_guest failed"**:
   - Pastikan fungsi `submit_guest` dan `check_guest_status` telah di-grant permission ke `anon` dan `authenticated`:
     ```sql
     grant execute on function public.submit_guest(jsonb,uuid) to anon, authenticated;
     grant execute on function public.check_guest_status(text) to anon, authenticated;
     ```
   - Jalankan `supabase/verify.sql` untuk mendeteksi penyebab secara otomatis.

---

© 2026 Menara Nobu · Sistem Buku Tamu & Registrasi Pengunjung Digital
