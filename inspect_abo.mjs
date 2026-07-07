import Papa from "./app/node_modules/papaparse/papaparse.js";

async function run() {
  const ABO_ID = "11HQFitHH8xISZvVxuG0rd0q84Y6tOtCi7jO7wDbUeVs";
  const ABO_GID = "2012059016";
  const res = await fetch(`https://docs.google.com/spreadsheets/d/${ABO_ID}/export?format=csv&gid=${ABO_GID}&t=${Date.now()}`);
  const text = await res.text();
  const parsed = Papa.parse(text, { header: false, skipEmptyLines: true });
  console.log("Row 0:", parsed.data[0]);
  console.log("Row 1:", parsed.data[1]);
  console.log("Row 2:", parsed.data[2]);
  console.log("Row 3:", parsed.data[3]);
  console.log("Row 4:", parsed.data[4]);
}

run();
