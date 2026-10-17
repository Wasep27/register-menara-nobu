import { createFileRoute } from "@tanstack/react-router";
import { CookieSettings } from "@/components/CookieSettings";
import { PolicyPage } from "@/components/PolicyPage";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: "Kebijakan Cookie · Buku Tamu Menara Nobu" },
      {
        name: "description",
        content:
          "Penyimpanan apa saja yang dipakai Buku Tamu Digital Menara Nobu di perangkat Anda dan alasannya.",
      },
      { property: "og:title", content: "Kebijakan Cookie · Buku Tamu Menara Nobu" },
      {
        property: "og:description",
        content: "Hanya penyimpanan yang diperlukan, tanpa pelacakan atau iklan.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <PolicyPage
      title="Kebijakan Cookie"
      updated="16 Oktober 2026"
      sections={[
        {
          h: "Yang kami pakai",
          p: [
            "Situs ini hanya memakai penyimpanan yang benar-benar diperlukan: draf formulir tamu (agar isian tidak hilang) dan sesi login untuk admin serta karyawan.",
          ],
        },
        {
          h: "Yang tidak kami pakai",
          p: ["Tidak ada cookie iklan, pelacakan lintas situs, atau analitik pihak ketiga."],
        },
        {
          h: "Mengelola penyimpanan",
          p: [
            "Anda dapat menghapus data situs kapan saja melalui pengaturan browser. Akibatnya draf formulir akan hilang dan Anda perlu login ulang.",
          ],
        },
      ]}
    >
      <CookieSettings />
    </PolicyPage>
  ),
});
