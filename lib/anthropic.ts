// src/lib/anthropic.ts
import Anthropic from "@anthropic-ai/sdk";
import { GenerationInput, GenerationOutput } from "@/types";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function generateVector(input: GenerationInput): Promise<GenerationOutput> {
  const { concept = "abstract geometric pattern", style, color, categories = [] } = input;

  const prompt = `You are an expert Adobe Stock contributor. Generate a complete asset package for a VECTOR asset.

Asset concept: "${concept}"
Vector style: ${style}
Color palette: ${color}
Adobe Stock categories: ${categories.join(", ") || "general"}

Respond in EXACT JSON only, no markdown:
{"title":"Adobe Stock title max 70 chars","aiPrompt":"Detailed AI image generation prompt for Adobe Firefly, Midjourney, DALL-E. 2-3 sentences.","adobeDescription":"Description for Adobe Stock upload, 2-3 sentences keyword-rich","keywords":["kw1","kw2","kw3","kw4","kw5","kw6","kw7","kw8","kw9","kw10","kw11","kw12","kw13","kw14","kw15","kw16","kw17","kw18","kw19","kw20"],"category":"Primary Adobe Stock category","format":"Recommended file format and specs","tip":"One specific sales tip"}`;

  return callClaude(prompt);
}

export async function generateImage(input: GenerationInput): Promise<GenerationOutput> {
  const { concept = "professional lifestyle photo", assetType, mood, orientation, color } = input;

  const prompt = `You are an expert Adobe Stock contributor. Generate a complete asset package for a PHOTO/ILLUSTRATION.

Concept: "${concept}"
Type: ${assetType}
Mood: ${mood}
Orientation: ${orientation}
People: ${color}

Respond in EXACT JSON only, no markdown:
{"title":"Adobe Stock title max 70 chars","aiPrompt":"Detailed AI generation prompt with lighting, composition, style, mood. 3-4 sentences.","negativePrompt":"Things to avoid, comma separated","adobeDescription":"Description for Adobe Stock, 2-3 sentences SEO-rich","keywords":["kw1","kw2","kw3","kw4","kw5","kw6","kw7","kw8","kw9","kw10","kw11","kw12","kw13","kw14","kw15","kw16","kw17","kw18","kw19","kw20"],"category":"Primary Adobe Stock category","format":"Recommended specs resolution color space format","tip":"One specific tip to increase commercial appeal"}`;

  return callClaude(prompt);
}

export async function generateVideo(input: GenerationInput): Promise<GenerationOutput> {
  const { concept = "abstract motion background", assetType, duration, resolution, fps } = input;

  const prompt = `You are an expert Adobe Stock video contributor. Generate a complete VIDEO asset package.

Concept: "${concept}"
Type: ${assetType}
Duration: ${duration}
Resolution: ${resolution}
Frame rate: ${fps}

Respond in EXACT JSON only, no markdown:
{"title":"Adobe Stock title max 70 chars","productionBrief":"Detailed production brief: motion, camera, lighting, pacing. 3-4 sentences.","aiVideoPrompt":"Prompt for Sora/Runway/Kling. Camera movement, atmosphere. 2-3 sentences.","adobeDescription":"Description for Adobe Stock upload","keywords":["kw1","kw2","kw3","kw4","kw5","kw6","kw7","kw8","kw9","kw10","kw11","kw12","kw13","kw14","kw15","kw16","kw17","kw18","kw19","kw20"],"category":"Primary Adobe Stock category","technicalSpecs":"Resolution fps codec recommendation","tip":"One tip to maximize video sales"}`;

  return callClaude(prompt);
}

export async function generateBatch(input: GenerationInput): Promise<GenerationOutput> {
  const { niche = "technology", assetType, targetMarket, count = 10 } = input;

  const prompt = `You are an expert Adobe Stock contributor. Generate ${count} high-demand stock asset ideas for niche: "${niche}". Asset type: ${assetType}. Target market: ${targetMarket}.

Respond in EXACT JSON only, no markdown:
{"ideas":[{"title":"asset title","type":"vector or photo or illustration or video","concept":"Brief concept 1 sentence","whyTrending":"Why this sells well on Adobe Stock","keywords":["kw1","kw2","kw3","kw4","kw5"]}]}`;

  return callClaude(prompt);
}

async function callClaude(prompt: string): Promise<GenerationOutput> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content.find((b) => b.type === "text")?.text ?? "";
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean) as GenerationOutput;
}