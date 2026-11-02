import { ImageAssetInput, ImageAssetResult, IMAGE_STYLE_SUFFIX } from "./shared";

const MODEL = "@cf/leonardo/phoenix-1.0";
const BASE_URL = "https://api.cloudflare.com/client/v4/accounts";
const MAX_PROMPT_LENGTH = 2048;

interface CloudflareImageResponse {
  success?: boolean;
  errors?: Array<{ code?: number; message?: string }>;
  result?: { image?: string };
}

export async function cloudflareGenerateImage(
  input: ImageAssetInput
): Promise<ImageAssetResult> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim();

  if (!accountId || !apiToken) {
    throw new Error(
      "Konfigurasi gambar Cloudflare belum lengkap. Isi CLOUDFLARE_ACCOUNT_ID dan CLOUDFLARE_API_TOKEN di .env."
    );
  }

  const referenceGuidance = input.referenceGuidance
    ? `Visual reference guidance: ${input.referenceGuidance.trim()}. `
    : "";
  const styleSuffix = `${referenceGuidance}${IMAGE_STYLE_SUFFIX[input.kind]}`;
  const prompt = `${input.prompt.trim().replace(/[.\s]+$/, "").slice(0, MAX_PROMPT_LENGTH - styleSuffix.length - 2)}. ${styleSuffix}`;
  const [ratioWidth, ratioHeight] = (input.aspectRatio ?? "1:1").split(":").map(Number);
  const resolution = input.resolution ?? 1024;
  const scale = resolution / Math.max(ratioWidth, ratioHeight);
  const width = Math.round(ratioWidth * scale);
  const height = Math.round(ratioHeight * scale);
  const response = await fetch(
    `${BASE_URL}/${encodeURIComponent(accountId)}/ai/run/${MODEL}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        negative_prompt: "blurry, low quality, distorted, watermark, logo, text",
        width,
        height,
        guidance: 7,
        num_steps: 25,
      }),
    }
  );

  const contentType = response.headers.get("content-type") ?? "";
  if (response.ok && contentType.startsWith("image/")) {
    const image = Buffer.from(await response.arrayBuffer()).toString("base64");
    return { mime: contentType.split(";")[0], base64: image };
  }

  const data = (await response.json()) as CloudflareImageResponse;
  const image = data.result?.image;

  if (!response.ok || !data.success || !image) {
    const message = data.errors?.map((error) => error.message).filter(Boolean).join("; ");
    const error = {
      error: {
        code: response.status,
        status: response.status === 429 ? "RESOURCE_EXHAUSTED" : "CLOUDFLARE_ERROR",
        message: `Cloudflare Workers AI: ${message || `HTTP ${response.status}.`}`,
      },
    };
    throw new Error(JSON.stringify(error));
  }

  return { mime: "image/jpeg", base64: image };
}
