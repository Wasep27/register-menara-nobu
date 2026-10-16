import { createFileRoute } from "@tanstack/react-router";
import { PolicyPage } from "@/components/PolicyPage";

export const Route = createFileRoute("/privasi")({
  head: () => ({
    meta: [
      { title: "Kebijakan Privasi · Buku Tamu Menara Nobu" },
      { name: "description", content: "Cara Buku Tamu Digital Menara Nobu mengumpulkan, memakai, dan melindungi data kunjungan Anda." },
      { property: "og:title", content: "Kebijakan Privasi · Buku Tamu Menara Nobu" },
      { property: "og:description", content: "Data apa yang kami kumpulkan dan bagaimana kami melindunginya." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <PolicyPage
      title="Kebijakan Privasi"
      updated="16 Oktober 2026"
      sections={[
        { h: "Data yang kami kumpulkan", p: ["Nama, instansi, nomor telepon, tujuan kunjungan, karyawan yang dituju, serta jadwal dan waktu kunjungan."] },
        { h: "Tujuan penggunaan", p: ["Data dipakai untuk keamanan gedung, menghubungi pihak yang Anda temui, dan laporan kunjungan internal. Data tidak dijual atau dibagikan untuk iklan."] },
        { h: "Siapa yang dapat mengakses", p: ["Hanya admin berwenang dan karyawan yang Anda tuju. Pengunjung lain tidak dapat melihat data tamu."] },
        { h: "Penyimpanan & keamanan", p: ["Data disimpan di server terenkripsi dengan pembatasan akses berbasis peran. Draf formulir disimpan sementara dan dihapus setelah dikirim."] },
        { h: "Hak Anda", p: ["Anda dapat meminta data Anda dilihat, diperbaiki, atau dihapus dengan menghubungi resepsionis Menara Nobu, sesuai UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi."] },
      ]}
    />
  ),
});
