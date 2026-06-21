// lib/ai/shared.ts
import { GenerationInput, GenerationOutput } from "@/types";

export type Generator = (input: GenerationInput) => Promise<GenerationOutput>;

export interface AiProvider {
  generateVector: Generator;
  generateImage: Generator;
  generateVideo: Generator;
  generateBatch: Generator;
}

/**
 * Extracts a JSON object from a model's text response, tolerating accidental
 * markdown fences or leading/trailing prose the model may add despite
 * instructions to respond with JSON only.
 */
export function extractJson(text: string): string {
  const fenced = text.replace(/```json|```/g, "").trim();
  const firstBrace = fenced.indexOf("{");
  const lastBrace = fenced.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    return fenced;
  }
  return fenced.slice(firstBrace, lastBrace + 1);
}

export function parseGenerationOutput(text: string): GenerationOutput {
  const clean = extractJson(text);
  try {
    return JSON.parse(clean) as GenerationOutput;
  } catch {
    throw new Error("AI returned an unparseable response. Please try again.");
  }
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
