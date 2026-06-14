import { sql } from "@/lib/db";
import { ABO_2026_SHEET, sheetEditUrl } from "@/lib/sheets";
import { PageHeader } from "@/components/page-header";
import { Abo2026View } from "./abo-2026-view";
import type { AboRow } from "@/lib/aggregate";

export const dynamic = "force-dynamic";

export default async function Abo2026Page() {
  const [row] = (await sql`
    select 
      (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
         select coalesce(no,'') no, coalesce(upt,'') upt, coalesce(ultg,'') ultg,
                coalesce(gardu_induk,'') gardu_induk, coalesce(jadwal_rencana,'') jadwal_rencana,
                coalesce(realisasi,'') realisasi, coalesce(status,'') status,
                coalesce(jenis_anomali,'') jenis_anomali, coalesce(status_fix,'') status_fix
         from hargi_ht2.abo_2026
         order by id
      ) x) as rows,
      (select coalesce(jsonb_agg(y), '[]'::jsonb) from (
         select upt, status as kondisi_akhir
         from hargi_ht2.abo_2026
         where jenis_anomali ilike '%AHI%' and jenis_anomali ilike '%aset kritikal%'
      ) y) as ahi_critical,
      (select to_jsonb(m) from (
         select NULL as name,
                NULL as modified
         from hargi_ht2.refresh_log
         where status = 'success' and finished_at is not null
         order by id desc limit 1) m) as meta
  `) as unknown as [{ 
    rows: AboRow[]; 
    ahi_critical: { upt: string; kondisi_akhir: string }[];
    meta: { name: string; modified: string } | null 
  }];

  const { rows, ahi_critical, meta } = row;

  return (
    <div className="space-y-6">
      <PageHeader
        title="ABO 2026"
        subtitle="Rencana dan Realisasi ABO 2026 · UIT Jawa Bagian Tengah"
        sourceUrl={sheetEditUrl(ABO_2026_SHEET)}
        sheetName={meta?.name || "ABO 2026"}
        sheetModified={meta?.modified}
      />
      <Abo2026View rows={rows} ahiCritical={ahi_critical} />
    </div>
  );
}
