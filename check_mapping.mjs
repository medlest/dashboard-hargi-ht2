import Papa from "./app/node_modules/papaparse/papaparse.js";

async function run() {
  const ABO_ID = "11HQFitHH8xISZvVxuG0rd0q84Y6tOtCi7jO7wDbUeVs";
  const ABO_GID = "1761063736";
  const res = await fetch(`https://docs.google.com/spreadsheets/d/${ABO_ID}/export?format=csv&gid=${ABO_GID}&t=${Date.now()}`);
  const text = await res.text();
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
  
  const headers = Object.keys(parsed.data[0]);
  console.log("Headers:", headers);
  
  const anomaliCol = headers.find((h) => {
    const low = h.toLowerCase();
    return low.includes("jenis") && low.includes("anomali");
  });
  console.log("Mapped Jenis Anomali column:", anomaliCol);
}
run().catch(console.error);
