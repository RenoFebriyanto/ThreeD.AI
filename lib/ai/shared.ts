// lib/ai/shared.ts
import {
  BulkAspectRatio,
  BulkIdea,
  BulkKind,
  BulkResolution,
  GenerationInput,
  GenerationOutput,
} from "@/types";

export type Generator = (input: GenerationInput) => Promise<GenerationOutput>;

export interface ImageAssetInput {
  prompt: string;
  kind: BulkKind;
  aspectRatio?: BulkAspectRatio;
  resolution?: BulkResolution;
  referenceGuidance?: string;
}

export interface ImageAssetResult {
  mime: string;
  base64: string;
}

export interface AiProvider {
  generateVector: Generator;
  generateImage: Generator;
  generateVideo: Generator;
  generateBatch: Generator;
  /**
   * Raw text completion. Used by features that own their JSON schema
   * (the Bulk Generator asks for its own shape).
   */
  complete: (prompt: string, maxTokens?: number) => Promise<string>;
  /**
   * Optional: providers without an image model simply omit this, and the
   * caller reports a helpful error instead of crashing.
   */
  generateAssetImage?: (input: ImageAssetInput) => Promise<ImageAssetResult>;
}

/**
 * Extracts a JSON object/array from a model's text response, tolerating
 * accidental markdown fences or leading/trailing prose the model may add
 * despite instructions to respond with JSON only.
 */
export function extractJson(text: string): string {
  const fenced = text.replace(/```json/gi, "").replace(/```/g, "").trim();

  const objectStart = fenced.indexOf("{");
  const arrayStart = fenced.indexOf("[");
  const starts = [objectStart, arrayStart].filter((index) => index !== -1);
  if (starts.length === 0) return fenced;

  const start = Math.min(...starts);
  const end = fenced.lastIndexOf(fenced[start] === "{" ? "}" : "]");

  if (end === -1 || end < start) return fenced;
  return fenced.slice(start, end + 1);
}

export function parseGenerationOutput(text: string): GenerationOutput {
  const clean = extractJson(text);
  try {
    return JSON.parse(clean) as GenerationOutput;
  } catch {
    throw new Error("AI returned an unparseable response. Please try again.");
  }
}

function normalizeKeywords(value: unknown): string[] {
  const source = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];

  const seen = new Set<string>();
  const keywords: string[] = [];

  for (const entry of source) {
    const keyword = String(entry).trim().replace(/\s+/g, " ").toLowerCase();
    if (!keyword || seen.has(keyword)) continue;
    seen.add(keyword);
    keywords.push(keyword);
    // Adobe Stock accepts at most 49 keywords per asset.
    if (keywords.length === 49) break;
  }

  return keywords;
}

/**
 * Parses the bulk-ideas response. Accepts either a bare array of ideas or an
 * object with an `ideas` array, and drops entries that are missing a title or
 * a render prompt instead of failing the whole batch.
 */
export function parseBulkIdeas(text: string, expected: number): BulkIdea[] {
  const clean = extractJson(text);

  let parsed: unknown;
  try {
    parsed = JSON.parse(clean);
  } catch {
    throw new Error("AI mengembalikan respons yang tidak bisa dibaca. Coba lagi.");
  }

  const raw = Array.isArray(parsed) ? parsed : (parsed as { ideas?: unknown } | null)?.ideas;
  if (!Array.isArray(raw)) {
    throw new Error("AI tidak mengembalikan daftar ide. Coba lagi dengan tema lain.");
  }

  const ideas: BulkIdea[] = [];

  for (const entry of raw) {
    const idea = (entry ?? {}) as Record<string, unknown>;
    const title = String(idea.title ?? "").trim();
    const prompt = String(idea.prompt ?? idea.aiPrompt ?? idea.concept ?? "").trim();

    if (!title || !prompt) continue;

    ideas.push({
      title: title.slice(0, 200),
      prompt: prompt.slice(0, 2000),
      keywords: normalizeKeywords(idea.keywords),
      category: String(idea.category ?? "Miscellaneous").trim() || "Miscellaneous",
    });
  }

  if (ideas.length === 0) {
    throw new Error("AI tidak mengembalikan ide yang valid. Coba lagi.");
  }

  return ideas.slice(0, expected);
}

// ── Shared prompt builders ──────────────────────────────────────
// Both providers ask the exact same questions of the model, so the prompt
// text itself lives here once instead of being duplicated per-provider.

export function buildVectorPrompt(input: GenerationInput): string {
  const { concept = "abstract geometric pattern", style, color, categories = [] } = input;
  return `You are an expert Adobe Stock contributor. Generate a complete asset package for a VECTOR asset.

Asset concept: "${concept}"
Vector style: ${style}
Color palette: ${color}
Adobe Stock categories: ${categories.join(", ") || "general"}

Respond in EXACT JSON only, no markdown:
{"title":"Adobe Stock title max 70 chars","aiPrompt":"Detailed AI image generation prompt for Adobe Firefly, Midjourney, DALL-E. 2-3 sentences.","adobeDescription":"Description for Adobe Stock upload, 2-3 sentences keyword-rich","keywords":["kw1","kw2","kw3","kw4","kw5","kw6","kw7","kw8","kw9","kw10","kw11","kw12","kw13","kw14","kw15","kw16","kw17","kw18","kw19","kw20"],"category":"Primary Adobe Stock category","format":"Recommended file format and specs","tip":"One specific sales tip"}`;
}

