import { sql } from "@/lib/db";
import { PARETO_SHEET, sheetEditUrl } from "@/lib/sheets";
import { PageHeader } from "@/components/page-header";
import { AssetMapsView, type GiPoint } from "./asset-maps-view";

export const dynamic = "force-dynamic";

export default async function AssetMapsPage() {
  // Agregasi per GI di SQL: koordinat + jumlah gangguan + breakdown kategori
  // + trafo terdampak (nama_bay dinormalisasi: "TRF#4 150/20kV (INC)" → "TRF#4")
  const [points, [last]] = (await Promise.all([
    sql`
      select
        gardu,
        coalesce(max(nullif(trim(unit), '')), 'Tanpa Unit') as unit,
        avg(nullif(latitude, '')::float) as lat,
        avg(nullif(longitude, '')::float) as lng,
        count(*)::int as total,
        count(distinct trafo_id) filter (where trafo_id <> '')::int as trafo_count,
        coalesce(array_agg(distinct trafo_id) filter (where trafo_id <> ''), '{}') as trafo_ids,
        jsonb_object_agg(coalesce(nullif(kategori, ''), 'Lainnya'), cnt) as kategori_counts
      from (
        select gardu, unit, latitude, longitude, kategori,
               trim(regexp_replace(nama_bay, '\s+\d+.*$', '')) as trafo_id,
               count(*) over (partition by gardu, kategori) as cnt
        from hargi_ht2.gangguan_trafo
        where latitude ~ '^-?[0-9]+(\.[0-9]+)?$'
          and longitude ~ '^-?[0-9]+(\.[0-9]+)?$'
          and coalesce(trim(gardu), '') <> ''
      ) sub
      group by gardu
      order by total desc`,
    sql`
      select sheet_name_pareto as sheet_name,
             to_char(sheet_modified_pareto at time zone 'Asia/Jakarta', 'DD Mon YYYY') sheet_mod
      from hargi_ht2.refresh_log
      where status = 'success' and finished_at is not null
      order by id desc limit 1`,
  ])) as unknown as [GiPoint[], { sheet_name: string | null; sheet_mod: string | null }[]];

  return (
    <div className="-mx-4 -mb-12 -mt-4 flex h-dvh min-h-0 flex-col md:-mx-8 md:-mt-6">
      <div className="shrink-0 px-4 pt-4 md:px-8 md:pt-6">
        <PageHeader
          title="Asset Maps"
          subtitle="Sebaran Gardu Induk berdasarkan riwayat gangguan trafo"
          sourceUrl={sheetEditUrl(PARETO_SHEET)}
          sheetName={last?.sheet_name ?? null}
          sheetModified={last?.sheet_mod ?? null}
        />
      </div>
      <AssetMapsView points={points} />
    </div>
  );
}
