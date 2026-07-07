import Papa from "./app/node_modules/papaparse/papaparse.js";

async function run() {
  const ABO_ID = "11HQFitHH8xISZvVxuG0rd0q84Y6tOtCi7jO7wDbUeVs";
  const ABO_GID = "1761063736";
  const res = await fetch(`https://docs.google.com/spreadsheets/d/${ABO_ID}/export?format=csv&gid=${ABO_GID}&t=${Date.now()}`);
  const text = await res.text();
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
  
  const counts = {};
  for (const row of parsed.data) {
    const upt = (row["UPT"] || "").toUpperCase();
    const anomali = (row["JENIS ANOMALI"] || "").trim();
    if (upt.includes("SEMARANG")) {
        counts[anomali] = (counts[anomali] || 0) + 1;
    }
  }
  console.log("Anomalies for UPT Semarang in GID 1761063736:");
  console.log(counts);
}
run().catch(console.error);
