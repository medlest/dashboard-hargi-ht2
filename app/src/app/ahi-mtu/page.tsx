import { PageHeader } from "@/components/page-header";

export default function AhiMtuPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Asset Healthy Index MTU"
        subtitle="Monitoring kesehatan aset MTU · UIT Jawa Bagian Tengah"
      />
      
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border border-dashed border-edge bg-surface-2 p-12 text-center">
        <div className="mb-4 rounded-full bg-accent-soft p-4 text-accent">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-8 w-8"
          >
            <path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h7" />
            <path d="M16 5V3" />
            <path d="M8 5V3" />
            <path d="M3 9h18" />
            <path d="m16 19 2 2 4-4" />
          </svg>
        </div>
        <h3 className="text-lg font-bold">Halaman Dalam Pengembangan</h3>
        <p className="mx-auto max-w-sm text-sm text-ink-3">
          Halaman Asset Healthy Index MTU sedang disiapkan. Data akan segera tersedia setelah proses integrasi selesai.
        </p>
      </div>
    </div>
  );
}
