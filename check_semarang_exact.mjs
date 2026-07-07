import Papa from "./app/node_modules/papaparse/papaparse.js";

async function run() {
  const ABO_ID = "11HQFitHH8xISZvVxuG0rd0q84Y6tOtCi7jO7wDbUeVs";
  const ABO_GID = "1761063736"; // OLD SHEET
  const res = await fetch(`https://docs.google.com/spreadsheets/d/${ABO_ID}/export?format=csv&gid=${ABO_GID}&t=${Date.now()}`);
  const text = await res.text();
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
  
  let count = 0;
  for (const row of parsed.data) {
    const upt = (row["UPT"] || "").toUpperCase();
    const anomali = (row["JENIS ANOMALI"] || "").toUpperCase();
    
    if (upt.includes("SEMARANG") && anomali.includes("TS - REVIEW & TINDAKLANJUT LA")) {
        count++;
    }
  }
  console.log(`CORRECTED Sheet count for UPT Semarang & TS - Review & Tindaklanjut LA is: ${count}`);
}
run().catch(console.error);
