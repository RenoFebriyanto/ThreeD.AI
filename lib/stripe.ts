// lib/stripe.ts
import Stripe from "stripe";
import { Plan } from "@/types";

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("STRIPE_SECRET_KEY is not set — billing features will not work.");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_test_placeholder", {
  typescript: true,
});

export type BillingCycle = "monthly" | "yearly";

/** Maps a paid plan + billing cycle to its Stripe Price ID from env vars. */
export function getPriceId(plan: Exclude<Plan, "FREE" | "ENTERPRISE">, cycle: BillingCycle): string | null {
  const map: Record<string, string | undefined> = {
    "STARTER:monthly": process.env.STRIPE_STARTER_MONTHLY,
    "STARTER:yearly": process.env.STRIPE_STARTER_YEARLY,
    "PRO:monthly": process.env.STRIPE_PRO_MONTHLY,
    "PRO:yearly": process.env.STRIPE_PRO_YEARLY,
  };
  return map[`${plan}:${cycle}`] ?? null;
}

