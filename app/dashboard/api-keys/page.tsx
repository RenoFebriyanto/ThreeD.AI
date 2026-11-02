// app/dashboard/api-keys/page.tsx
import type { Metadata } from "next";
import { ApiKeysPanel } from "@/components/dashboard/api-keys-panel";

export const metadata: Metadata = { title: "API Keys" };

export default function ApiKeysPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight mb-1">API Keys</h1>
        <p className="text-sm text-white/40 max-w-2xl">
          Pakai API key untuk memanggil StockAI dari aplikasi lain. Jangan bagikan key
          ke publik — perlakukan seperti password.
        </p>
      </div>

      <ApiKeysPanel />
    </div>
  );
}
