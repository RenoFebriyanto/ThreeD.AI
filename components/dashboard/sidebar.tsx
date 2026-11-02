// components/dashboard/sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { History, KeyRound, CreditCard, Layers, LogOut, Settings, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarUser {
  name: string | null;
  email: string | null;
  image: string | null;
}

interface CreditsState {
  plan: string;
  creditsRemaining: number;
  creditsLimit: number;
}

const NAV_ITEMS = [
  { href: "/dashboard", label: "Bulk Generator", icon: Layers },
  { href: "/dashboard/history", label: "Riwayat", icon: History },
  { href: "/dashboard/api-keys", label: "API Keys", icon: KeyRound },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
];

export function DashboardSidebar({ user }: { user: SidebarUser }) {
  const pathname = usePathname();
  const [credits, setCredits] = useState<CreditsState | null>(null);

  const loadCredits = useCallback(async () => {
    try {
      const res = await fetch("/api/user/credits");
      if (!res.ok) return;
      const data = await res.json();
      setCredits({
        plan: data.plan,
        creditsRemaining: data.creditsRemaining,
        creditsLimit: data.creditsLimit,
      });
    } catch {
      // ignore — the credit bar just stays stale
    }
  }, []);

  useEffect(() => {
    loadCredits();
  }, [loadCredits, pathname]);

  // Bulk generation spends a credit per image; refresh the bar when a batch ends.
  useEffect(() => {
    const handler = () => loadCredits();
    window.addEventListener("credits:refresh", handler);
    return () => window.removeEventListener("credits:refresh", handler);
  }, [loadCredits]);

  const initials = (user.name || user.email || "U").charAt(0).toUpperCase();
  const creditPct = credits ? Math.min((credits.creditsRemaining / Math.max(credits.creditsLimit, 1)) * 100, 100) : 0;

  return (
    <aside className="lg:fixed lg:inset-y-0 lg:left-0 lg:w-[184px] border-b lg:border-b-0 lg:border-r border-white/[0.07] bg-[#0d0d0f] flex lg:flex-col">
      <div className="flex items-center gap-2 px-5 h-16 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-xs font-bold">
          S
        </div>
        <Link href="/" className="font-semibold tracking-tight">
          StockAI
        </Link>
      </div>

      <nav className="flex-1 px-3 py-3 space-y-1 hidden lg:block">
        <button
          type="button"
          className="mb-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] text-sm font-medium text-white/70 hover:bg-white/[0.07]"
        >
          <Plus className="h-4 w-4 text-violet-300" />
          Baru
        </button>
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active
                    ? "bg-white/[0.08] text-white"
                  : "text-white/50 hover:text-white hover:bg-white/[0.04]"
              )}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="hidden lg:block border-t border-white/[0.06] p-4 space-y-4">
        {credits && (
          <div className="px-2">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-white/40">{credits.plan} plan</span>
              <span className="text-white/60 font-medium">
                {credits.creditsRemaining}/{credits.creditsLimit}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all"
                style={{ width: `${creditPct}%` }}
              />
            </div>
            {credits.creditsRemaining === 0 && (
              <Link
                href="/dashboard/billing"
                className="block mt-2 text-xs text-violet-400 hover:text-violet-300 font-medium"
              >
                Upgrade untuk generate lagi →
              </Link>
            )}
          </div>
        )}

        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full bg-white/[0.08] flex items-center justify-center text-xs font-semibold shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{user.name || "Akun"}</p>
            <p className="text-xs text-white/40 truncate">{user.email}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="text-white/30 hover:text-white transition-colors shrink-0"
            aria-label="Keluar"
            title="Keluar"
          >
            <LogOut className="w-4 h-4" />
          </button>
          <Link
            href="/dashboard/api-keys"
            className="shrink-0 text-white/30 transition-colors hover:text-white"
            aria-label="Pengaturan"
            title="Pengaturan"
          >
            <Settings className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </aside>
  );
}
