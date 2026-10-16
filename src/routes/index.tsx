import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipboardCheck, Clock, Save, ShieldCheck, Smartphone, UserCheck } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import lobby from "@/assets/lobby.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Buku Tamu Digital Menara Nobu" },
      { name: "description", content: "Registrasi tamu Menara Nobu cepat, tanpa antre, dan tersimpan otomatis. Isi data kunjungan Anda dalam satu menit." },
      { property: "og:title", content: "Buku Tamu Digital Menara Nobu" },
      { property: "og:description", content: "Registrasi tamu cepat, tanpa antre, dan tersimpan otomatis." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const nav = [
  { to: "/", label: "Beranda" },
  { to: "#fitur", label: "Fitur" },
  { to: "#cara", label: "Cara Kerja" },
  { to: "#faq", label: "FAQ" },
  { to: "/registrasi", label: "Registrasi Tamu" },
  { to: "/panduan", label: "Panduan" },
  { to: "/admin/login", label: "Admin" },
];

const features = [
  { icon: Clock, t: "Kurang dari 1 menit", d: "Formulir singkat, langsung ke inti tanpa antre di meja resepsionis." },
  { icon: Save, t: "Tersimpan otomatis", d: "Isian aman walau koneksi terputus atau halaman tertutup." },
  { icon: Smartphone, t: "Dari perangkat apa saja", d: "Nyaman di ponsel, tablet kiosk, maupun komputer." },
  { icon: ShieldCheck, t: "Data terlindungi", d: "Data kunjungan hanya dapat dilihat oleh petugas berwenang." },
];

const steps = [
  { icon: ClipboardCheck, t: "Isi data diri", d: "Nama, instansi, dan nomor telepon." },
  { icon: UserCheck, t: "Pilih tujuan", d: "Tujuan kunjungan dan siapa yang ingin ditemui." },
  { icon: Clock, t: "Tunggu dipanggil", d: "Pihak yang dituju segera kami hubungi." },
];

const faqs = [
  { q: "Apakah saya perlu membuat akun untuk mendaftar?", a: "Tidak. Tamu cukup mengisi formulir registrasi tanpa membuat akun." },
  { q: "Bagaimana jika koneksi internet saya terputus?", a: "Isian Anda tersimpan otomatis di perangkat dan dikirim kembali saat koneksi pulih." },
  { q: "Bisakah saya mendaftar sebelum hari kunjungan?", a: "Bisa. Pilih tanggal dan jam kunjungan di formulir; pihak yang Anda temui akan mendapat pengingat." },
  { q: "Siapa yang dapat melihat data saya?", a: "Hanya petugas berwenang dan karyawan yang Anda tuju. Detailnya ada di Kebijakan Privasi." },
  { q: "Apakah situs ini memakai cookie?", a: "Kami hanya memakai penyimpanan yang diperlukan agar formulir dan login berfungsi, tanpa cookie iklan atau pelacakan. Lihat Kebijakan Cookie." },
  { q: "Bagaimana cara meminta data saya dihapus?", a: "Hubungi resepsionis Menara Nobu atau petugas keamanan gedung; permintaan akan diproses oleh admin." },
];

function Landing() {
  return (
    <div className="min-h-screen overflow-x-clip bg-background">
      <SiteNav items={nav} />
      <main id="konten" tabIndex={-1} className="outline-none">

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-6 md:grid-cols-2 md:pt-12">
        <div className="fade-up">
          <span className="inline-block rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">Buku Tamu Digital</span>
          <h1 className="mt-4 text-4xl leading-tight text-foreground sm:text-5xl lg:text-6xl">
            Selamat datang di <span className="text-primary">Menara Nobu</span>
          </h1>
          <p className="mt-4 max-w-md text-lg text-muted-foreground">
            Daftarkan kunjungan Anda dalam hitungan detik. Tanpa kertas, tanpa antre, langsung terhubung dengan pihak yang Anda tuju.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/registrasi" className="inline-flex min-h-13 items-center justify-center rounded-full bg-primary px-8 py-3.5 font-display text-lg font-bold text-primary-foreground shadow-soft transition-all hover:-translate-y-0.5 hover:brightness-110 active:scale-95">
              Mulai Registrasi →
            </Link>
            <a href="#cara" className="inline-flex min-h-13 items-center justify-center rounded-full border border-border bg-card px-8 py-3.5 font-medium text-foreground transition-colors hover:bg-brand-soft">
              Lihat caranya
            </a>
          </div>
        </div>
        <div className="fade-up relative [animation-delay:150ms]">
          <div className="absolute -inset-4 -z-10 rounded-[2.5rem] bg-brand/25 blur-2xl" />
          <img src={lobby} alt="Lobi Menara Nobu dengan meja resepsionis" width={1280} height={960} className="w-full rounded-[2rem] object-cover shadow-soft" />
          <div className="absolute -bottom-5 left-4 flex items-center gap-3 rounded-2xl bg-card px-4 py-3 shadow-soft sm:left-6">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-foreground"><Clock className="h-5 w-5" /></span>
            <div><p className="font-display font-bold text-foreground">± 1 menit</p><p className="text-xs text-muted-foreground">rata-rata waktu registrasi</p></div>
          </div>
        </div>
      </section>

      <section id="fitur" className="scroll-mt-24 bg-card py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl text-foreground">Kenapa registrasi digital?</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f, i) => (
              <div key={f.t} style={{ animationDelay: `${i * 80}ms` }} className="fade-up rounded-3xl bg-background p-6 transition-transform duration-300 hover:-translate-y-1">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-primary"><f.icon className="h-6 w-6" /></span>
                <h3 className="mt-4 text-lg font-bold text-foreground">{f.t}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="cara" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-16">
        <h2 className="text-center text-3xl text-foreground">3 langkah mudah</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.t} className="relative rounded-3xl border border-border bg-card p-6">
              <span className="absolute right-5 top-4 font-display text-5xl font-extrabold text-brand/40">{i + 1}</span>
              <s.icon className="h-7 w-7 text-primary" />
              <h3 className="mt-3 text-lg font-bold text-foreground">{s.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 pb-16">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 rounded-[2rem] bg-primary px-6 py-12 text-center text-primary-foreground shadow-soft">
          <h2 className="text-3xl">Siap berkunjung?</h2>
          <p className="max-w-md opacity-90">Isi formulir sekarang dan kami akan segera menghubungkan Anda.</p>
          <Link to="/registrasi" className="inline-flex min-h-12 items-center rounded-full bg-brand px-8 py-3 font-display text-lg font-bold text-foreground transition-all hover:-translate-y-0.5 active:scale-95">
            Registrasi Sekarang
          </Link>
        </div>
      </section>

      <section id="faq" aria-labelledby="faq-judul" className="mx-auto max-w-3xl scroll-mt-24 px-4 py-16">
        <h2 id="faq-judul" className="text-center text-3xl text-foreground">Pertanyaan yang sering diajukan</h2>
        <Accordion type="single" collapsible className="mt-8 rounded-3xl border border-border bg-card px-5">
          {faqs.map((f, i) => (
            <AccordionItem key={i} value={`q${i}`}>
              <AccordionTrigger className="text-left text-base">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
      </main>
      <SiteFooter />
    </div>
  );
}
