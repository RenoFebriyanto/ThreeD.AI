// lib/api-auth.ts
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface AuthContext {
  userId: string;
  via: "session" | "apiKey";
}

/**
 * Resolves the caller from either the NextAuth session (dashboard) or an
 * `Authorization: Bearer sk_live_…` header (external integrations).
 * Returns null when neither is valid.
 */
export async function authenticate(req: NextRequest): Promise<AuthContext | null> {
  const session = await auth();
  if (session?.user?.id) {
    return { userId: session.user.id, via: "session" };
  }

  const header = req.headers.get("authorization");
  if (!header || !header.toLowerCase().startsWith("bearer ")) return null;

  const key = header.slice(7).trim();
  if (!key) return null;

  const record = await prisma.apiKey.findUnique({
    where: { key },
    select: { id: true, userId: true, isActive: true },
  });

  if (!record?.isActive) return null;

  // Usage tracking is best-effort: a failed counter update must not reject a
  // request that is otherwise authorized.
  await prisma.apiKey
    .update({
      where: { id: record.id },
      data: { lastUsed: new Date(), usageCount: { increment: 1 } },
    })
    .catch(() => undefined);

  return { userId: record.userId, via: "apiKey" };
}
