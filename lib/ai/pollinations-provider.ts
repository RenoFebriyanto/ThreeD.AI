// lib/ai/pollinations-provider.ts
//
// Pollinations.AI — completely free image generation, no API key required.
// Uses Flux (black-forest-labs/FLUX.1-schnell) under the hood.
//
// Docs: https://image.pollinations.ai/prompt/{prompt}
// Parameters: model, width, height, seed, nologo

import { ImageAssetInput, ImageAssetResult } from "./shared";

const BASE_URL = "https://image.pollinations.ai/prompt";

/** Timeout per attempt in ms. Pollinations cold-start can reach ~30 s. */
const TIMEOUT_MS = 90_000;

/** Width × height for each asset kind. Adobe Stock minimum is 4 MP. */
const DIMENSIONS: Record<string, { width: number; height: number }> = {
  vector: { width: 1024, height: 1024 },
  photo: { width: 1280, height: 1024 },
};

/**
 * Creates a fetch with a manual timeout using Promise.race so it works on
 * all Node.js versions (AbortSignal.timeout requires Node ≥ 17.3).
 */
async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetches an image from Pollinations.AI and returns it as base64.
 * Retries up to 3× with increasing back-off for transient failures.
 */
export async function pollinationsGenerateImage(
  input: ImageAssetInput
): Promise<ImageAssetResult> {
  const dims = DIMENSIONS[input.kind] ?? { width: 1024, height: 1024 };

  const params = new URLSearchParams({
    model: "flux",
    width: String(dims.width),
    height: String(dims.height),
    nologo: "true",
    // Different seed per call so the same prompt doesn't return a cached image.
    seed: String(Math.floor(Math.random() * 2_147_483_647)),
  });

  const encodedPrompt = encodeURIComponent(input.prompt.trim());
  const url = `${BASE_URL}/${encodedPrompt}?${params.toString()}`;

  const MAX_ATTEMPTS = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      console.log(`[pollinations] attempt ${attempt}/${MAX_ATTEMPTS} generating image…`);

      const response = await fetchWithTimeout(url, TIMEOUT_MS);

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(
          `Pollinations.AI ${response.status}: ${text.slice(0, 200)}`
        );
      }

      const contentType = response.headers.get("content-type") ?? "image/jpeg";
      const mime = contentType.split(";")[0].trim() || "image/jpeg";

      const buffer = await response.arrayBuffer();

      if (buffer.byteLength < 1000) {
        // Too small — likely an error HTML page, not a real image.
        throw new Error("Pollinations.AI returned an unexpectedly small response — retrying.");
      }

      const base64 = Buffer.from(buffer).toString("base64");

      console.log(`[pollinations] success — ${mime} ${Math.round(buffer.byteLength / 1024)} KB`);
      return { mime, base64 };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const isAbort = lastError.name === "AbortError";
      const reason = isAbort ? `timeout after ${TIMEOUT_MS / 1000}s` : lastError.message;

      console.error(`[pollinations] attempt ${attempt}/${MAX_ATTEMPTS} failed: ${reason}`);

      if (attempt < MAX_ATTEMPTS) {
        // Increasing back-off: 5 s, 10 s.
        const wait = 5000 * attempt;
        console.log(`[pollinations] waiting ${wait / 1000}s before retry…`);
        await new Promise((resolve) => setTimeout(resolve, wait));
      }
    }
  }

  // Surface a friendly, retryable-looking message so the client knows it can
  // click "Ulangi yang gagal" rather than giving up permanently.
  throw new Error(
    "Koneksi ke Pollinations.AI gagal. Periksa jaringan lalu coba lagi."
  );
}


