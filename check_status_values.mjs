import Papa from "./app/node_modules/papaparse/papaparse.js";

async function run() {
  const ABO_ID = "11HQFitHH8xISZvVxuG0rd0q84Y6tOtCi7jO7wDbUeVs";
  const ABO_GID = "2012059016";
  const res = await fetch(`https://docs.google.com/spreadsheets/d/${ABO_ID}/export?format=csv&gid=${ABO_GID}&t=${Date.now()}`);
  const text = await res.text();
  const parsed = Papa.parse(text, { header: false, skipEmptyLines: true });
  
  const headers = parsed.data[1];
  
  const kondisiAkhirIdx = headers.findIndex(h => String(h).toUpperCase().includes("KONDISI AKHIR"));
  const ketIdx = headers.findIndex(h => String(h).toUpperCase() === "KET");
  
  const ketValues = new Set();
  const kondisiAkhirValues = new Set();

  for (let i = 2; i < parsed.data.length; i++) {
    const row = parsed.data[i];
    if (ketIdx >= 0) ketValues.add(row[ketIdx]);
    if (kondisiAkhirIdx >= 0) kondisiAkhirValues.add(row[kondisiAkhirIdx]);
  }
  console.log("Unique KET values:", Array.from(ketValues));
  console.log("Unique KONDISI AKHIR values:", Array.from(kondisiAkhirValues));
}
run();
