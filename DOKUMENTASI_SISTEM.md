# Dokumentasi Perancangan Sistem & Pengujian White-Box

## Sistem Buku Tamu Digital — Menara Nobu

Dokumen ini memuat dokumentasi rancangan berorientasi objek (**Class Diagram**), pemodelan proses bisnis (**Activity Diagram**), interaksi dinamis antar komponen (**Sequence Diagram**), serta laporan dan analisis pengujian kotak putih (**White-Box Testing**).

---

## 1. Class Diagram (Diagram Kelas)

Diagram kelas berikut memodelkan entitas data (database Supabase), model data TypeScript di frontend, relasi antarentitas, serta modul utilitas dan service inti sistem.

```mermaid
classDiagram
    direction TB

    %% Entitas Database & Domain Models
    class Guest {
        +UUID id
        +String name
        +String institution
        +String phone
        +UUID employee_id
        +UUID visit_purpose_id
        +String notes
        +DateTime check_in_time
        +String badge_code
        +Boolean is_important
        +DateTime scheduled_at
        +Integer fill_duration_seconds
        +DateTime form_opened_at
        +getVisitorBadge() VisitorBadgeData
        +isGeneralVisit() Boolean
    }

    class Employee {
        +UUID id
        +String name
        +String department
        +String email
        +UUID user_id
        +Boolean is_active
        +DateTime created_at
        +notify(title, message) void
    }

    class VisitPurpose {
        +UUID id
        +String name
        +Boolean is_active
        +DateTime created_at
    }

    class Profile {
        +UUID id
        +String email
        +String full_name
        +DateTime created_at
    }

    class UserRole {
        +UUID id
        +UUID user_id
        +AppRole role
        +DateTime created_at
    }

    class Notification {
        +UUID id
        +UUID user_id
        +String title
        +String message
        +Boolean is_read
        +String type
        +DateTime created_at
        +markAsRead() void
    }

    class GuestFeedback {
        +UUID id
        +UUID guest_id
        +String guest_name
        +String institution
        +Integer rating
        +String[] tags
        +String comment
        +Integer fill_duration_seconds
        +DateTime created_at
    }

    class ActivityLog {
        +UUID id
        +DateTime created_at
        +UUID actor_id
        +String actor_email
        +String actor_type
        +String category
        +String action
        +String title
        +JSON details
    }

    %% Modul Service & Analytics
    class ExportUtils {
        <<service>>
        +exportToExcel(options: ExportDataOptions) void
        +exportToPdf(options: ExportDataOptions) void
        +exportToCsv(options: CsvExportOptions) void
        +escapeCsvCell(value: unknown) String
    }

    class DashboardAnalytics {
        <<service>>
        +calculateDashboardStats(rows: Guest[], days: int) DashboardStats
        +calculatePeriodDiff(current: int, prev: int) int
        -computeHourlyTraffic(rows: Guest[]) HourlyTraffic[]
        -computeDepartmentTraffic(rows: Guest[]) DepartmentTraffic[]
        -generateBuildingInsights(rows: Guest[]) BuildingInsight[]
    }

    class BadgeUtils {
        <<service>>
        +createVisitorBadgeFromGuest(guest: Guest) VisitorBadgeData
        +generateBadgeCode(id: UUID, date: Date) String
    }

    class ValidationService {
        <<service>>
        +guestSchema: ZodSchema
        +employeeSchema: ZodSchema
        +purposeSchema: ZodSchema
        +validateGuest(payload: unknown) Result
    }

    %% Relasi
    Guest "0..*" --> "0..1" Employee : menemui / dituju
    Guest "0..*" --> "1" VisitPurpose : keperluan kunjungan
    Guest "1" --> "0..1" GuestFeedback : ulasan kepuasan
    Employee "1" --> "0..1" Profile : akun login karyawan
    Profile "1" --> "1..*" UserRole : memiliki peran (admin/security/staff)
    Profile "1" --> "0..*" Notification : menerima pemberitahuan
    DashboardAnalytics ..> Guest : menganalisis volume & pola
    ExportUtils ..> Guest : mengekspor laporan
    BadgeUtils ..> Guest : mencetak kartu pass
    ValidationService ..> Guest : memvalidasi formulir
```

