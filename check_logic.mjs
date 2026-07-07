import Papa from "./app/node_modules/papaparse/papaparse.js";

async function run() {
  const ABO_ID = "11HQFitHH8xISZvVxuG0rd0q84Y6tOtCi7jO7wDbUeVs";
  const ABO_GID = "2012059016";
  const res = await fetch(`https://docs.google.com/spreadsheets/d/${ABO_ID}/export?format=csv&gid=${ABO_GID}&t=${Date.now()}`);
  const text = await res.text();
  const parsed = Papa.parse(text, { header: false, skipEmptyLines: true });
  
  const headers = parsed.data[1];
  const tglRealisasiIdx = headers.findIndex(h => String(h).toUpperCase() === "TANGGAL REALISASI");
  const kondisiAkhirIdx = headers.findIndex(h => String(h).toUpperCase().includes("KONDISI AKHIR"));
  
  let closedCount = 0;
  for (let i = 2; i < parsed.data.length; i++) {
    const row = parsed.data[i];
    const realisasi = row[tglRealisasiIdx] ? String(row[tglRealisasiIdx]).trim() : "";
    const kondisiAkhir = row[kondisiAkhirIdx] ? String(row[kondisiAkhirIdx]).trim() : "";
    if (realisasi !== "" || kondisiAkhir !== "") {
        closedCount++;
    }
  }
  console.log(`Out of ${parsed.data.length - 2} data rows, ${closedCount} would be CLOSED`);
}
run();
