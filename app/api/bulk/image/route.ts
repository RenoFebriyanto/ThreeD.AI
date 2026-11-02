// app/api/bulk/image/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { claimCredit, refundCredit } from "@/lib/credits";
import { generateAssetImage } from "@/lib/ai";
import { aiErrorInfo } from "@/lib/ai/errors";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 menit — Pollinations cold-start bisa ~90s × 3 attempts

const schema = z.object({
  prompt: z.string().trim().min(5).max(2000),
  kind: z.enum(["vector", "photo"]),
  title: z.string().trim().max(200).optional(),
  keywords: z.array(z.string()).max(49).optional(),
  category: z.string().trim().max(100).optional(),
  aspectRatio: z.enum(["1:1", "4:3", "3:2", "16:9", "3:4", "2:3", "9:16"]).default("1:1"),
  resolution: z.union([
    z.literal(512),
    z.literal(768),
    z.literal(1024),
    z.literal(1536),
    z.literal(2048),
  ]).default(1024),
  referenceGuidance: z.string().trim().max(1000).optional(),
});

/**
 * Renders one image and returns it as base64.
 *
 * One credit per image: claimed before the model call and refunded if the
 * render fails, so a timeout or safety block never costs the user anything.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Input tidak valid", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { prompt, kind, title, keywords, category, aspectRatio, resolution, referenceGuidance } = parsed.data;

  const claim = await claimCredit(userId);
  if (claim === "not_found") {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (claim === "limit") {
    return NextResponse.json(
      { error: "Kredit habis. Upgrade plan untuk render gambar lagi.", kind: "credits" },
      { status: 403 }
    );
  }

  try {
    const image = await generateAssetImage({
      prompt,
      kind,
      aspectRatio,
      resolution,
      referenceGuidance,
    });

    // Log metadata only — the image bytes never go into Postgres, they go
    // straight to the browser. A logging failure must not discard a render
    // the user already paid for.
    try {
      await prisma.generation.create({
        data: {
          userId,
          type: kind,
          input: {
            prompt,
            kind,
            mode: "bulk",
            aspectRatio,
            resolution,
            hasReference: Boolean(referenceGuidance),
          },
          output: {
            title: title ?? null,
            keywords: keywords ?? [],
            category: category ?? null,
            mime: image.mime,
            bytes: Math.round((image.base64.length * 3) / 4),
          },
        },
      });
    } catch {
      // ignore — history is best-effort
    }

    return NextResponse.json({ mime: image.mime, data: image.base64 });
  } catch (err) {
    await refundCredit(userId);

    // `kind` lets the client tell a permanent failure (quota/auth) from a
    // one-off glitch, so it can stop the whole queue instead of burning
    // requests on 9 more images that cannot succeed.
    const info = aiErrorInfo(err);
    return NextResponse.json({ error: info.message, kind: info.kind }, { status: 502 });
  }
}
