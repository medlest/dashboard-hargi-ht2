import { sql } from "@/lib/db";
import { PARETO_SHEET, sheetEditUrl } from "@/lib/sheets";
import { PageHeader } from "@/components/page-header";
import { ParetoView } from "./pareto-view";
import type { GgnRow } from "@/lib/aggregate";

export const dynamic = "force-dynamic";

export default async function ParetoPage() {
  const [rows, [last]] = (await Promise.all([
    sql`
      select coalesce(no,'') no, coalesce(tgl_keluar,'') tgl_keluar, coalesce(unit,'') unit,
             coalesce(gardu,'') gardu, coalesce(nama_bay,'') nama_bay, coalesce(kategori,'') kategori,
             coalesce(sebab,'') sebab, coalesce(tahun,'') tahun, coalesce(bulan,'') bulan
      from hargi_ht2.gangguan_trafo
      order by id`,
    sql`
      select sheet_name_pareto as sheet_name,
             to_char(sheet_modified_pareto at time zone 'Asia/Jakarta', 'DD Mon YYYY') sheet_mod
      from hargi_ht2.refresh_log
      where status = 'success' and finished_at is not null
      order by id desc limit 1`,
  ])) as unknown as [GgnRow[], { sheet_name: string | null; sheet_mod: string | null }[]];

  return (
    <>
      <PageHeader
        title="Trend Gangguan Trafo"
        subtitle="Gangguan transformator · UIT Jawa Bagian Tengah"
        sourceUrl={sheetEditUrl(PARETO_SHEET)}
          sheetName={last?.sheet_name ?? null}
          sheetModified={last?.sheet_mod ?? null}
      />
      <ParetoView rows={rows} />
    </>
  );
}
