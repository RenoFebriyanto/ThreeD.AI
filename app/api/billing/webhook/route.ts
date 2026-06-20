// src/app/api/billing/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { Plan } from "@/types";
import Stripe from "stripe";

const PRICE_TO_PLAN: Record<string, Plan> = {
  [process.env.STRIPE_STARTER_MONTHLY ?? ""]: "STARTER",
  [process.env.STRIPE_STARTER_YEARLY ?? ""]: "STARTER",
  [process.env.STRIPE_PRO_MONTHLY ?? ""]: "PRO",
  [process.env.STRIPE_PRO_YEARLY ?? ""]: "PRO",
};

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
      const priceId = sub.items.data[0]?.price.id;
      const plan = PRICE_TO_PLAN[priceId] ?? "FREE";
      const customerId = sub.customer as string;

      const user = await prisma.user.findFirst({ where: { stripeCustomerId: customerId } });
      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            plan,
            creditsLimit: PLAN_CREDITS[plan],
            subscriptionId: sub.id,
            subscriptionEnd: new Date(sub.current_period_end * 1000),
          },
        });
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;

      const user = await prisma.user.findFirst({ where: { stripeCustomerId: customerId } });
      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            plan: "FREE",
            creditsLimit: 10,
            subscriptionId: null,
            subscriptionEnd: null,
          },
        });
      }
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;

      const user = await prisma.user.findFirst({ where: { stripeCustomerId: customerId } });
      if (user) {
        // Reset monthly credits on renewal
        await prisma.user.update({
          where: { id: user.id },
          data: { creditsUsed: 0 },
        });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}