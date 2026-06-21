// app/dashboard/layout.tsx
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DashboardSidebar } from "@/components/dashboard/sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white lg:flex">
      <DashboardSidebar
        user={{
          name: session.user.name ?? null,
          email: session.user.email ?? null,
          image: session.user.image ?? null,
        }}
      />
      <main className="flex-1 lg:pl-64">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-10 py-8 lg:py-12">{children}</div>
      </main>
    </div>
  );
}
