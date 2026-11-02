// lib/credits.ts
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export type ClaimResult = "ok" | "limit" | "not_found";

/**
 * Atomically checks and consumes one credit.
 *
 * The read + write happen in a single transaction so two concurrent requests
 * from the same user can't both pass the check before either write lands
 * (which would push creditsUsed past creditsLimit).
 */
export async function claimCredit(userId: string): Promise<ClaimResult> {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { creditsUsed: true, creditsLimit: true },
    });

    if (!user) return "not_found" as const;
    if (user.creditsUsed >= user.creditsLimit) return "limit" as const;

    await tx.user.update({
      where: { id: userId },
      data: { creditsUsed: { increment: 1 } },
    });

    return "ok" as const;
  });
}

/**
 * Gives a credit back after a failed generation.
 *
 * Guarded so it can never drive creditsUsed below zero (e.g. a retried request
 * that fails twice would otherwise refund the same credit twice).
 */
export async function refundCredit(userId: string): Promise<void> {
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { creditsUsed: true },
    });

    if (!user || user.creditsUsed <= 0) return;

    await tx.user.update({
      where: { id: userId },
      data: { creditsUsed: { decrement: 1 } },
    });
  });
}

export interface CreditSnapshot {
  plan: string;
  creditsUsed: number;
  creditsLimit: number;
  creditsRemaining: number;
}

export async function getCredits(userId: string): Promise<CreditSnapshot | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, creditsUsed: true, creditsLimit: true },
  });

  if (!user) return null;

  return {
    plan: user.plan,
    creditsUsed: user.creditsUsed,
    creditsLimit: user.creditsLimit,
    creditsRemaining: Math.max(user.creditsLimit - user.creditsUsed, 0),
  };
}
