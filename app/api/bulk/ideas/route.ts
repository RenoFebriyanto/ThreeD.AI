// app/api/bulk/ideas/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateBulkIdeas, supportsImages, imageProviderHint } from "@/lib/ai";
import { aiErrorInfo, toErrorMessage } from "@/lib/ai/errors";
import { describeImageReferences } from "@/lib/ai/gemini-provider";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

const schema = z.object({
  theme: z.string().trim().min(2).max(200),
  kind: z.enum(["vector", "photo"]),
  count: z.number().int().min(1).max(20),
  referenceImages: z.array(z.object({
    mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
    data: z.string().min(1).max(1_000_000),
  })).max(3).optional(),
});

/**
 * Turns one theme into N distinct Adobe Stock ideas (title, render prompt,
 * keywords, category). Costs no credits — only rendering spends credits.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Input tidak valid", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const referenceGuidance = parsed.data.referenceImages?.length
      ? await describeImageReferences(parsed.data.referenceImages)
      : undefined;
    const ideas = await generateBulkIdeas({ ...parsed.data, referenceGuidance });
    return NextResponse.json({ ideas, referenceGuidance, supportsImages, imageHint: imageProviderHint });
  } catch (err) {
    const info = aiErrorInfo(err);
    return NextResponse.json({ error: info.message, kind: info.kind }, { status: 502 });
  }
}
