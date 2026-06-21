// lib/ai/gemini-provider.ts
import { GoogleGenAI } from "@google/genai";
import { GenerationInput, GenerationOutput } from "@/types";
import {
  AiProvider,
  buildVectorPrompt,
  buildImagePrompt,
  buildVideoPrompt,
  buildBatchPrompt,
  parseGenerationOutput,
} from "./shared";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Flash is free-tier eligible and stable (not a preview model), which keeps
// behavior predictable across Google's frequent free-tier policy changes.
const MODEL = "gemini-2.5-flash";

async function callGemini(prompt: string): Promise<GenerationOutput> {
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      // Ask Gemini to return JSON directly — reduces the chance of prose
      // wrapping the JSON object, on top of our own extractJson() fallback.
      responseMimeType: "application/json",
    },
  });

  const text = response.text ?? "";
  return parseGenerationOutput(text);
}

async function generateVector(input: GenerationInput): Promise<GenerationOutput> {
  return callGemini(buildVectorPrompt(input));
}

async function generateImage(input: GenerationInput): Promise<GenerationOutput> {
  return callGemini(buildImagePrompt(input));
}

async function generateVideo(input: GenerationInput): Promise<GenerationOutput> {
  return callGemini(buildVideoPrompt(input));
}

async function generateBatch(input: GenerationInput): Promise<GenerationOutput> {
  const { prompt } = buildBatchPrompt(input);
  return callGemini(prompt);
}

export const geminiProvider: AiProvider = {
  generateVector,
  generateImage,
  generateVideo,
  generateBatch,
};
