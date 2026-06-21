// components/dashboard/generation-result.tsx
"use client";

import { useState } from "react";
import { Copy, Check, Sparkles } from "lucide-react";
import { GenerationOutput } from "@/types";

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-white/40 uppercase tracking-wide">{label}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs text-white/40 hover:text-white transition-colors"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? "Disalin" : "Salin"}
        </button>
      </div>
      <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{value}</p>
    </div>
  );
}

export function GenerationResult({ output }: { output: GenerationOutput }) {
  const [copiedKeywords, setCopiedKeywords] = useState(false);

  async function copyKeywords() {
    if (!output.keywords) return;
    await navigator.clipboard.writeText(output.keywords.join(", "));
    setCopiedKeywords(true);
    setTimeout(() => setCopiedKeywords(false), 1500);
  }

  if (output.ideas) {
    return (
      <div className="space-y-3">
        {output.ideas.map((idea, i) => (
          <div key={i} className="p-4 rounded-xl border border-white/[0.07] bg-white/[0.02]">
            <div className="flex items-start justify-between gap-3 mb-1.5">
              <h4 className="font-medium text-sm">{idea.title}</h4>
              <span className="shrink-0 text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20">
                {idea.type}
              </span>
            </div>
            <p className="text-sm text-white/50 mb-2">{idea.concept}</p>
            <p className="text-xs text-white/35 mb-2">💡 {idea.whyTrending}</p>
            <div className="flex flex-wrap gap-1.5">
              {idea.keywords.map((kw) => (
                <span key={kw} className="text-xs px-2 py-0.5 rounded-md bg-white/[0.04] text-white/50">
                  {kw}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-violet-500/20 bg-violet-950/10 p-6 space-y-5">
      <div className="flex items-center gap-2 text-violet-300 text-xs font-medium">
        <Sparkles className="w-3.5 h-3.5" />
        Hasil generate
      </div>

      {output.title && <CopyField label="Title" value={output.title} />}
      {output.aiPrompt && <CopyField label="AI Prompt" value={output.aiPrompt} />}
      {output.negativePrompt && <CopyField label="Negative Prompt" value={output.negativePrompt} />}
      {output.productionBrief && <CopyField label="Production Brief" value={output.productionBrief} />}
      {output.aiVideoPrompt && <CopyField label="AI Video Prompt" value={output.aiVideoPrompt} />}
      {output.adobeDescription && <CopyField label="Adobe Description" value={output.adobeDescription} />}

      {output.keywords && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-white/40 uppercase tracking-wide">
              Keywords ({output.keywords.length})
            </span>
            <button
              onClick={copyKeywords}
              className="flex items-center gap-1 text-xs text-white/40 hover:text-white transition-colors"
            >
              {copiedKeywords ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copiedKeywords ? "Disalin" : "Salin semua"}
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {output.keywords.map((kw) => (
              <span key={kw} className="text-xs px-2 py-0.5 rounded-md bg-white/[0.04] text-white/60">
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 pt-1">
        {output.category && (
          <div>
            <span className="text-xs font-medium text-white/40 uppercase tracking-wide block mb-1">Category</span>
            <p className="text-sm text-white/70">{output.category}</p>
          </div>
        )}
        {(output.format || output.technicalSpecs) && (
          <div>
            <span className="text-xs font-medium text-white/40 uppercase tracking-wide block mb-1">Spesifikasi</span>
            <p className="text-sm text-white/70">{output.format || output.technicalSpecs}</p>
          </div>
        )}
      </div>

      {output.tip && (
        <div className="pt-3 border-t border-white/[0.06]">
          <span className="text-xs font-medium text-white/40 uppercase tracking-wide block mb-1">Sales tip</span>
          <p className="text-sm text-white/60">{output.tip}</p>
        </div>
      )}
    </div>
  );
}
