import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BookOpen,
  Building2,
  CheckCircle2,
  Clock,
  HelpCircle,
  PhoneCall,
  QrCode,
  Shield,
  ShieldCheck,
  Smartphone,
  UserCheck,
  Users,
  WifiOff,
} from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/panduan")({
  head: () => ({
    meta: [
      { title: "Panduan Penggunaan Buku Tamu — Menara Nobu" },
      {
        name: "description",
        content:
          "Panduan lengkap alur penggunaan buku tamu digital bagi pengunjung, resepsionis, dan karyawan Menara Nobu.",
      },
      { property: "og:title", content: "Panduan Penggunaan Buku Tamu — Menara Nobu" },
      {
        property: "og:description",
        content:
          "Panduan lengkap alur penggunaan buku tamu digital bagi pengunjung, resepsionis, dan karyawan Menara Nobu.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Guide,
});

function Guide() {
  const cardStyle = "rounded-2xl bg-card p-5 sm:p-7 shadow-soft border border-border/80";

  return (
    <main className="min-h-screen bg-background">
      <SiteNav
        items={[
          { to: "/", label: "Beranda" },
          { to: "/registrasi", label: "Registrasi Tamu" },
          { to: "/panduan", label: "Panduan" },
          { to: "/karyawan", label: "Karyawan" },
          { to: "/admin/login", label: "Admin" },
        ]}
      />

      <div className="fade-up mx-auto max-w-4xl space-y-8 px-4 py-8 sm:py-12">
        {/* Header Utama */}
        <header className="text-center sm:text-left">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
            <BookOpen className="h-3.5 w-3.5 text-primary" />
            Pusat Panduan Operasional
          </span>
          <h1 className="mt-2 font-display text-2xl font-black text-foreground sm:text-4xl">
            Panduan Penggunaan Buku Tamu Menara Nobu
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Tata cara registrasi kunjungan digital yang cepat, praktis, dan aman bagi pengunjung,
            petugas lobi, serta karyawan penerima tamu di Menara Nobu.
          </p>
        </header>

        {/* Banner Pengantar */}
        <div className="rounded-2xl border border-brand/40 bg-gradient-to-r from-brand-soft via-brand-soft/70 to-card p-5 text-foreground sm:p-6">
          <p className="flex items-center gap-2 font-display text-base font-bold text-primary sm:text-lg">
            <span>👋</span> Selamat Datang di Menara Nobu
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
            Sistem Buku Tamu Digital ini dirancang untuk memudahkan proses check-in di lobi gedung,
            mencegah antrean panjang, menjaga kerahasiaan nomor kontak tamu, serta memberikan
            notifikasi kedatangan secara instan ke karyawan yang dituju.
          </p>
        </div>

        {/* 1. Alur Tamu / Pengunjung */}
        <section className={cardStyle}>
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-primary">
              <Smartphone className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-foreground sm:text-xl">
                1. Alur Registrasi Tamu / Pengunjung
              </h2>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Dapat diisi melalui smartphone pengunjung atau tablet mandiri di meja resepsionis
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3.5 sm:grid-cols-2">
            <div className="rounded-xl border border-border/80 bg-background p-4">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                1
              </span>
              <p className="mt-2 text-sm font-bold text-foreground">Akses Formulir Digital</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Buka menu <b>Registrasi Tamu</b> melalui web atau pindai <b>QR Code</b> yang
                tersedia di meja lobi lantai dasar Menara Nobu.
              </p>
            </div>

            <div className="rounded-xl border border-border/80 bg-background p-4">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                2
              </span>
              <p className="mt-2 text-sm font-bold text-foreground">Isi Data Kunjungan</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Ketikkan Nama Lengkap, Instansi / Perusahaan Anda, nomor WhatsApp aktif, keperluan
                kunjungan, serta nama staf Bank Nobu yang Anda tuju.
              </p>
            </div>

            <div className="rounded-xl border border-border/80 bg-background p-4">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                3
              </span>
              <p className="mt-2 text-sm font-bold text-foreground">Kirim Formulir</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Tekan tombol <b>Kirim Registrasi</b>. Sistem akan mencatat waktu check-in secara
                otomatis dan mengirimkan notifikasi langsung ke staf terkait.
              </p>
            </div>

            <div className="rounded-xl border border-border/80 bg-background p-4">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                4
              </span>
              <p className="mt-2 text-sm font-bold text-foreground">
                Tunjukkan Bukti ke Resepsionis
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Layar konfirmasi berhasil akan muncul beserta ringkasan kunjungan. Tunjukkan layar
                tersebut kepada petugas resepsionis untuk penukaran visitor pass.
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-muted/50 p-3.5 text-xs text-muted-foreground">
            <WifiOff className="h-4 w-4 shrink-0 text-primary mt-0.5" />
            <span>
              <b>Fitur Auto-Save Cerdas:</b> Jika koneksi internet Anda terputus atau halaman tidak
              sengaja tertutup, data isian Anda tetap tersimpan di perangkat sehingga Anda dapat
              melanjutkan pengisian tanpa mengetik ulang.
            </span>
          </div>
        </section>

        {/* 2. Alur Petugas Resepsionis Lobi */}
        <section className={cardStyle}>
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-primary">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-foreground sm:text-xl">
                2. Alur Petugas Resepsionis & Keamanan Lobi
              </h2>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Prosedur standar operasional penyambutan dan penerimaan tamu gedung
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3 text-xs leading-relaxed text-muted-foreground sm:text-sm">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-primary mt-0.5" />
              <span>
                <b>Verifikasi Identitas:</b> Minta tamu memperlihatkan kartu identitas resmi (KTP /
                SIM / Paspor) yang sesuai dengan nama yang didaftarkan pada buku tamu digital.
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-primary mt-0.5" />
              <span>
                <b>Penyerahan Visitor Pass:</b> Serahkan kartu akses tamu (Visitor Badge) sesuai
                dengan lantai tujuan atau ruang pertemuan yang telah dipesan.
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-primary mt-0.5" />
              <span>
                <b>Tamu Berkepentingan Khusus / VIP:</b> Jika tamu menandai status prioritas atau
                tamu pimpinan, hubungi sekretaris lantai terkait melalui telepon internal ekstensi
                lobi.
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-primary mt-0.5" />
              <span>
                <b>Buku Tamu Live Dashboard:</b> Petugas dapat memantau kedatangan tamu real-time
                melalui menu <b>Admin &gt; Tamu</b> di komputer meja resepsionis.
              </span>
            </div>
          </div>
        </section>

        {/* 3. Alur Karyawan Penerima Tamu */}
        <section className={cardStyle}>
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-primary">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-foreground sm:text-xl">
                3. Alur Karyawan yang Menerima Tamu
              </h2>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Notifikasi dan koordinasi bagi staf atau pimpinan yang menerima kunjungan
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3 text-xs leading-relaxed text-muted-foreground sm:text-sm">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-primary mt-0.5" />
              <span>
                <b>Portal Karyawan:</b> Buka menu <b>Karyawan</b> untuk melihat daftar tamu yang
                sedang menunggu di lobi atau jadwal pertemuan hari ini.
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-primary mt-0.5" />
              <span>
                <b>Notifikasi Masuk:</b> Begitu tamu menekan tombol kirim di lobi, status kedatangan
                akan segera terbarui di portal karyawan.
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-primary mt-0.5" />
              <span>
                <b>Penyambutan Tamu:</b> Karyawan dapat turun ke lobi atau menginstruksikan
                resepsionis untuk mengarahkan tamu ke ruang meeting lantai terkait.
              </span>
            </div>
          </div>
        </section>

        {/* 4. Etika & Tata Tertib Gedung */}
        <section className={cardStyle}>
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-primary">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-foreground sm:text-xl">
                4. Tata Tertib Kunjungan Menara Nobu
              </h2>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Pedoman keamanan dan kenyamanan lingkungan gedung
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 text-xs sm:text-sm">
            <div className="rounded-xl border border-border/70 bg-background p-3.5">
              <p className="font-bold text-foreground">👔 Busana Rapi & Sopan</p>
              <p className="mt-1 text-muted-foreground text-xs">
                Pengunjung diwajibkan mengenakan pakaian formal/rapi serta sepatu tertutup selama
                berada di area perkantoran Menara Nobu.
              </p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background p-3.5">
              <p className="font-bold text-foreground">🪪 Wajib Menggunakan Badge</p>
              <p className="mt-1 text-muted-foreground text-xs">
                Visitor pass harus selalu dikalungkan atau disematkan di pakaian selama berada di
                dalam gedung dan dikembalikan saat meninggalkan gedung.
              </p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background p-3.5">
              <p className="font-bold text-foreground">🚭 Kawasan Bebas Rokok</p>
              <p className="mt-1 text-muted-foreground text-xs">
                Dilarang merokok dan vaping di seluruh area dalam gedung, lorong, lift, dan toilet.
                Area khusus merokok tersedia di luar lobi samping.
              </p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background p-3.5">
              <p className="font-bold text-foreground">🅿️ Parkir & Drop-Off</p>
              <p className="mt-1 text-muted-foreground text-xs">
                Drop-off tamu tersedia di lobby utama. Parkir kendaraan roda 4 dan roda 2 tersedia
                di gedung parkir basement dengan tarif standar.
              </p>
            </div>
          </div>
        </section>

        {/* 5. Prosedur Pemindai Barcode / QR Code & Akses Keamanan */}
        <section className={cardStyle}>
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-primary">
              <QrCode className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-foreground sm:text-xl">
                5. Prosedur Pemindai Barcode / QR Code
              </h2>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Fungsi ganda untuk check-in mandiri tamu dan verifikasi keamanan petugas lobi
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 text-xs sm:text-sm">
            <div className="rounded-xl border border-border/80 bg-background p-4 space-y-2">
              <p className="font-bold text-primary flex items-center gap-1.5">
                <span>📱</span> Untuk Tamu Publik (Self Check-In)
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Pengunjung yang telah memiliki QR code undangan digital dapat memindai langsung
                melalui menu <b>Pindai QR</b> di ponsel atau di tablet kios lobi untuk verifikasi
                kehadiran instan tanpa perlu antre di meja resepsionis.
              </p>
            </div>

            <div className="rounded-xl border border-border/80 bg-background p-4 space-y-2">
              <p className="font-bold text-primary flex items-center gap-1.5">
                <span>🛡️</span> Untuk Petugas Lobi & Security
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Petugas memindai <b>Visitor Badge Pass</b> (lanyard/stiker) saat tamu melewati
                gerbang akses (turnstile) atau saat check-out untuk memastikan pass berstatus{" "}
                <b>AKTIF HARI INI</b>, memeriksa staf penanggung jawab, serta menjaga keamanan
                perimeter gedung.
              </p>
            </div>
          </div>
        </section>
      </div>

      <SiteFooter />
    </main>
  );
}
