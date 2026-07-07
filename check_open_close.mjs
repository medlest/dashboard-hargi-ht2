import Papa from "./app/node_modules/papaparse/papaparse.js";

async function run() {
  const ABO_ID = "11HQFitHH8xISZvVxuG0rd0q84Y6tOtCi7jO7wDbUeVs";
  const ABO_GID = "2012059016";
  const res = await fetch(`https://docs.google.com/spreadsheets/d/${ABO_ID}/export?format=csv&gid=${ABO_GID}&t=${Date.now()}`);
  const text = await res.text();
  const parsed = Papa.parse(text, { header: false, skipEmptyLines: true });
  
  const headers = parsed.data[1];
  console.log("Headers:", headers);
  
  // Find a row that has 'CLOSE' or 'OPEN' anywhere
  for (let i = 2; i < 20; i++) {
    const row = parsed.data[i];
    if (!row) continue;
    const hasStatus = row.some(v => String(v).toUpperCase() === 'OPEN' || String(v).toUpperCase() === 'CLOSE');
    if (hasStatus) {
      console.log(`Row ${i}:`);
      row.forEach((v, idx) => {
        if (String(v).toUpperCase() === 'OPEN' || String(v).toUpperCase() === 'CLOSE') {
          console.log(`  Col ${idx} (${headers[idx]}): ${v}`);
        }
      });
    }
  }
}
run();
