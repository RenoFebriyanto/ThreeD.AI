// app/dashboard/page.tsx
import type { Metadata } from "next";
import { BulkGenerator } from "@/components/dashboard/bulk-generator";
import { imageSupportHint, providerSupportsImages } from "@/lib/ai/capabilities";

export const metadata: Metadata = { title: "Bulk Generator" };

export default function DashboardPage() {
  const supportsImages = providerSupportsImages();
  return (
    <div className="h-full">
      <BulkGenerator
        supportsImages={supportsImages}
        imageHint={imageSupportHint()}
      />
    </div>
  );
}
