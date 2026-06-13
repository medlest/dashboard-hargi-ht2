import { sql } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Abo2026View } from "./abo-2026-view";
import type { AboRow } from "@/lib/aggregate";

export const dynamic = "force-dynamic";

export default async function Abo2026Page() {
  const rows = (await sql`
    select coalesce(no,'') no, coalesce(upt,'') upt, coalesce(ultg,'') ultg,
           coalesce(gardu_induk,'') gardu_induk, coalesce(jadwal_rencana,'') jadwal_rencana,
           coalesce(realisasi,'') realisasi, coalesce(status,'') status,
           coalesce(jenis_anomali,'') jenis_anomali, coalesce(status_fix,'') status_fix
    from hargi_ht2.abo_2026
    order by id
  `) as unknown as AboRow[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="ABO 2026"
        subtitle="Rencana dan Realisasi ABO 2026 · UIT Jawa Bagian Tengah"
        sourceUrl="https://docs.google.com/spreadsheets/d/11HQFitHH8xISZvVxuG0rd0q84Y6tOtCi7jO7wDbUeVs/edit#gid=1761063736"
      />
      <Abo2026View rows={rows} />
    </div>
  );
}
