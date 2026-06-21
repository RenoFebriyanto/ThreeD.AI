// lib/ai/anthropic-provider.ts
import Anthropic from "@anthropic-ai/sdk";
import { GenerationInput, GenerationOutput } from "@/types";
import {
  AiProvider,
  buildVectorPrompt,
  buildImagePrompt,
  buildVideoPrompt,
  buildBatchPrompt,
  parseGenerationOutput,
} from "./shared";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = "claude-sonnet-4-6";

async function callClaude(prompt: string, maxTokens = 1024): Promise<GenerationOutput> {
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content.find((b) => b.type === "text")?.text ?? "";
  return parseGenerationOutput(text);
}

async function generateVector(input: GenerationInput): Promise<GenerationOutput> {
  return callClaude(buildVectorPrompt(input));
}

async function generateImage(input: GenerationInput): Promise<GenerationOutput> {
  return callClaude(buildImagePrompt(input));
}

async function generateVideo(input: GenerationInput): Promise<GenerationOutput> {
  return callClaude(buildVideoPrompt(input));
}

async function generateBatch(input: GenerationInput): Promise<GenerationOutput> {
  const { prompt, safeCount } = buildBatchPrompt(input);
  // Batch needs more headroom than single-asset generations since output scales with count.
  return callClaude(prompt, Math.min(1024 + safeCount * 150, 4096));
}

export const anthropicProvider: AiProvider = {
  generateVector,
  generateImage,
  generateVideo,
  generateBatch,
};
