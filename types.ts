// types.ts

// ── Plan & Billing ─────────────────────────────────────────────

export type Plan = "FREE" | "STARTER" | "PRO" | "ENTERPRISE";

export interface PricingPlan {
  id: Plan;
  name: string;
  priceMonthly: number;
  credits: number;
  features: string[];
}

export const PLANS: PricingPlan[] = [
  {
    id: "FREE",
    name: "Free",
    priceMonthly: 0,
    credits: 10,
    features: ["10 generate / bulan", "Semua tipe aset", "Export JSON", "Komunitas support"],
  },
  {
    id: "STARTER",
    name: "Starter",
    priceMonthly: 99000,
    credits: 100,
    features: ["100 generate / bulan", "Semua tipe aset", "1 API key", "Export JSON & CSV", "Email support"],
  },
  {
    id: "PRO",
    name: "Pro",
    priceMonthly: 249000,
    credits: 500,
    features: ["500 generate / bulan", "Semua tipe aset", "5 API key", "Export JSON & CSV", "Priority support", "Riwayat & analytics"],
  },
  {
    id: "ENTERPRISE",
    name: "Enterprise",
    priceMonthly: 0,
    credits: 999999,
    features: ["Generate unlimited", "Unlimited API key", "Dedicated support", "Custom integrasi", "SLA"],
  },
];

export function formatIDR(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

// ── AI Generation ──────────────────────────────────────────────

export type AssetKind = "vector" | "photo" | "video" | "batch";

export interface GenerationInput {
  // shared
  concept?: string;
  assetType?: string;
  color?: string;

  // vector
  style?: string;
  categories?: string[];

  // photo / illustration
  mood?: string;
  orientation?: string;

  // video
  duration?: string;
  resolution?: string;
  fps?: string;

  // batch
  niche?: string;
  targetMarket?: string;
  count?: number;
}

export interface BatchIdea {
  title: string;
  type: string;
  concept: string;
  whyTrending: string;
  keywords: string[];
}

export interface GenerationOutput {
  title?: string;
  aiPrompt?: string;
  negativePrompt?: string;
  adobeDescription?: string;
  keywords?: string[];
  category?: string;
  format?: string;
  tip?: string;

  // video-specific
  productionBrief?: string;
  aiVideoPrompt?: string;
  technicalSpecs?: string;

  // batch-specific
  ideas?: BatchIdea[];

  [key: string]: unknown;
}
