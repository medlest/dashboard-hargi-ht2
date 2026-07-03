import Papa from "./app/node_modules/papaparse/papaparse.js";

async function run() {
  const res = await fetch("https://docs.google.com/spreadsheets/d/1_bBncuTGo8s687UOP9XuU1ObhmTxDlPFXZzwVqYBs3M/export?format=csv&gid=0");
  const text = await res.text();
  const parsed = Papa.parse(text, { header: false, skipEmptyLines: true });
  
  const headers = parsed.data[0];
  
  const semarangRows = parsed.data.filter(r => r[1] && r[1].trim() === "UPT SEMARANG");
  let emptyCount = 0;
  let filledCount = 0;

  for (const r of semarangRows) {
      if (!r[14] && !r[15] && !r[16] && !r[17] && !r[18]) {
          emptyCount++;
      } else {
          filledCount++;
      }
  }

  console.log(`Total UPT Semarang rows: ${semarangRows.length}`);
  console.log(`Rows with empty values: ${emptyCount}`);
  console.log(`Rows with some filled values: ${filledCount}`);
}

run();
