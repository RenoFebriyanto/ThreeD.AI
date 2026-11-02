// app/api/generate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { claimCredit, refundCredit } from "@/lib/credits";
import { toErrorMessage, aiErrorInfo } from "@/lib/ai/errors";
import { generateVector, generateImage, generateVideo, generateBatch } from "@/lib/ai";
import { AssetKind, GenerationInput, GenerationOutput } from "@/types";
import { z } from "zod";
import { Prisma } from "@prisma/client";

const generateSchema = z.object({
  kind: z.enum(["vector", "photo", "video", "batch"]),
  input: z.record(z.unknown()),
});

const GENERATORS: Record<AssetKind, (input: GenerationInput) => Promise<GenerationOutput>> = {
  vector: generateVector,
  photo: generateImage,
  video: generateVideo,
  batch: generateBatch,
};

export async function POST(req: NextRequest) {
  const caller = await authenticate(req);
  if (!caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const { kind, input } = parsed.data;
  const userId = caller.userId;

  // Atomically check-and-increment credits so concurrent requests from the
  // same user can't both pass the check before either write lands.
  const claim = await claimCredit(userId);

  if (claim === "not_found") {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (claim === "limit") {
    return NextResponse.json(
      { error: "Credit limit reached for your plan. Upgrade to continue generating." },
      { status: 403 }
    );
  }

  try {
    const generator = GENERATORS[kind];
    const output = await generator(input as GenerationInput);

    const generation = await prisma.generation.create({
      data: {
        userId,
        type: kind,
        input: input as Prisma.InputJsonValue,
        output: output as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({ generation }, { status: 201 });
  } catch (err) {
    // Refund the credit since generation failed after it was claimed.
    await refundCredit(userId);

    const info = aiErrorInfo(err);
    return NextResponse.json(
      { error: toErrorMessage(err, "Generation failed. Please try again."), kind: info.kind },
      { status: 502 }
    );
  }
}

export async function GET(req: NextRequest) {
  const caller = await authenticate(req);
  if (!caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const typeParam = searchParams.get("type");
  const page = Math.max(Number(searchParams.get("page")) || 1, 1);
  const pageSize = Math.min(Math.max(Number(searchParams.get("pageSize")) || 20, 1), 50);

  const VALID_TYPES = ["vector", "photo", "video", "batch"] as const;
  if (typeParam && !VALID_TYPES.includes(typeParam as (typeof VALID_TYPES)[number])) {
    return NextResponse.json({ error: `Invalid type. Must be one of: ${VALID_TYPES.join(", ")}` }, { status: 400 });
  }

  const where = {
    userId: caller.userId,
    ...(typeParam ? { type: typeParam as (typeof VALID_TYPES)[number] } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.generation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.generation.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, pageSize });
}
