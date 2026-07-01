const Papa = require("papaparse");

async function run() {
  const url = `https://docs.google.com/spreadsheets/d/1_bBncuTGo8s687UOP9XuU1ObhmTxDlPFXZzwVqYBs3M/gviz/tq?tqx=out:csv&gid=0&tq=select%20*`;
  const res = await fetch(url);
  const text = await res.text();
  
  const parsed = Papa.parse(text, { header: false, skipEmptyLines: true });
  const rows = parsed.data;
  
  let hotspotCount = 0;
  rows.forEach((r, i) => {
    if (r.some(val => String(val ?? "").toUpperCase().includes("HOTSPOT") || String(val ?? "").toUpperCase().includes("HOT SPOT"))) {
      console.log(`Found hotspot at row ${i} in GVIZ:`, r);
      hotspotCount++;
    }
  });
  console.log("Total hotspots found in GVIZ:", hotspotCount);
}
run();
