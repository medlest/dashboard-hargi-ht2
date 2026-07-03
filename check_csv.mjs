import Papa from "./app/node_modules/papaparse/papaparse.js";

async function run() {
  const res = await fetch("https://docs.google.com/spreadsheets/d/1_bBncuTGo8s687UOP9XuU1ObhmTxDlPFXZzwVqYBs3M/export?format=csv&gid=0");
  const text = await res.text();
  const parsed = Papa.parse(text, { header: false, skipEmptyLines: true });
  
  const headers = parsed.data[0];
  console.log("Headers:");
  headers.forEach((h, i) => console.log(`${i}: ${h}`));
  
  const semarangRow = parsed.data.find(r => r[1] && r[1].trim() === "UPT SEMARANG");
  if(semarangRow) {
      console.log("\nFirst UPT Semarang row:");
      semarangRow.forEach((val, i) => console.log(`${i} (${headers[i]}): ${val}`));
  } else {
      console.log("No UPT Semarang row found in CSV");
  }
}

run();
