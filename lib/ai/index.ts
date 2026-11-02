// lib/ai/index.ts
import { BulkIdea, BulkKind } from "@/types";
import {
  AiProvider,
  ImageAssetInput,
  ImageAssetResult,
  buildBulkIdeasPrompt,
  parseBulkIdeas,
} from "./shared";
import { anthropicProvider } from "./anthropic-provider";
import { geminiProvider } from "./gemini-provider";
import { cloudflareGenerateImage } from "./cloudflare-provider";
import { pollinationsGenerateImage } from "./pollinations-provider";
import {
  imageSupportHint as providerImageHint,
  providerSupportsImages,
  imageProviderName,
} from "./capabilities";

const PROVIDERS: Record<string, AiProvider> = {
  anthropic: anthropicProvider,
  gemini: geminiProvider,
};

const providerName = (process.env.AI_PROVIDER || "anthropic").toLowerCase();

function resolveProvider(): AiProvider {
  const provider = PROVIDERS[providerName];

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

/** Image rendering needs an image-capable provider. */
export const supportsImages = providerSupportsImages() && Boolean(resolveImageProvider());

/** Human-readable reason when image rendering isn't available, otherwise null. */
export const imageProviderHint: string | null = supportsImages ? null : providerImageHint();

/**
 * Returns the image-rendering function based on IMAGE_PROVIDER env var.
 * Falls back to the primary AI provider's generateAssetImage if IMAGE_PROVIDER
 * is not set or equals AI_PROVIDER.
 */
function resolveImageProvider(): ((input: ImageAssetInput) => Promise<ImageAssetResult>) | null {
  const imgProvider = imageProviderName();

  if (imgProvider === "pollinations") {
    return pollinationsGenerateImage;
  }

  if (imgProvider === "cloudflare") {
    return cloudflareGenerateImage;
  }

  if (imgProvider === "gemini") {
    return geminiProvider.generateAssetImage ?? null;
  }

  // Any other provider that implements generateAssetImage natively.
  return active.generateAssetImage ?? null;
}

export async function generateAssetImage(input: ImageAssetInput): Promise<ImageAssetResult> {
  const imageProvider = resolveImageProvider();

  if (!imageProvider) {
    throw new Error(providerImageHint() ?? "Provider AI aktif tidak mendukung render gambar.");
  }

  return imageProvider(input);
}

/**
 * Bulk Generator: one theme in, N distinct ideas out.
 * Ideas themselves cost nothing — only rendering an image spends a credit.
 */
export async function generateBulkIdeas(input: {
  theme: string;
  kind: BulkKind;
  count: number;
  referenceGuidance?: string;
}): Promise<BulkIdea[]> {
  const { prompt, safeCount } = buildBulkIdeasPrompt(input);
  const text = await active.complete(prompt, Math.min(2048 + safeCount * 350, 8192));
  return parseBulkIdeas(text, safeCount);
}