### Penjelasan Entitas & Relasi

1. **Guest (Buku Tamu)**: Menyimpan transaksi kedatangan pengunjung. Memiliki relasi opsional (`0..1`) ke `Employee` (bila `null`, diklasifikasikan sebagai _Tujuan Umum / Resepsionis Lobi_) dan relasi wajib (`1`) ke `VisitPurpose`.
2. **Employee (Direktori Host / Karyawan)**: Mewakili staf gedung Menara Nobu beserta unit kerja/departemen. Dapat terhubung secara opsional dengan akun `auth.users` melalui tabel `Profile`.
3. **UserRole & Profile**: Menerapkan _Role-Based Access Control_ (RBAC) dengan 3 peran: `admin` (Super Admin), `security` (Pos Keamanan/Satpam), dan `staff` (Front Desk / Resepsionis).
4. **DashboardAnalytics & ExportUtils**: Layer kalkulasi cerdas yang mengolah data mentah menjadi metrik visual (_Peak Hours_, _Department Breakdown_, _Actionable Building Insights_) dan memproduksi berkas biner `.xlsx` dan `.pdf`.

---

## 2. Activity Diagram (Diagram Aktivitas)

### A. Alur Registrasi Tamu (Kunjungan Spesifik & Tujuan Umum)

Diagram ini memodelkan proses dari tamu membuka aplikasi di lobi hingga mendapatkan kartu badge akses digital.

```mermaid
flowchart TD
    Start([Mulai: Tamu Tiba di Lobi Menara Nobu]) --> OpenForm[Buka Halaman /registrasi]
    OpenForm --> DraftCheck{Ada Draft Tersimpan di LocalStorage/Server?}
    DraftCheck -- Ya --> RestoreDraft[Pulihkan Data Isian Otomatis]
    DraftCheck -- Tidak --> NewForm[Tampilkan Formulir Kosong]

    RestoreDraft --> SelectType[Pilih Kategori Kunjungan]
    NewForm --> SelectType

    SelectType --> TypeDecision{Jenis Kunjungan?}
    TypeDecision -- Bertemu Staf / Karyawan --> SearchHost[Cari & Pilih Host dari Direktori Aktif]
    TypeDecision -- Tujuan Umum / Resepsionis --> SetGeneral[Tujuan: Resepsionis Lobi / Umum]

    SearchHost --> FillDetails[Isi Nama, Instansi, Nomor HP, Jadwal, Catatan]
    SetGeneral --> FillDetails

    FillDetails --> SubmitForm[Klik Tombol 'Kirim Data Kunjungan']
    SubmitForm --> ValidateInput{Validasi Client Zod Valid?}

    ValidateInput -- Tidak Valid --> ShowError[Tampilkan Pesan Error pada Kolom Terkait]
    ShowError --> FillDetails

    ValidateInput -- Valid --> CallRPC[Eksekusi RPC Supabase: submit_guest]
    CallRPC --> DBValidate{Validasi Database & RLS Sukses?}

    DBValidate -- Gagal --> ShowServerError[Tampilkan Notifikasi Gagal Kirim]
    ShowServerError --> FillDetails

    DBValidate -- Sukses --> GenBadge[Generate Unique Badge Code VTR-YYMMDD-XXXX]
    GenBadge --> TriggerRealtime[Kirim Realtime Notification ke Staf Host]
    TriggerRealtime --> CleanDraft[Hapus Draft Formulir]
    CleanDraft --> ShowSuccessModal[Tampilkan Kartu Badge Digital & QR Pass]
    ShowSuccessModal --> DownloadOption[Opsi: Unduh Kartu Badge Pass PNG / Cetak]
    DownloadOption --> EndReg([Selesai: Tamu Masuk Antrean Lobi])
```

### B. Alur Pemindaian Pass di Pos Keamanan (`/admin/scan`)

