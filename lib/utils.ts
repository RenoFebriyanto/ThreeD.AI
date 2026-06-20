// lib/utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import crypto from "crypto";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Generates a unique, prefixed API key for a user's external API access. */
export function generateApiKey(): string {
  return `sk_live_${crypto.randomBytes(24).toString("hex")}`;
}
