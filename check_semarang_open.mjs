import postgres from "./app/node_modules/postgres/src/index.js";

const sql = postgres('postgresql://ht2_diagus.mjgekmjnsipthcswazid:fNgzSz81Rdg~41F-BUsIyybk31waOGpz@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres', {
  ssl: 'require'
});

async function run() {
  try {
    const semarang = await sql`SELECT kondisi_fisik, level_minyak, hasil_thermovisi, hasil_uji_tandel FROM hargi_ht2.asesment_bushing WHERE nama_upt = 'UPT SEMARANG'`;
    
    let critical = 0;
    let poor = 0;
    let open = 0;
    let total = semarang.length;

    for (const r of semarang) {
      let score = 2;
      const tadelVal = (r.hasil_uji_tandel || "").trim().toUpperCase();
      const lvl = (r.level_minyak || "").trim().toUpperCase();
      const thermo = (r.hasil_thermovisi || "").trim().toUpperCase();
      const fisik = (r.kondisi_fisik || "").trim().toUpperCase();
      
      if (tadelVal === "VERY GOOD") score = 1;
      if (lvl === "MEDIUM") score = Math.max(score, 3);
      if (lvl === "LOW") score = Math.max(score, 4);
      if (fisik === "REMBES") score = Math.max(score, 3);
      if (thermo === "HOTSPOT") score = Math.max(score, 4);
      if (tadelVal === "FAIR") score = Math.max(score, 3);
      if (tadelVal === "POOR") score = Math.max(score, 4);
      if (tadelVal === "CRITICAL") score = Math.max(score, 5);
      
      if (score >= 3) {
        open++;
      }
    }
    
    console.log({ total, open });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