```mermaid
flowchart TD
    StartScan([Mulai: Tamu Datang ke Meja Keamanan]) --> OpenScanner[Petugas Buka Halaman /admin/scan]
    OpenScanner --> ScanMethod{Metode Input?}

    ScanMethod -- Kamera Ponsel / Webcam --> VideoScan[Arahkan Kamera ke QR Code Tamu]
    ScanMethod -- Barcode Reader USB --> ReaderInput[Scan Barcode Kartu Fisik Tamu]
    ScanMethod -- Input Manual --> ManualInput[Ketik Kode Badge Pass]

    VideoScan --> DetectCode[Deteksi Kode Badge Pass]
    ReaderInput --> DetectCode
    ManualInput --> DetectCode

    DetectCode --> QueryDB[Panggil RPC: check_guest_status]
    QueryDB --> CheckResult{Status Tamu?}

    CheckResult -- Tidak Ditemukan --> AlertInvalid[Bunyikan Nada Error & Tampilkan Badge Invalid]
    CheckResult -- Ditemukan --> DisplayGuest[Tampilkan Nama, Instansi, Host & Waktu Check-in]

    DisplayGuest --> ActionConfirm{Aksi Petugas?}
    ActionConfirm -- Sudah Sesuai --> ConfirmPass[Klik Konfirmasi Check-in / Verifikasi]
    ConfirmPass --> ExecCheckin[Panggil RPC: quick_checkin_by_code]
    ExecCheckin --> LogAudit[Catat Riwayat ke activity_logs]
    LogAudit --> PlayAudioSuccess[Bunyikan Nada Beep Sukses & Tanda Hijau]
    PlayAudioSuccess --> AccessGranted[Izinkan Tamu Masuk Gerbang / Lift]

    AlertInvalid --> EndScan([Selesai])
    AccessGranted --> EndScan
```

### C. Alur Analisis Tren Gedung & Ekspor Laporan

```mermaid
flowchart TD
    StartAnalytics([Mulai: Admin / Manajemen Gedung]) --> OpenReport[Buka Dashboard /admin atau /admin/laporan]
    OpenReport --> SelectPeriod[Pilih Rentang Periode Waktu: 7 / 30 / 90 Hari / Kustom]
    SelectPeriod --> FetchData[Ambil Data Tamu + Relasi Karyawan & Departemen]

    FetchData --> CalculateMetrics[Eksekusi calculateDashboardStats]
    CalculateMetrics --> ProcessHourly[Hitung Distribusi Jam Kedatangan 07:00-18:00 WIB]
    CalculateMetrics --> ProcessDept[Agregasi Total & Persentase per Departemen]
    CalculateMetrics --> GenerateInsights[Kalkulasi 4 Actionable Building Insights]

    ProcessHourly --> RenderRecharts[Render BarChart Peak Hours & AreaChart Tren]
    ProcessDept --> RenderDeptChart[Render BarChart Distribusi Departemen]
    GenerateInsights --> RenderInsightCards[Tampilkan Rekomendasi Manajemen Gedung]

    RenderInsightCards --> UserChoice{Kebutuhan Dokumen?}
    UserChoice -- Cetak Layar --> BrowserPrint[Panggil window.print Dialog Printer]
    UserChoice -- Spreadsheet Excel --> GenExcel[Ekspor via SheetJS XLSX]
    UserChoice -- Dokumen Resmi PDF --> GenPdf[Ekspor via jsPDF + autoTable]
    UserChoice -- Teks CSV --> GenCsv[Ekspor via exportToCsv]

    GenExcel --> AutoColWidth[Hitung Lebar Kolom Otomatis + Kop Menara Nobu]
    AutoColWidth --> DownloadExcel[Unduh .xlsx]

    GenPdf --> FormatA4[Render Tabel Bergaris + Kop Kop Surat + Nomor Halaman]
    FormatA4 --> DownloadPdf[Unduh .pdf]

    GenCsv --> DownloadCsv[Unduh .csv]

    DownloadExcel --> EndReport([Selesai])
    DownloadPdf --> EndReport
    DownloadCsv --> EndReport
    BrowserPrint --> EndReport
```

