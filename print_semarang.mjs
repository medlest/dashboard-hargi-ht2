import Papa from "./app/node_modules/papaparse/papaparse.js";

async function run() {
  const ABO_ID = "11HQFitHH8xISZvVxuG0rd0q84Y6tOtCi7jO7wDbUeVs";
  const ABO_GID = "1761063736";
  const res = await fetch(`https://docs.google.com/spreadsheets/d/${ABO_ID}/export?format=csv&gid=${ABO_GID}&t=${Date.now()}`);
  const text = await res.text();
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
  
  let i = 2; // header is row 1
  for (const row of parsed.data) {
    const upt = (row["UPT"] || "").toUpperCase();
    if (upt.includes("SEMARANG")) {
        console.log(`Row ${i}: UPT=${row["UPT"]}, Anomali=${row["JENIS ANOMALI"]}, Gardu=${row["GARDU INDUK"]}, Realisasi=${row["REALISASI"]}, StatusFix=${row["Status FIX"]}`);
    }
    i++;
  }
}
run().catch(console.error);
