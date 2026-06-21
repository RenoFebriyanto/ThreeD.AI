// app/dashboard/page.tsx
import { GenerateForm } from "@/components/dashboard/generate-form";

export default function DashboardPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight mb-1">Generate Asset</h1>
        <p className="text-sm text-white/40">
          Pilih tipe aset, isi konsepnya, dan dapatkan prompt, keyword, serta metadata siap upload ke Adobe Stock.
        </p>
      </div>
      <GenerateForm />
    </div>
  );
}
