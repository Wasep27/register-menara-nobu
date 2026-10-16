import { createFileRoute } from "@tanstack/react-router";
import { MasterCrud } from "@/components/MasterCrud";

export const Route = createFileRoute("/admin/tujuan")({
  component: () => <MasterCrud table="visit_purposes" title="Tujuan Kunjungan" />,
});
