// app/api/user/credits/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      plan: true,
      creditsUsed: true,
      creditsLimit: true,
      subscriptionEnd: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    plan: user.plan,
    creditsUsed: user.creditsUsed,
    creditsLimit: user.creditsLimit,
    creditsRemaining: Math.max(user.creditsLimit - user.creditsUsed, 0),
    subscriptionEnd: user.subscriptionEnd,
  });
}
