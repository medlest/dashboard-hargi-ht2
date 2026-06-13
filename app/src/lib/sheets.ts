// Sheet sumber milik teman user — referensi ID + link edit DOANG.
// App TIDAK PERNAH fetch Google dari jalur render: semua data dibaca dari
// Supabase (schema hargi_ht2); sync sheet → DB cuma lewat EF hargi-refresh.
// Kalau suatu saat sheet di-private → ganti ke Sheets API pakai SA/OAuth org
// (sheets-bridge-uptbogor), JANGAN akun personal.
export const CE_ABO_SHEET = {
  id: "1-eC0GdeMwYDhnGzCSM8viO0HvD6X0NdlMaWOxe2P9ZM",
  gid: "299154811",
};
export const PARETO_SHEET = {
  id: "1hf_lpXI6x3hBDfEHX8r8q15w6F3wtlzIABGibdpCMhg",
  gid: "1882488493",
};
export const ABO_2026_SHEET = {
  id: "11HQFitHH8xISZvVxuG0rd0q84Y6tOtCi7jO7wDbUeVs",
  gid: "1761063736",
};

export function sheetEditUrl(s: { id: string; gid: string }) {
  return `https://docs.google.com/spreadsheets/d/${s.id}/edit#gid=${s.gid}`;
}