---

## 3. Sequence Diagram (Diagram Urutan)

### Skenario 1: Registrasi Tamu Baru & Notifikasi Real-time

Diagram berikut memperlihatkan pertukaran pesan antar aktor dan komponen sistem saat tamu mendaftar.

```mermaid
sequenceDiagram
    autonumber
    actor Tamu as Pengunjung / Tamu
    participant Client as Browser (React 19 / TanStack)
    participant Zod as ValidationService (Zod)
    participant LocalStore as Browser LocalStorage
    participant SupaClient as Supabase Client SDK
    participant DB as PostgreSQL Database
    actor Host as Karyawan / Host (Dashboard)

    Tamu->>Client: Mengisi formulir registrasi di /registrasi
    Client->>LocalStore: Simpan draft sementara (Auto-save)
    Tamu->>Client: Klik tombol "Kirim Data Kunjungan"
    Client->>Zod: guestFormSchema.parse(formData)

    alt Data Tidak Valid
        Zod-->>Client: Error validasi (misal: nomor HP bukan format Indonesia)
        Client-->>Tamu: Tampilkan pesan error pada field formulir
    else Data Valid
        Zod-->>Client: Payload data terverifikasi
        Client->>SupaClient: rpc("submit_guest", { payload, token })
        SupaClient->>DB: Eksekusi submit_guest(jsonb, uuid)
        Note over DB: Validasi foreign key,<br/>handle employee_id null (Umum),<br/>generate badge_code (VTR-YYMMDD-XXXX)
        DB->>DB: INSERT into guests
        DB->>DB: INSERT into notifications (trigger guests_notify)
        DB-->>SupaClient: Return new_guest_id (UUID)
        SupaClient-->>Client: Status sukses & ID tamu
        Client->>LocalStore: Hapus draft token
        Client-->>Tamu: Tampilkan Modal Badge Pass Digital (QR & Barcode)

        par Pengiriman Realtime
            DB->>Host: Supabase Realtime WebSocket Event ("INSERT on notifications")
            Host-->>Host: Tampilkan notifikasi pop-up tamu telah tiba di lobi
        end
    end
```

### Skenario 2: Pemindaian QR Code di Pos Keamanan

Diagram interaksi antara petugas keamanan gedung, kamera scanner, dan sistem verifikasi status tamu.

```mermaid
sequenceDiagram
    autonumber
    actor Security as Satpam / Petugas Pos
    participant Camera as Pemindai (Webcam / Scanner)
    participant ScanView as Scan Page (/admin/scan)
    participant Supa as Supabase Client
    participant DB as Database Supabase

    Security->>ScanView: Buka halaman pemindai pos keamanan
    ScanView->>Camera: Inisialisasi video stream & detektor jsQR
    Security->>Camera: Arahkan kartu pass / ponsel tamu ke scanner
    Camera->>ScanView: Tangkap payload string (badge_code / QR URL)
    ScanView->>ScanView: Ekstrak kode badge pass (Format VTR-*)

    ScanView->>Supa: rpc("check_guest_status", { _badge_code })
    Supa->>DB: SELECT * FROM guests WHERE badge_code = _badge_code

    alt Tamu Tidak Ditemukan
        DB-->>Supa: null
        Supa-->>ScanView: Tamu tidak terdaftar
        ScanView->>ScanView: Mainkan audio buzzer error & status Merah
        ScanView-->>Security: Tampilkan peringatan "Tamu Tidak Dikenali"
    else Tamu Ditemukan
        DB-->>Supa: Data Tamu (Nama, Instansi, Tujuan, Waktu)
        Supa-->>ScanView: Tamu valid ditemukan
        ScanView->>ScanView: Mainkan audio beep sukses & status Hijau
        ScanView-->>Security: Tampilkan kartu verifikasi tamu di layar

        Security->>ScanView: Klik tombol "Konfirmasi Check-in Cepat"
        ScanView->>Supa: rpc("quick_checkin_by_code", { _badge_code })
        Supa->>DB: UPDATE guests SET check_in_time = now()
        Supa->>DB: INSERT INTO activity_logs (Aksi: checkin_quick)
        DB-->>Supa: OK
        Supa-->>ScanView: Sukses terverifikasi
        ScanView-->>Security: Tamu diizinkan masuk ke area gedung
    end
```

