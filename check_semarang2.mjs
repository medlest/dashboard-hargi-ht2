import postgres from "./app/node_modules/postgres/src/index.js";
import Papa from "./app/node_modules/papaparse/papaparse.js";

async function run() {
  const ABO_ID = "11HQFitHH8xISZvVxuG0rd0q84Y6tOtCi7jO7wDbUeVs";
  const ABO_GID = "1761063736";
  const res = await fetch(`https://docs.google.com/spreadsheets/d/${ABO_ID}/export?format=csv&gid=${ABO_GID}&t=${Date.now()}`);
  const text = await res.text();
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
  
  const anomalies = new Set();
  const rawHeaders = Object.keys(parsed.data[0]);
  
  for (const row of parsed.data) {
    const upt = (row["UPT"] || "").toUpperCase();
    if (upt.includes("SEMARANG")) {
        const anomali = row["Jenis Anomali"] || row["jenis anomali"] || row[rawHeaders[7]]; // trying to guess which column it is
        anomalies.add(anomali);
    }
  }
  console.log(`Sheet anomalies for UPT Semarang:`, Array.from(anomalies));
}
run().catch(console.error);
