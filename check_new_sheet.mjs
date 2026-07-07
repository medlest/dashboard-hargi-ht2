import Papa from "./app/node_modules/papaparse/papaparse.js";

async function run() {
  const ABO_ID = "11HQFitHH8xISZvVxuG0rd0q84Y6tOtCi7jO7wDbUeVs";
  const ABO_GID = "2012059016"; // THE NEW SHEET
  const res = await fetch(`https://docs.google.com/spreadsheets/d/${ABO_ID}/export?format=csv&gid=${ABO_GID}&t=${Date.now()}`);
  const text = await res.text();
  const parsed = Papa.parse(text, { header: false, skipEmptyLines: true });
  
  const headers = parsed.data[1];
  const uptIdx = headers.findIndex(h => String(h).toUpperCase() === "UPT");
  const anomaliIdx = headers.findIndex(h => String(h).toUpperCase() === "JENIS ANOMALI");

  let count = 0;
  for (let i = 2; i < parsed.data.length; i++) {
    const row = parsed.data[i];
    const upt = String(row[uptIdx] || "").toUpperCase();
    const anomali = String(row[anomaliIdx] || "").toUpperCase();
    
    if (upt.includes("SEMARANG") && anomali.includes("TS - REVIEW & TINDAKLANJUT LA")) {
        count++;
    }
  }
  console.log(`NEW Sheet (gid=2012059016) count for UPT Semarang & TS - Review & Tindaklanjut LA: ${count}`);
}
run().catch(console.error);
