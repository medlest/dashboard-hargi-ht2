import { sql } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { AsesmentBushingView } from "./asesment-bushing-view";

export const dynamic = "force-dynamic";

export default async function AsesmentBushingPage() {
  // Ambil data asesment bushing dan metadata refresh terakhir dalam satu query (ADR-3)
  const [row] = (await sql`
    select 
      (select coalesce(jsonb_agg(x order by x.id), '[]'::jsonb) from (
         select id, techidentno, nama_upt, gardu_induk, bay_penghantar, merk, tipe, tgl_oprs, usia, thn_buat,
                jenis_bushing_primer_r, merk_primer_r, type_primer_r, sn_primer_r,
                jenis_bushing_primer_s, merk_primer_s, type_primer_s, sn_primer_s,
                jenis_bushing_primer_t, merk_primer_t, type_primer_t, sn_primer_t,
                jenis_bushing_skunder_r, merk_skunder_r, type_skunder_r, sn_skunder_r,
                jenis_bushing_skunder_s, merk_skunder_s, type_skunder_s, sn_skunder_s,
                jenis_bushing_skunder_t, merk_skunder_t, type_skunder_t, sn_skunder_t,
                overall, level_minyak, hasil_thermovisi, kondisi_fisik, keterangan, link_evidence
         from hargi_ht2.asesment_bushing
      ) x) as rows,
      (select to_jsonb(m) from (
         select to_char(finished_at at time zone 'Asia/Jakarta', 'DD Mon YYYY · HH24:MI') as synced_at
         from hargi_ht2.refresh_log
         where status = 'success' and finished_at is not null
         order by id desc limit 1) m) as meta
  `) as unknown as [{
    rows: any[];
    meta: { synced_at: string } | null;
  }];

  const { rows, meta } = row;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Monitoring Asesment Bushing"
        subtitle="Sistem Monitoring Hasil Asesment & Kondisi Bushing Trafo · UIT Jawa Bagian Tengah"
        sourceUrl="https://docs.google.com/spreadsheets/d/1HS08VH-CURCJiqjDqhCd1z1VFWbnykA89IrlJaAm9BA/edit#gid=706438307"
        sheetName="Asesment Bushing"
        sheetModified={meta?.synced_at?.split(" · ")[0]}
      />
      <AsesmentBushingView rows={rows} />
    </div>
  );
}
