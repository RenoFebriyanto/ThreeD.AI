// lib/ai/capabilities.ts
// Pure, side-effect-free capability checks. Safe to import from server
// components — unlike lib/ai/index.ts, this never constructs an API client.

function providerName(): string {
  return (process.env.AI_PROVIDER || "anthropic").toLowerCase();
}

/**
 * IMAGE_PROVIDER overrides which service renders images, independently of
 * the text AI_PROVIDER. This lets you use Gemini for text and Cloudflare
 * Workers AI for image rendering.
 *
 * Supported values: "gemini" | "pollinations" | "cloudflare"
 * Default: same as AI_PROVIDER (for backwards compatibility).
 */
function imageProviderName(): string {
  return (
    (process.env.IMAGE_PROVIDER || process.env.AI_PROVIDER || "anthropic")
      .toLowerCase()
  );
}

/** Providers that can render image pixels (not just metadata). */
export const IMAGE_CAPABLE_PROVIDERS = ["gemini", "pollinations", "cloudflare"];

export function providerSupportsImages(): boolean {
  const name = imageProviderName();
  if (!IMAGE_CAPABLE_PROVIDERS.includes(name)) return false;
  if (name === "gemini") {
    return Boolean(process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEYS?.trim());
  }
  if (name === "cloudflare") {
    return Boolean(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN);
  }
  return true;
}

export function imageSupportHint(): string | null {
  if (providerSupportsImages()) return null;

  const name = imageProviderName();
  if (name === "cloudflare") {
    return "Isi CLOUDFLARE_ACCOUNT_ID dan CLOUDFLARE_API_TOKEN di .env untuk memakai kuota gratis Cloudflare Workers AI.";
  }
  if (name === "gemini") {
    return "Render gambar Gemini memerlukan GEMINI_API_KEY atau GEMINI_API_KEYS dan dapat memerlukan billing aktif.";
  }
  if (name === "pollinations") return null;
  return `IMAGE_PROVIDER="${name}" tidak mendukung render gambar. Gunakan "cloudflare", "gemini", atau "pollinations".`;
}

/** Exported so lib/ai/index.ts can pick the right image implementation. */
export { imageProviderName };
