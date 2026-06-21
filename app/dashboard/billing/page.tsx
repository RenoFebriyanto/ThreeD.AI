// app/dashboard/billing/page.tsx
import { BillingPanel } from "@/components/dashboard/billing-panel";

export default function BillingPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight mb-1">Billing & Langganan</h1>
        <p className="text-sm text-white/40">
          Kelola plan, lihat sisa generate, dan urus metode pembayaran kamu di sini.
        </p>
      </div>
      <BillingPanel />
    </div>
  );
}
