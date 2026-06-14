// Warna semantic kondisi — bahasa visual yang sama dengan dashboard lama,
// dipahami tim lapangan. JANGAN diubah maknanya.
export const CONDITION_COLORS: Record<string, string> = {
  "5-Critical": "#b91c1c",
  "4-Poor": "#f87171",
  "3-Fair": "#fbbf24",
  "2-Good": "#10b981",
  "1-Very Good": "#3b82f6",
  "N/A": "#475569",
};

export function conditionColor(label: string): string {
  const l = String(label).toLowerCase();
  const key = Object.keys(CONDITION_COLORS).find((k) => {
    const lowK = k.toLowerCase();
    return l.includes(lowK) || lowK.includes(l);
  }) ?? "N/A";
  return CONDITION_COLORS[key];
}

// Sort kondisi 5-Critical dulu → 1-Very Good (konsisten dengan baseline)
export function sortConditions(values: string[]): string[] {
  const order: Record<string, number> = {
    "critical": 5, "poor": 4, "fair": 3, "good": 2, "very good": 1
  };
  return [...new Set(values)].sort((a, b) => {
    const la = String(a).toLowerCase();
    const lb = String(b).toLowerCase();
    
    const av = order[Object.keys(order).find(k => la.includes(k)) ?? ""] 
               || parseInt(la.split("-")[0]) || 0;
    const bv = order[Object.keys(order).find(k => lb.includes(k)) ?? ""] 
               || parseInt(lb.split("-")[0]) || 0;
               
    return bv - av;
  });
}

export const PALETTE = [
  "#3b82f6", "#ef4444", "#f59e0b", "#10b981", "#8b5cf6",
  "#f97316", "#06b6d4", "#ec4899", "#64748b", "#d946ef",
  "#a855f7", "#14b8a6", "#facc15", "#fb7185", "#94a3b8",
];

// Assignment warna kategori deterministik: 'ALAT' selalu pertama, sisanya alfabetis
export function buildCategoryColors(categories: string[]): Map<string, string> {
  const map = new Map<string, string>();
  const sorted = [...categories].sort((a, b) => {
    const au = (a || "").trim().toUpperCase();
    const bu = (b || "").trim().toUpperCase();
    if (au === "ALAT") return -1;
    if (bu === "ALAT") return 1;
    return au.localeCompare(bu);
  });
  sorted.forEach((cat, i) => {
    const c = (cat || "").trim();
    if (c) map.set(c, PALETTE[i % PALETTE.length]);
  });
  return map;
}
