// app/dashboard/layout.tsx
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DashboardSidebar } from "@/components/dashboard/sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const isDevelopment = process.env.NODE_ENV === "development";
  if (!session?.user && !isDevelopment) {
    redirect("/login");
  }

  const user = session?.user;

  return (
    <div className="h-screen overflow-hidden bg-[#09090b] text-white lg:flex">
      <DashboardSidebar
        user={{
          name: user?.name ?? (isDevelopment ? "Developer" : null),
          email: user?.email ?? (isDevelopment ? "Local development" : null),
          image: user?.image ?? null,
        }}
      />
      <main className="min-w-0 flex-1 lg:ml-[184px]">
        <div className="h-screen overflow-y-auto">{children}</div>
      </main>
    </div>
  );
}