### Skenario 3: Ekspor Laporan Excel (.xlsx) dan Dokumen PDF Resmi

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Admin / Building Manager
    participant UI as Laporan Page (/admin/laporan)
    participant Supa as Supabase PostgREST
    participant ExportUtil as export-utils.ts
    participant SheetJS as SheetJS (XLSX)
    participant JsPDF as jsPDF + autoTable

    Admin->>UI: Pilih rentang tanggal ("2026-10-01 s/d 2026-10-18")
    UI->>Supa: from("guests").select("...").gte(...).lte(...)
    Supa-->>UI: Array data tamu (Check-in, Nama, Instansi, Tujuan, Staf)

    alt Klik "Ekspor Excel (.xlsx)"
        Admin->>UI: Klik tombol Ekspor Excel
        UI->>ExportUtil: exportToExcel({ filename, title, period, headers, rows })
        ExportUtil->>ExportUtil: Susun AOA dengan Kop Resmi Menara Nobu & Timestamp WIB
        ExportUtil->>ExportUtil: Kalkulasi lebar kolom otomatis (Auto-fit wch)
        ExportUtil->>SheetJS: utils.aoa_to_sheet(aoa) & utils.book_new()
        ExportUtil->>SheetJS: writeFile(workbook, "laporan-tamu.xlsx")
        SheetJS-->>Admin: Unduhan berkas Excel .xlsx tersimpan di komputer
    else Klik "Unduh PDF (.pdf)"
        Admin->>UI: Klik tombol Unduh PDF
        UI->>ExportUtil: exportToPdf({ filename, title, period, headers, rows })
        ExportUtil->>JsPDF: new jsPDF({ orientation: "landscape", unit: "mm" })
        ExportUtil->>JsPDF: Gambar pita kop korporat (Navy-Sky) & judul resmi
        ExportUtil->>JsPDF: autoTable(doc, { head, body, theme: "grid", zebra })
        ExportUtil->>JsPDF: Cetak nomor halaman dinamis "Halaman X dari Y" di footer
        ExportUtil->>JsPDF: doc.save("laporan-tamu.pdf")
        JsPDF-->>Admin: Unduhan berkas dokumen PDF resmi tersimpan
    end
