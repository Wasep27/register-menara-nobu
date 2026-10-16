import { createFileRoute } from "@tanstack/react-router";
import { MasterCrud } from "@/components/MasterCrud";

export const Route = createFileRoute("/admin/karyawan")({
  component: () => <MasterCrud table="employees" title="Karyawan" withDept />,
});
