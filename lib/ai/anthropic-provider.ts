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
import { withAiRetry } from "./errors";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = "claude-sonnet-4-6";

/** Raw text completion — parsing is left to the caller so features can own their schema. */
async function complete(prompt: string, maxTokens = 1024): Promise<string> {
  const message = await withAiRetry(() =>
    client.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    })
  );

  return message.content.find((block) => block.type === "text")?.text ?? "";
}

async function generateVector(input: GenerationInput): Promise<GenerationOutput> {
  return parseGenerationOutput(await complete(buildVectorPrompt(input)));
}

async function generateImage(input: GenerationInput): Promise<GenerationOutput> {
  return parseGenerationOutput(await complete(buildImagePrompt(input)));
}

async function generateVideo(input: GenerationInput): Promise<GenerationOutput> {
  return parseGenerationOutput(await complete(buildVideoPrompt(input)));
}

async function generateBatch(input: GenerationInput): Promise<GenerationOutput> {
  const { prompt, safeCount } = buildBatchPrompt(input);
  // Batch needs more headroom than single-asset generations since output scales with count.
  return parseGenerationOutput(await complete(prompt, Math.min(1024 + safeCount * 150, 4096)));
}

export const anthropicProvider: AiProvider = {
  generateVector,
  generateImage,
  generateVideo,
  generateBatch,
  complete,
  // No image model on Anthropic — the Bulk Generator reports a clear error
  // instead of silently producing nothing.
};
