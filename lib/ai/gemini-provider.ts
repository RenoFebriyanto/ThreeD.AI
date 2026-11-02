// lib/ai/gemini-provider.ts
import { GoogleGenAI } from "@google/genai";
import { GenerationInput, GenerationOutput } from "@/types";
import {
  AiProvider,
  ImageAssetInput,
  ImageAssetResult,
  buildVectorPrompt,
  buildImagePrompt,
  buildVideoPrompt,
  buildBatchPrompt,
  buildAssetImagePrompt,
  parseGenerationOutput,
} from "./shared";
import { aiErrorInfo, withAiRetry } from "./errors";

const apiKeys = [
  process.env.GEMINI_API_KEY,
  ...(process.env.GEMINI_API_KEYS ?? "").split(/[,\r\n]/),
]
  .filter((key): key is string => typeof key === "string")
  .map((key) => key.trim())
  .filter((key, index, keys) => key.length > 0 && keys.indexOf(key) === index);
const clients = apiKeys.map((apiKey) => new GoogleGenAI({ apiKey }));
let activeClientIndex = 0;

async function withGeminiKeyRotation<T>(
  operation: (client: GoogleGenAI) => Promise<T>
): Promise<T> {
  if (clients.length === 0) {
    throw new Error("Atur GEMINI_API_KEY atau GEMINI_API_KEYS untuk menggunakan Gemini.");
  }

  let lastError: unknown;

  for (let attempt = 0; attempt < clients.length; attempt++) {
    const clientIndex = (activeClientIndex + attempt) % clients.length;

    try {
      const result = await withAiRetry(() => operation(clients[clientIndex]));
      activeClientIndex = clientIndex;
      return result;
    } catch (error) {
      const kind = aiErrorInfo(error).kind;
      if (kind !== "quota" && kind !== "auth") throw error;

      lastError = error;
      activeClientIndex = (clientIndex + 1) % clients.length;
    }
  }

  throw lastError;
}

// Flash is free-tier eligible and stable (not a preview model), which keeps
// behavior predictable across Google's frequent free-tier policy changes.
const TEXT_MODEL = "gemini-2.5-flash";
// Nano Banana 2.1 is Gemini's current image generation model.
const IMAGE_MODEL = "gemini-nano-banana-2.1";

async function complete(prompt: string): Promise<string> {
  const response = await withGeminiKeyRotation((client) =>
    client.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        // Ask Gemini to return JSON directly — reduces the chance of prose
        // wrapping the JSON object, on top of our own extractJson() fallback.
        responseMimeType: "application/json",
      },
    })
  );

  return response.text ?? "";
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
  const { prompt } = buildBatchPrompt(input);
  return parseGenerationOutput(await complete(prompt));
}

async function generateAssetImage(input: ImageAssetInput): Promise<ImageAssetResult> {
  const response = await withGeminiKeyRotation((client) =>
    client.models.generateContent({
      model: IMAGE_MODEL,
      contents: buildAssetImagePrompt(input),
      config: {
        responseModalities: ["IMAGE", "TEXT"],
      },
    })
  );

  const image = response.candidates?.[0]?.content?.parts?.find(
    (part) => part.inlineData?.data
  )?.inlineData;

  if (!image?.data) {
    throw new Error("Gemini tidak mengembalikan gambar — kemungkinan diblokir safety filter. Coba ubah prompt atau tema.");
  }

  return { mime: image.mimeType ?? "image/png", base64: image.data };
}

export async function describeImageReferences(
  references: Array<{ mimeType: string; data: string }>
): Promise<string> {
  const response = await withGeminiKeyRotation((client) =>
    client.models.generateContent({
      model: TEXT_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: "Describe the visual style, palette, composition, and notable shapes in these reference images as concise guidance for a new original stock illustration. Do not identify people or reproduce text, logos, or copyrighted characters. Return only the visual guidance.",
            },
            ...references.map(({ mimeType, data }) => ({
              inlineData: { mimeType, data },
            })),
          ],
        },
      ],
    })
  );
  const guidance = response.text?.trim();

  if (!guidance) {
    throw new Error("Gemini tidak dapat membaca gambar referensi. Coba gambar lain.");
  }

  return guidance.slice(0, 1000);
}

export const geminiProvider: AiProvider = {
  generateVector,
  generateImage,
  generateVideo,
  generateBatch,
  complete,
  generateAssetImage,
};
