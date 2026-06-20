// src/app/api/user/api-keys/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateApiKey } from "@/lib/utils";
import { z } from "zod";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const keys = await prisma.apiKey.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, key: true, lastUsed: true, usageCount: true, isActive: true, createdAt: true },
  });

  return NextResponse.json({ keys });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = z.object({ name: z.string().min(1).max(50) }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid name" }, { status: 400 });

  // Check plan limits
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { plan: true, _count: { select: { apiKeys: { where: { isActive: true } } } } },
  });

  const limits: Record<string, number> = { FREE: 0, STARTER: 1, PRO: 5, ENTERPRISE: 999 };
  const limit = limits[user?.plan ?? "FREE"];
  const current = user?._count.apiKeys ?? 0;

  if (current >= limit) {
    return NextResponse.json({ error: "API key limit reached for your plan" }, { status: 403 });
  }

  const key = await prisma.apiKey.create({
    data: { userId: session.user.id, name: parsed.data.name, key: generateApiKey() },
  });

  return NextResponse.json({ key }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await prisma.apiKey.deleteMany({ where: { id, userId: session.user.id } });
  return NextResponse.json({ ok: true });
}