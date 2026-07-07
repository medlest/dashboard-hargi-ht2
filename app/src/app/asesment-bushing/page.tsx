import { sql } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { AsesmentBushingView, type DBBushingRecord } from "./asesment-bushing-view";

export const dynamic = "force-dynamic";

type AsesmentBushingQueryRow = {
  rows: DBBushingRecord[];
  meta: { synced_at: string } | null;
};

export default async function AsesmentBushingPage() {
  // Ambil data asesment bushing dan metadata refresh terakhir dalam satu query (ADR-3)
  const [row] = (await sql`
    select 
      (select coalesce(jsonb_agg(x order by x.id), '[]'::jsonb) from (
         select id, no, nama_upt, gardu_induk, bay_penghantar, merk, tipe, tgl_oprs,
                thn_buat, usia, fasa, merk_bushing, type_bushing, no_seri, jenis_bushing,
                level_minyak, hasil_thermovisi, kondisi_fisik, nilai_tadel, hasil_uji_tandel,
                kondisi_center_tap, keterangan
         from hargi_ht2.asesment_bushing
      ) x) as rows,
      (select to_jsonb(m) from (
         select to_char(finished_at at time zone 'Asia/Jakarta', 'DD Mon YYYY · HH24:MI') as synced_at
         from hargi_ht2.refresh_log
         where status = 'success' and finished_at is not null
         order by id desc limit 1) m) as meta
  `) as unknown as [AsesmentBushingQueryRow];

  const { rows, meta } = row;

  return (
    <div className="space-y-6">
      <PageHeader
        title="MONITORING BUSHING"
        subtitle="Sistem Monitoring Hasil Asesment & Kondisi Bushing Trafo · UIT Jawa Bagian Tengah"
        sourceUrl="https://docs.google.com/spreadsheets/d/1_bBncuTGo8s687UOP9XuU1ObhmTxDlPFXZzwVqYBs3M/edit?gid=0#gid=0"
        sheetName="Asesment Bushing"
        sheetModified={meta?.synced_at?.split(" · ")[0]}
      />
      <AsesmentBushingView rows={rows} />
    </div>
  );
}