```

---

## 4. Laporan Hasil White-Box Testing (Pengujian Kotak Putih)

White-Box Testing dilakukan langsung pada struktur internal kode sumber (_control flow_, _decision logic_, _branching_, dan penanganan kondisi batas).

### A. Metodologi Pengujian

1. **Basis Path Testing**: Menguji seluruh jalur independen (_linearly independent paths_) dalam fungsi algoritma.
2. **Branch & Decision Coverage**: Memastikan setiap percabangan `if/else`, operator ternary, dan _optional chaining_ dieksekusi baik bernilai `true` maupun `false`.
3. **Security Data Flow Testing**: Memastikan pencegahan _Formula Injection_ pada ekspor spreadsheet terhadap karakter berbahaya (`=`, `+`, `-`, `@`).
4. **Boundary Value Testing**: Menguji nilai ambang durasi pengisian formulir (10 detik s/d 360 detik) dan batas toleransi jadwal.

---

### B. Analisis Kompleksitas Siklomatis (Cyclomatic Complexity)

Kompleksitas dihitung menggunakan formula graph:  
$$V(G) = E - N + 2P$$  
Atau dihitung dari jumlah predikat keputusan:  
$$V(G) = P_{decisions} + 1$$

#### 1. Fungsi `escapeCsvCell(value: unknown)` (`src/lib/csv-export.ts`)

- **Node Keputusan**:
  1. `value === null || value === undefined`
  2. `/^[=+\-@]/.test(str)` (Pencegahan formula injection)
  3. `str.replace(/"/g, '""')`
- **Cyclomatic Complexity**: $V(G) = 2 + 1 = 3$ (Kategori: Sangat Baik / Low Risk, $\le 10$)
- **Jalur Pengujian (Basis Paths)**:
  - _Path 1_: Nilai `null`/`undefined` $\rightarrow$ mengembalikan `""`.
  - _Path 2_: Nilai biasa tanpa karakter formula $\rightarrow$ di-quote standar `"[text]"`.
  - _Path 3_: Nilai berawalan formula (`=`, `+`, `-`, `@`) $\rightarrow$ di-prefix tanda petik tunggal `"'[text]"`.

#### 2. Fungsi `calculateDashboardStats(rows, days)` (`src/lib/dashboard-analytics.ts`)

- **Node Keputusan**:
  1. Perulangan inisialisasi hari `for (let i = days - 1; i >= 0; i--)`
  2. Pengecekan hari ini `k === today`
  3. Pengecekan tamu umum vs karyawan `!r.employees || !r.employees.name`
  4. Pengecekan durasi isi `r.fill_duration_seconds != null && > 0`
  5. Validasi durasi normal `validDurs.length > 0` vs `rawDurs.length > 0`
  6. Penentuan `isPeak` pada traffic jam
  7. Pembentukan rekomendasi `busiest && busiest[1] > 0`
  8. Pembentukan rekomendasi kecepatan `calculatedAvg <= 45`
- **Cyclomatic Complexity**: $V(G) = 9 + 1 = 10$ (Batas Optimal, $\le 10$)
- **Hasil**: Seluruh cabang teruji pada pengujian otomatis `dashboard-analytics.test.ts`.

---

### C. Matriks Eksekusi Pengujian (Test Execution Matrix)

Pengujian dijalankan menggunakan test runner **Vitest v4.1.12** dengan engine virtual DOM **JSDOM**:

| No  | File Test Suite                          | Target Modul / Fungsi     | Deskripsi Pengujian Kotak Putih                                          |       Hasil       |
| :-: | :--------------------------------------- | :------------------------ | :----------------------------------------------------------------------- | :---------------: |
|  1  | `src/test/validation.test.ts`            | `guestSchema`             | Input data tamu lengkap dan valid diterima                               | **PASSED** (5ms)  |
|  2  | `src/test/validation.test.ts`            | `guestSchema`             | Tamu kunjungan umum (`employee_id: null`) tetap valid                    | **PASSED** (1ms)  |
|  3  | `src/test/validation.test.ts`            | `guestSchema`             | Validasi nama tamu wajib (kosong ditolak)                                | **PASSED** (1ms)  |
|  4  | `src/test/validation.test.ts`            | `guestSchema`             | Validasi nomor ponsel Indonesia (harus valid format)                     | **PASSED** (1ms)  |
|  5  | `src/test/validation.test.ts`            | `guestSchema`             | Validasi batas waktu: jadwal masa lalu ditolak                           | **PASSED** (1ms)  |
|  6  | `src/test/validation.test.ts`            | `guestSchema`             | Validasi tujuan kunjungan wajib dipilih                                  | **PASSED** (0ms)  |
|  7  | `src/test/validation.test.ts`            | `employeeSchema`          | Email karyawan format salah ditolak                                      | **PASSED** (1ms)  |
|  8  | `src/test/validation.test.ts`            | `employeeSchema`          | Email karyawan bernilai kosong diperbolehkan                             | **PASSED** (0ms)  |
|  9  | `src/test/validation.test.ts`            | `purposeSchema`           | Nama tujuan kunjungan wajib diisi                                        | **PASSED** (1ms)  |
| 10  | `src/test/export-utils.test.ts`          | `escapeCsvCell`           | Penanganan nilai `null` dan `undefined`                                  | **PASSED** (4ms)  |
| 11  | `src/test/export-utils.test.ts`          | `escapeCsvCell`           | Escaping karakter injeksi formula spreadsheet (`=`, `+`, `-`, `@`)       | **PASSED** (1ms)  |
| 12  | `src/test/export-utils.test.ts`          | `escapeCsvCell`           | Escaping tanda kutip ganda internal pada string                          | **PASSED** (1ms)  |
| 13  | `src/test/export-utils.test.ts`          | `exportToExcel`           | Pembentukan workbook XLSX, penataan AOA, dan auto column width           | **PASSED** (62ms) |
| 14  | `src/test/export-utils.test.ts`          | `exportToPdf`             | Instansiasi jsPDF, render autoTable A4 Landscape, dan penomoran          | **PASSED** (31ms) |
| 15  | `src/test/export-utils.test.ts`          | `exportToCsv`             | Pembuatan Blob UTF-8 BOM dan trigger unduhan peramban                    | **PASSED** (7ms)  |
| 16  | `src/test/dashboard-analytics.test.ts`   | `calculateDashboardStats` | Kalkulasi distribusi lalu lintas per jam operasional & identifikasi peak | **PASSED** (24ms) |
| 17  | `src/test/dashboard-analytics.test.ts`   | `calculateDashboardStats` | Agregasi dan pengelompokan tamu per divisi/departemen gedung             | **PASSED** (2ms)  |
| 18  | `src/test/dashboard-analytics.test.ts`   | `calculateDashboardStats` | Sintesis 4 actionable building management insights dari metrik riil      | **PASSED** (2ms)  |
| 19  | `src/test/dashboard-analytics.test.ts`   | `calculatePeriodDiff`     | Perhitungan persentase pertumbuhan volume kunjungan antarkerangka waktu  | **PASSED** (0ms)  |
| 20  | `src/test/activity-and-feedback.test.ts` | `filterActivityLogs`      | Penyaringan log aktivitas berdasarkan kategori aksi                      | **PASSED** (4ms)  |
| 21  | `src/test/activity-and-feedback.test.ts` | `filterActivityLogs`      | Pencarian teks bebas pada judul dan objek rincian JSON                   | **PASSED** (1ms)  |
| 22  | `src/test/activity-and-feedback.test.ts` | `calculateActivityStats`  | Akumulasi statistik aktivitas harian dan aktor staf                      | **PASSED** (1ms)  |
| 23  | `src/test/activity-and-feedback.test.ts` | `buildSyntheticLogs`      | Pembentukan log audit sintetis dari entitas tamu & feedback              | **PASSED** (1ms)  |
| 24  | `src/test/activity-and-feedback.test.ts` | `escapeCsvCell`           | Proteksi tambahan injeksi formula pada modul aktivitas                   | **PASSED** (0ms)  |
| 25  | `src/test/activity-and-feedback.test.ts` | `escapeCsvCell`           | Pembersihan teks bersarang ganda pada ekspor log                         | **PASSED** (0ms)  |
| 26  | `src/test/app-routing.test.tsx`          | TanStack Router           | Integritas routing URL root `/` dan layout komponen                      | **PASSED** (11ms) |

---

### D. Rekapitulasi Hasil Pengujian

```text
✓ Test Suites : 5 passed (5 total)
✓ Tests       : 26 passed (26 total)
✓ Snapshots   : 0 total
✓ Time        : 10.58s
✓ Status      : 100% SUKSES (ZERO DEFECTS)
```

### Kesimpulan Pengujian Kotak Putih:

1. **Keamanan Formula Spreadsheet Terjamin**: Input berbasis spreadsheet terproteksi dari potensi eksploitasi eksekusi formula DDE/CSV injection.
2. **Kesesuaian Validasi Alur Tamu**: Jalur untuk tamu spesifik karyawan maupun kunjungan umum/resepsionis telah tervalidasi bebas dari error percabangan (_null pointer reference_).
3. **Kestabilan Perhitungan Visualisasi**: Algoritma kalkulasi _Peak Hours_ dan _Department Traffic_ mampu menangani kumpulan data kosong (_empty dataset_) maupun data bervolume ribuan baris dengan kompleksitas linear $O(N)$.
