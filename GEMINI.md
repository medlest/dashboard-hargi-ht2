# Instruksi untuk Gemini CLI

Seluruh aturan main repo ini ada di **[AGENTS.md](./AGENTS.md)** — baca dan
patuhi file itu sepenuhnya sebelum menulis kode apa pun.

Ringkasan tercepat (detail + alasannya tetap di AGENTS.md):

1. Baca `docs/00-INDEX.md` dulu — peta seluruh sistem.
2. Aplikasi Next.js ada di `app/` — `next` dipin EXACT `16.2.4`, JANGAN upgrade.
3. Halaman TIDAK boleh fetch Google/eksternal — semua data dari Supabase.
4. Jangan ubah `app/src/lib/db.ts`, standar chart, dan keputusan di
   `docs/13-KEPUTUSAN-TEKNIS.md` tanpa persetujuan owner.
5. `npx tsc --noEmit` WAJIB hijau sebelum push — push ke `main` langsung
   tayang ke production (auto-deploy Vercel).
6. Jangan pernah commit secret (`.env*` di-gitignore).