export function buildImagePrompt(input: GenerationInput): string {
  const { concept = "professional lifestyle photo", assetType, mood, orientation, color } = input;
  return `You are an expert Adobe Stock contributor. Generate a complete asset package for a PHOTO/ILLUSTRATION.

Concept: "${concept}"
Type: ${assetType}
Mood: ${mood}
Orientation: ${orientation}
People: ${color}

Respond in EXACT JSON only, no markdown:
{"title":"Adobe Stock title max 70 chars","aiPrompt":"Detailed AI generation prompt with lighting, composition, style, mood. 3-4 sentences.","negativePrompt":"Things to avoid, comma separated","adobeDescription":"Description for Adobe Stock, 2-3 sentences SEO-rich","keywords":["kw1","kw2","kw3","kw4","kw5","kw6","kw7","kw8","kw9","kw10","kw11","kw12","kw13","kw14","kw15","kw16","kw17","kw18","kw19","kw20"],"category":"Primary Adobe Stock category","format":"Recommended specs resolution color space format","tip":"One specific tip to increase commercial appeal"}`;
}

export function buildVideoPrompt(input: GenerationInput): string {
  const { concept = "abstract motion background", assetType, duration, resolution, fps } = input;
  return `You are an expert Adobe Stock video contributor. Generate a complete VIDEO asset package.

Concept: "${concept}"
Type: ${assetType}
Duration: ${duration}
Resolution: ${resolution}
Frame rate: ${fps}

Respond in EXACT JSON only, no markdown:
{"title":"Adobe Stock title max 70 chars","productionBrief":"Detailed production brief: motion, camera, lighting, pacing. 3-4 sentences.","aiVideoPrompt":"Prompt for Sora/Runway/Kling. Camera movement, atmosphere. 2-3 sentences.","adobeDescription":"Description for Adobe Stock upload","keywords":["kw1","kw2","kw3","kw4","kw5","kw6","kw7","kw8","kw9","kw10","kw11","kw12","kw13","kw14","kw15","kw16","kw17","kw18","kw19","kw20"],"category":"Primary Adobe Stock category","technicalSpecs":"Resolution fps codec recommendation","tip":"One tip to maximize video sales"}`;
}

export function buildBatchPrompt(input: GenerationInput): { prompt: string; safeCount: number } {
  const { niche = "technology", assetType, targetMarket, count = 10 } = input;
  const safeCount = Math.min(Math.max(Number(count) || 10, 1), 20);

  const prompt = `You are an expert Adobe Stock contributor. Generate EXACTLY ${safeCount} high-demand stock asset ideas for niche: "${niche}". Asset type: ${assetType}. Target market: ${targetMarket}.

The "ideas" array in your response MUST contain exactly ${safeCount} items — not more, not fewer.

Respond in EXACT JSON only, no markdown:
{"ideas":[{"title":"asset title","type":"vector or photo or illustration or video","concept":"Brief concept 1 sentence","whyTrending":"Why this sells well on Adobe Stock","keywords":["kw1","kw2","kw3","kw4","kw5"]}]}`;

  return { prompt, safeCount };
}

// ── Bulk Generator ─────────────────────────────────────────────

/**
 * Style guardrails appended to every render prompt. These keep the output
 * commercially usable on Adobe Stock: no text, no logos, no accidental brands.
 */
export const IMAGE_STYLE_SUFFIX: Record<BulkKind, string> = {
  vector:
    "flat vector illustration, clean shapes, solid colors, no gradients, plain white background, no text, no logos, no watermark",
  photo:
    "high quality commercial stock photo, natural lighting, sharp focus, no text, no logos, no watermark, no recognizable brands or people",
};

export function buildAssetImagePrompt(input: ImageAssetInput): string {
  const prompt = input.prompt.trim().replace(/[.\s]+$/, "");
  return `${prompt}. ${IMAGE_STYLE_SUFFIX[input.kind]}`;
}

export function buildBulkIdeasPrompt(input: {
  theme: string;
  kind: BulkKind;
  count: number;
  referenceGuidance?: string;
}): { prompt: string; safeCount: number } {
  const theme = input.theme.trim();
  const safeCount = Math.min(Math.max(Number(input.count) || 10, 1), 20);
  const assetType = input.kind === "vector" ? "vector illustration" : "photograph";
  const referenceGuidance = input.referenceGuidance
    ? `\nVisual reference guidance for all ideas: ${input.referenceGuidance}`
    : "";

  const prompt = `You are an expert Adobe Stock contributor. Theme: "${theme}". Asset type: ${assetType}.${referenceGuidance}

Create EXACTLY ${safeCount} DISTINCT, commercially valuable variations of this theme. Vary the subject, composition and color palette so no two ideas look alike. Avoid subjects that are already saturated.

Rules:
- No brand names, trademarks, celebrity names, artist names, or copyrighted characters.
- Title: max 70 characters, descriptive, no clickbait.
- Prompt: a self-contained image generation prompt in 2-3 sentences describing subject, composition, lighting and style.
- Keywords: exactly 25 per idea, lowercase, most important first, single words or short 2-word phrases.
- Category: one Adobe Stock category name.

Respond with EXACT JSON only, no markdown. The "ideas" array MUST contain exactly ${safeCount} objects:
{"ideas":[{"title":"...","prompt":"...","keywords":["kw1","kw2","... 25 total"],"category":"..."}]}`;

  return { prompt, safeCount };
}
