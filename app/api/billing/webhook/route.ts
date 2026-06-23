// src/app/api/billing/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { Plan } from "@/types";
import Stripe from "stripe";

const PRICE_TO_PLAN: Record<string, Plan> = Object.fromEntries(
  (
    [
      [process.env.STRIPE_STARTER_MONTHLY, "STARTER"],
      [process.env.STRIPE_STARTER_YEARLY, "STARTER"],
      [process.env.STRIPE_PRO_MONTHLY, "PRO"],
      [process.env.STRIPE_PRO_YEARLY, "PRO"],
    ] as Array<[string | undefined, Plan]>
  ).filter((entry): entry is [string, Plan] => Boolean(entry[0]))
);

const PLAN_CREDITS: Record<Plan, number> = {
  FREE: 10,
  STARTER: 100,
  PRO: 500,
  ENTERPRISE: 999999,
};

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "customer.subscription.created":
case "customer.subscription.updated": {
  const sub = event.data.object as Stripe.Subscription;
  const item = sub.items.data[0];
  const priceId = item?.price.id;
  const plan = PRICE_TO_PLAN[priceId ?? ""] ?? "FREE";
  const customerId = sub.customer as string;

  // Stripe memindahkan current_period_end dari level Subscription ke level
  // subscription item (API update "Basil", 2025-03-31). Baca dari item,
  // dengan fallback ke field lama kalau-kalau API version-nya beda.
  const periodEndUnix =
    (item as unknown as { current_period_end?: number })?.current_period_end ??
    (sub as unknown as { current_period_end?: number }).current_period_end;

  const user = await prisma.user.findFirst({ where: { stripeCustomerId: customerId } });
  if (user) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        plan,
        creditsLimit: PLAN_CREDITS[plan],
        subscriptionId: sub.id,
        subscriptionEnd: periodEndUnix ? new Date(periodEndUnix * 1000) : null,
      },
    });
  }
  break;
}
  }

  return NextResponse.json({ received: true });
}