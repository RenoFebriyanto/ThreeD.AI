// components/dashboard/billing-panel.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CreditCard } from "lucide-react";
import { PLANS, Plan, formatIDR } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface CreditsState {
  plan: Plan;
  creditsUsed: number;
  creditsLimit: number;
  creditsRemaining: number;
  subscriptionEnd: string | null;
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(new Date(iso));
}

export function BillingPanel() {
  const router = useRouter();
  const params = useSearchParams();
  const { toast } = useToast();

  const [credits, setCredits] = useState<CreditsState | null>(null);
  const [loadingCredits, setLoadingCredits] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<Plan | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const loadCredits = useCallback(async () => {
    try {
      const res = await fetch("/api/user/credits");
      if (res.ok) setCredits(await res.json());
    } catch {
      // ignore — page is still usable without the summary card
    } finally {
      setLoadingCredits(false);
    }
  }, []);

  useEffect(() => {
    loadCredits();
  }, [loadCredits]);

  // Reflect the result of a Stripe Checkout redirect back to this page.
  useEffect(() => {
    if (params.get("success")) {
      toast({
        title: "Pembayaran berhasil 🎉",
        description: "Plan kamu sedang diupdate, mungkin perlu beberapa detik untuk tersinkron.",
      });
      const t = setTimeout(loadCredits, 2500);
      router.replace("/dashboard/billing");
      return () => clearTimeout(t);
    }
    if (params.get("canceled")) {
      toast({
        title: "Checkout dibatalkan",
        description: "Tidak ada perubahan pada plan kamu. Coba lagi kapan saja.",
      });
      router.replace("/dashboard/billing");
    }
  }, [params, router, toast, loadCredits]);

  async function handleCheckout(planId: Plan) {
    setCheckoutLoading(planId);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId, cycle: "monthly" }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast({
          title: "Gagal memulai checkout",
          description: data.error ?? "Coba lagi.",
          variant: "destructive",
        });
        setCheckoutLoading(null);
        return;
      }

      window.location.href = data.url;
    } catch {
      toast({ title: "Gagal terhubung ke server", variant: "destructive" });
      setCheckoutLoading(null);
    }
  }

  async function handlePortal() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        toast({
          title: "Belum ada akun billing",
          description: data.error ?? "Pilih salah satu plan dulu untuk mulai berlangganan.",
          variant: "destructive",
        });
        setPortalLoading(false);
        return;
      }

      window.location.href = data.url;
    } catch {
      toast({ title: "Gagal terhubung ke server", variant: "destructive" });
      setPortalLoading(false);
    }
  }

  const creditPct = credits
    ? Math.min((credits.creditsRemaining / Math.max(credits.creditsLimit, 1)) * 100, 100)
    : 0;

  return (
    <div className="space-y-8">
      {/* Current plan summary */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="text-xs text-white/40 uppercase tracking-wide mb-1">Plan saat ini</div>
            {loadingCredits ? (
              <div className="h-7 w-24 rounded bg-white/[0.06] animate-pulse" />
            ) : (
              <div className="text-xl font-bold">
                {PLANS.find((p) => p.id === credits?.plan)?.name ?? "Free"}
              </div>
            )}
          </div>
          <button
            onClick={handlePortal}
            disabled={portalLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
            {credits?.plan === "FREE" ? "Riwayat pembayaran" : "Kelola pembayaran"}
          </button>
        </div>

        {!loadingCredits && credits && (
          <div className="mt-6">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-white/40">Sisa generate</span>
              <span className="text-white/70 font-medium">
                {credits.creditsRemaining}/{credits.creditsLimit}
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all"
                style={{ width: `${creditPct}%` }}
              />
            </div>
            <p className="text-xs text-white/30 mt-3">
              {credits.plan === "FREE"
                ? "Generate gratis di-reset tiap bulan."
                : credits.subscriptionEnd
                ? `Diperpanjang otomatis pada ${formatDate(credits.subscriptionEnd)}.`
                : "Langganan aktif."}
            </p>
          </div>
        )}
      </div>

      {/* Plan cards */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Pilih plan</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map((plan) => {
            const isCurrent = credits?.plan === plan.id;
            return (
              <div
                key={plan.id}
                className={cn(
                  "p-6 rounded-2xl border relative flex flex-col",
                  plan.id === "PRO" ? "border-violet-500/50 bg-violet-950/30" : "border-white/[0.07] bg-white/[0.02]"
                )}
              >
                {plan.id === "PRO" && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-violet-500 rounded-full text-xs font-semibold">
                    Populer
                  </div>
                )}
                <div className="text-sm text-white/40 mb-1">{plan.name}</div>
                {plan.priceMonthly > 0 ? (
                  <div className="text-2xl font-bold mb-1">
                    {formatIDR(plan.priceMonthly)}
                    <span className="text-sm font-normal text-white/30">/bln</span>
                  </div>
                ) : plan.id === "ENTERPRISE" ? (
                  <div className="text-2xl font-bold mb-1">Custom</div>
                ) : (
                  <div className="text-2xl font-bold mb-1">Gratis</div>
                )}
                <div className="text-xs text-white/30 mb-5">
                  {plan.credits < 999999 ? `${plan.credits} generate/bulan` : "Unlimited generate"}
                </div>
                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="text-sm text-white/60 flex items-start gap-2">
                      <span className="text-violet-400 mt-0.5 shrink-0">✓</span> {f}
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <div className="text-center py-2.5 rounded-lg text-sm font-medium bg-white/[0.05] text-white/40 border border-white/[0.08]">
                    Plan saat ini
                  </div>
                ) : plan.id === "ENTERPRISE" ? (
                  <a
                    href="mailto:hello@stockai.id"
                    className="block text-center py-2.5 rounded-lg text-sm font-medium border border-white/10 hover:bg-white/5 transition-colors"
                  >
                    Hubungi kami
                  </a>
                ) : plan.id === "FREE" ? (
                  <button
                    onClick={handlePortal}
                    disabled={portalLoading}
                    className="w-full py-2.5 rounded-lg text-sm font-medium border border-white/10 hover:bg-white/5 transition-colors disabled:opacity-50"
                  >
                    Batalkan langganan
                  </button>
                ) : (
                  <button
                    onClick={() => handleCheckout(plan.id)}
                    disabled={checkoutLoading !== null}
                    className={cn(
                      "w-full py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed",
                      plan.id === "PRO" ? "bg-violet-500 text-white hover:bg-violet-400" : "border border-white/10 hover:bg-white/5"
                    )}
                  >
                    {checkoutLoading === plan.id && <Loader2 className="w-4 h-4 animate-spin" />}
                    {checkoutLoading === plan.id ? "Memproses..." : `Upgrade ke ${plan.name}`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
