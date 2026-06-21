// lib/ai/index.ts
import { AiProvider } from "./shared";
import { anthropicProvider } from "./anthropic-provider";
import { geminiProvider } from "./gemini-provider";

const PROVIDERS: Record<string, AiProvider> = {
  anthropic: anthropicProvider,
  gemini: geminiProvider,
};

function resolveProvider(): AiProvider {
  const key = (process.env.AI_PROVIDER || "anthropic").toLowerCase();
  const provider = PROVIDERS[key];

  if (!provider) {
    throw new Error(
      `Unknown AI_PROVIDER "${process.env.AI_PROVIDER}". Valid options: ${Object.keys(PROVIDERS).join(", ")}.`
    );
  }

  return provider;
}

const active = resolveProvider();

export const generateVector = active.generateVector;
export const generateImage = active.generateImage;
export const generateVideo = active.generateVideo;
export const generateBatch = active.generateBatch;
