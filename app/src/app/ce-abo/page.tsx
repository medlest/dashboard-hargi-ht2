import { sql } from "@/lib/db";
import { CE_ABO_SHEET, sheetEditUrl } from "@/lib/sheets";
import { PageHeader } from "@/components/page-header";
import { CeAboView } from "./ce-abo-view";
import type { CeRow } from "@/lib/aggregate";

export const dynamic = "force-dynamic";

export default async function CeAboPage() {
  const [rows, [last]] = (await Promise.all([
    sql`
      select coalesce(kode,'') kode, coalesce(sub_bidang,'') sub_bidang,
             coalesce(level_anomali,'') level_anomali, coalesce(uraian,'') uraian,
             coalesce(upt,'') upt, coalesce(ultg,'') ultg, coalesce(gardu_induk,'') gardu_induk,
             coalesce(nama_ruas_bay,'') nama_ruas_bay, coalesce(nama_alat,'') nama_alat,
             coalesce(kondisi_terkini,'') kondisi_terkini, coalesce(kondisi_awal,'') kondisi_awal,
             coalesce(kondisi_akhir,'') kondisi_akhir, coalesce(status_terkini,'') status_terkini
      from hargi_ht2.ce_abo_findings
      order by id`,
    sql`
      select sheet_name_ce as sheet_name,
             to_char(sheet_modified_ce at time zone 'Asia/Jakarta', 'DD Mon YYYY') sheet_mod
      from hargi_ht2.refresh_log
      where status = 'success' and finished_at is not null
      order by id desc limit 1`,
  ])) as unknown as [CeRow[], { sheet_name: string | null; sheet_mod: string | null }[]];

  return (
    <>
      <PageHeader
        title="Common Enemy Next Level 2026"
        subtitle="Temuan anomali HARGI · UIT Jawa Bagian Tengah"
        sourceUrl={sheetEditUrl(CE_ABO_SHEET)}
          sheetName={last?.sheet_name ?? null}
          sheetModified={last?.sheet_mod ?? null}
      />
      <CeAboView rows={rows} />
    </>
  );
}
