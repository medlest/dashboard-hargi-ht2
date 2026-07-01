const Papa = require("papaparse");

const clean = (v) => String(v ?? "").replace(/\xa0/g, " ").trim();

async function run() {
  console.log("Fetching Asesment Bushing data...");
  const res = await fetch("https://docs.google.com/spreadsheets/d/1_bBncuTGo8s687UOP9XuU1ObhmTxDlPFXZzwVqYBs3M/export?format=csv&gid=0");
  const text = await res.text();
  
  const parsed = Papa.parse(text, { header: false, skipEmptyLines: true });
  const rows = parsed.data;
  
  if (rows.length <= 2) {
    console.log("No data found.");
    return;
  }
  
  console.log("Headers:");
  console.log(rows[0]);
  console.log(rows[1]);

  let hotspotCount = 0;
  rows.forEach((r, i) => {
    if (r.some(val => clean(val).toUpperCase().includes("HOTSPOT") || clean(val).toUpperCase().includes("HOT SPOT"))) {
      console.log(`Found hotspot at row ${i + 1}:`, r);
      hotspotCount++;
    }
  });

  console.log("Total hotspots found in sheet:", hotspotCount);
}

run().catch(console.error);
