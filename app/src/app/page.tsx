import { sql } from "@/lib/db";
import { CE_ABO_SHEET, PARETO_SHEET, sheetEditUrl } from "@/lib/sheets";
import { PageHeader } from "@/components/page-header";
import { OverviewView } from "./overview-view";
import type {
  CeSummaryRow, GiSlim, LastGgn, MetaRow, MonthCount, YearCount,
} from "./overview-view";

export const dynamic = "force-dynamic";

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ unit?: string | string[] }>;
}) {
  const params = await searchParams;
  const selUnits = params.unit ? (Array.isArray(params.unit) ? params.unit : [params.unit]) : [];

  // SATU statement SQL (JSON aggregate) = satu round-trip, satu koneksi.
  const [row] = (await sql`
    select
      (select jsonb_build_object(
         'total', count(*)::int,
         'closed', count(*) filter (where kondisi_akhir like '%1-%' or kondisi_akhir like '%2-%')::int,
         'open', count(*) filter (where kondisi_akhir like '%3-%' or kondisi_akhir like '%4-%' or kondisi_akhir like '%5-%')::int)
       from hargi_ht2.ce_abo_findings
       where (upt = any(${selUnits}) or ${selUnits.length === 0})) as ce,
       
      (select jsonb_build_object(
         'total', count(*)::int,
         'closed', count(*) filter (where upper(status_fix) = 'CLOSE')::int,
         'open', count(*) filter (where upper(status_fix) <> 'CLOSE' or status_fix is null)::int)
       from hargi_ht2.abo_2026
       where (upt = any(${selUnits}) or ${selUnits.length === 0})) as abo,

      (select jsonb_build_object(
         'total', count(*)::int,
         'units', count(distinct nullif(trim(unit), ''))::int)
       from hargi_ht2.gangguan_trafo
       where (unit = any(${selUnits}) or ${selUnits.length === 0})) as ggn,
      (select coalesce(jsonb_agg(x order by x.tahun), '[]'::jsonb) from (
         select trim(tahun) as tahun, count(*)::int as total
         from hargi_ht2.gangguan_trafo
         where coalesce(trim(tahun), '') <> ''
           and (unit = any(${selUnits}) or ${selUnits.length === 0})
         group by 1) x) as ggn_years,
      (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
         select trim(tahun) as tahun, trim(bulan) as bulan, count(*)::int as total
         from hargi_ht2.gangguan_trafo
         where coalesce(trim(tahun), '') <> '' and coalesce(trim(bulan), '') <> ''
           and (unit = any(${selUnits}) or ${selUnits.length === 0})
         group by 1, 2) x) as ggn_months,
      (select coalesce(jsonb_agg(x order by x.total desc), '[]'::jsonb) from (
         select gardu,
                coalesce(max(nullif(trim(unit), '')), 'Tanpa Unit') as unit,
                avg(nullif(latitude, '')::float) as lat,
                avg(nullif(longitude, '')::float) as lng,
                count(*)::int as total,
                count(*) filter (
                  where trim(tahun) = extract(year from now() at time zone 'Asia/Jakarta')::int::text
                )::int as total_year,
                count(*) filter (
                  where trim(tahun) = extract(year from now() at time zone 'Asia/Jakarta')::int::text
                    -- bulan di sheet pakai English ("June"); terima Indonesia juga biar tahan drift
                    and upper(trim(bulan)) in (
                      (array['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE',
                        'JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'])
                        [extract(month from now() at time zone 'Asia/Jakarta')::int],
                      (array['JANUARI','FEBRUARI','MARET','APRIL','MEI','JUNI',
                        'JULI','AGUSTUS','SEPTEMBER','OKTOBER','NOVEMBER','DESEMBER'])
                        [extract(month from now() at time zone 'Asia/Jakarta')::int]
                    )
                )::int as total_month
         from hargi_ht2.gangguan_trafo
         where latitude ~ '^-?[0-9]+(\.[0-9]+)?$'
           and longitude ~ '^-?[0-9]+(\.[0-9]+)?$'
           and coalesce(trim(gardu), '') <> ''
           and (unit = any(${selUnits}) or ${selUnits.length === 0})
         group by gardu) x) as gis,
      (select jsonb_build_object(
         'total', count(distinct upper(trim(gardu)))::int,
         'year', count(distinct upper(trim(gardu))) filter (
           where trim(tahun) = extract(year from now() at time zone 'Asia/Jakarta')::int::text
         )::int,
         'month', count(distinct upper(trim(gardu))) filter (
           where trim(tahun) = extract(year from now() at time zone 'Asia/Jakarta')::int::text
             and upper(trim(bulan)) in (
               (array['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE',
                 'JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'])
                 [extract(month from now() at time zone 'Asia/Jakarta')::int],
               (array['JANUARI','FEBRUARI','MARET','APRIL','MEI','JUNI',
                 'JULI','AGUSTUS','SEPTEMBER','OKTOBER','NOVEMBER','DESEMBER'])
                 [extract(month from now() at time zone 'Asia/Jakarta')::int]
             )
         )::int
       ) from hargi_ht2.gangguan_trafo
       where coalesce(trim(gardu), '') <> ''
         and (unit = any(${selUnits}) or ${selUnits.length === 0})) as gi,
      (select jsonb_build_object(
         'total', count(distinct trim(regexp_replace(nama_bay, '\s+\d+.*$', '')))::int,
         'year', count(distinct trim(regexp_replace(nama_bay, '\s+\d+.*$', ''))) filter (
           where trim(tahun) = extract(year from now() at time zone 'Asia/Jakarta')::int::text
         )::int,
         'month', count(distinct trim(regexp_replace(nama_bay, '\s+\d+.*$', ''))) filter (
           where trim(tahun) = extract(year from now() at time zone 'Asia/Jakarta')::int::text
             and upper(trim(bulan)) in (
               (array['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE',
                 'JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'])
                 [extract(month from now() at time zone 'Asia/Jakarta')::int],
               (array['JANUARI','FEBRUARI','MARET','APRIL','MEI','JUNI',
                 'JULI','AGUSTUS','SEPTEMBER','OKTOBER','NOVEMBER','DESEMBER'])
                 [extract(month from now() at time zone 'Asia/Jakarta')::int]
             )
         )::int
       ) from hargi_ht2.gangguan_trafo
       where coalesce(trim(nama_bay), '') <> ''
         and (unit = any(${selUnits}) or ${selUnits.length === 0})) as trafo,
      (select to_jsonb(g) from (
         select gt.gardu, gt.nama_bay, gt.tgl_keluar, gt.unit,
                -- ULTG gak ada di sheet gangguan — lookup dari tabel CE (nama GI identik)
                (select ce2.ultg from hargi_ht2.ce_abo_findings ce2
                 where upper(trim(ce2.gardu_induk)) = upper(trim(gt.gardu))
                   and coalesce(trim(ce2.ultg), '') <> ''
                 limit 1) as ultg
         from hargi_ht2.gangguan_trafo gt
         where gt.tgl_keluar ~ '^[0-9]{1,2}-[A-Za-z]{3}-[0-9]{2}$'
           and (gt.unit = any(${selUnits}) or ${selUnits.length === 0})
         order by to_date(trim(gt.tgl_keluar), 'DD-Mon-YY') desc
         limit 1) g) as last_ggn,
      (select to_jsonb(m) from (
         select sheet_name_ce, sheet_name_pareto,
                to_char(sheet_modified_ce at time zone 'Asia/Jakarta', 'DD Mon YYYY') as mod_ce,
                to_char(sheet_modified_pareto at time zone 'Asia/Jakarta', 'DD Mon YYYY') as mod_pareto,
                to_char(finished_at at time zone 'Asia/Jakarta', 'DD Mon YYYY · HH24:MI') as synced_at
         from hargi_ht2.refresh_log
         where status = 'success' and finished_at is not null
         order by id desc limit 1) m) as meta,
      (select coalesce(jsonb_agg(distinct unit), '[]'::jsonb) 
       from hargi_ht2.gangguan_trafo 
       where coalesce(trim(unit), '') <> '' and unit <> '#N/A') as all_units
  `) as unknown as [{
    ce: CeSummaryRow;
    abo: { total: number; closed: number; open: number };
    ggn: { total: number; units: number };
    ggn_years: YearCount[];
    ggn_months: MonthCount[];
    gis: GiSlim[];
    gi: { total: number; year: number; month: number };
    trafo: { total: number; year: number; month: number };
    last_ggn: LastGgn | null;
    meta: MetaRow | null;
    all_units: string[];
  }];
  const { ce, abo, ggn, ggn_years: ggnYears, gis, gi, trafo, meta, all_units } = row;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        subtitle="Portal Ringkasan Data Hartrans 2 · UIT Jawa Bagian Tengah"
      />
      <OverviewView
        ce={ce}
        abo={abo}
        ggn={ggn}
        ggnYears={ggnYears}
        ggnMonths={row.ggn_months}
        gis={gis}
        gi={gi}
        trafo={trafo}
        lastGgn={row.last_ggn ?? null}
        meta={meta ?? null}
        units={all_units}
        selectedUnits={selUnits}
      />
    </div>
  );
}

