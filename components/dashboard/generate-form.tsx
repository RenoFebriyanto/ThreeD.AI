// components/dashboard/generate-form.tsx
"use client";

import { useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { AssetKind, GenerationOutput } from "@/types";
import { GenerationResult } from "@/components/dashboard/generation-result";

const TABS: { id: AssetKind; label: string; icon: string }[] = [
  { id: "vector", label: "Vector", icon: "🎨" },
  { id: "photo", label: "Foto & Ilustrasi", icon: "📷" },
  { id: "video", label: "Video", icon: "🎬" },
  { id: "batch", label: "Batch Ideas", icon: "💡" },
];

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs text-white/40 mb-1.5">{children}</label>;
}

const inputClass =
  "w-full px-3.5 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-violet-500/50 transition-colors";

export function GenerateForm({ onGenerated }: { onGenerated?: () => void }) {
  const [activeTab, setActiveTab] = useState<AssetKind>("vector");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerationOutput | null>(null);

  // Form state per tab — kept separate so switching tabs doesn't lose input.
  const [vectorForm, setVectorForm] = useState({ concept: "", style: "Flat Design", color: "Vibrant", categories: "" });
  const [photoForm, setPhotoForm] = useState({ concept: "", assetType: "Photography", mood: "Bright & airy", orientation: "Landscape" });
  const [videoForm, setVideoForm] = useState({ concept: "", assetType: "Motion graphics", duration: "10-15s", resolution: "4K", fps: "30fps" });
  const [batchForm, setBatchForm] = useState({ niche: "", assetType: "vector", targetMarket: "Global", count: 10 });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    let input: Record<string, unknown> = {};
    if (activeTab === "vector") {
      input = { ...vectorForm, categories: vectorForm.categories.split(",").map((c) => c.trim()).filter(Boolean) };
    } else if (activeTab === "photo") {
      input = photoForm;
    } else if (activeTab === "video") {
      input = videoForm;
    } else {
      input = batchForm;
    }

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: activeTab, input }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Terjadi kesalahan. Coba lagi.");
        return;
      }

      setResult(data.generation.output as GenerationOutput);
      onGenerated?.();
    } catch {
      setError("Gagal terhubung ke server. Periksa koneksi kamu.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Tab switcher */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] mb-6 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setResult(null);
              setError(null);
            }}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
              activeTab === tab.id ? "bg-violet-500 text-white" : "text-white/50 hover:text-white hover:bg-white/[0.04]"
            )}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {activeTab === "vector" && (
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <FieldLabel>Konsep asset</FieldLabel>
              <input
                required
                className={inputClass}
                placeholder="contoh: mandala pattern bertema alam tropis"
                value={vectorForm.concept}
                onChange={(e) => setVectorForm({ ...vectorForm, concept: e.target.value })}
              />
            </div>
            <div>
              <FieldLabel>Gaya vector</FieldLabel>
              <select
                className={inputClass}
                value={vectorForm.style}
                onChange={(e) => setVectorForm({ ...vectorForm, style: e.target.value })}
              >
                {["Flat Design", "Geometric", "Line Art", "Mandala", "Isometric", "Hand-drawn"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel>Palet warna</FieldLabel>
              <input
                className={inputClass}
                placeholder="contoh: Pastel, Vibrant, Monochrome"
                value={vectorForm.color}
                onChange={(e) => setVectorForm({ ...vectorForm, color: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel>Kategori Adobe Stock (pisahkan koma, opsional)</FieldLabel>
              <input
                className={inputClass}
                placeholder="contoh: Nature, Backgrounds/Textures"
                value={vectorForm.categories}
                onChange={(e) => setVectorForm({ ...vectorForm, categories: e.target.value })}
              />
            </div>
          </div>
        )}

        {activeTab === "photo" && (
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <FieldLabel>Konsep asset</FieldLabel>
              <input
                required
                className={inputClass}
                placeholder="contoh: pengusaha muda bekerja di coffee shop"
                value={photoForm.concept}
                onChange={(e) => setPhotoForm({ ...photoForm, concept: e.target.value })}
              />
            </div>
            <div>
              <FieldLabel>Tipe</FieldLabel>
              <select
                className={inputClass}
                value={photoForm.assetType}
                onChange={(e) => setPhotoForm({ ...photoForm, assetType: e.target.value })}
              >
                {["Photography", "Digital Art", "Watercolor", "3D Render", "Illustration"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel>Mood</FieldLabel>
              <input
                className={inputClass}
                placeholder="contoh: Bright & airy, Moody"
                value={photoForm.mood}
                onChange={(e) => setPhotoForm({ ...photoForm, mood: e.target.value })}
              />
            </div>
            <div>
              <FieldLabel>Orientasi</FieldLabel>
              <select
                className={inputClass}
                value={photoForm.orientation}
                onChange={(e) => setPhotoForm({ ...photoForm, orientation: e.target.value })}
              >
                {["Landscape", "Portrait", "Square"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {activeTab === "video" && (
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <FieldLabel>Konsep asset</FieldLabel>
              <input
                required
                className={inputClass}
                placeholder="contoh: drone shot pegunungan saat matahari terbit"
                value={videoForm.concept}
                onChange={(e) => setVideoForm({ ...videoForm, concept: e.target.value })}
              />
            </div>
            <div>
              <FieldLabel>Tipe</FieldLabel>
              <input
                className={inputClass}
                placeholder="contoh: Motion graphics, Drone footage"
                value={videoForm.assetType}
                onChange={(e) => setVideoForm({ ...videoForm, assetType: e.target.value })}
              />
            </div>
            <div>
              <FieldLabel>Durasi</FieldLabel>
              <select
                className={inputClass}
                value={videoForm.duration}
                onChange={(e) => setVideoForm({ ...videoForm, duration: e.target.value })}
              >
                {["5-10s", "10-15s", "15-30s", "30-60s"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel>Resolusi</FieldLabel>
              <select
                className={inputClass}
                value={videoForm.resolution}
                onChange={(e) => setVideoForm({ ...videoForm, resolution: e.target.value })}
              >
                {["4K", "1080p", "720p"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel>Frame rate</FieldLabel>
              <select
                className={inputClass}
                value={videoForm.fps}
                onChange={(e) => setVideoForm({ ...videoForm, fps: e.target.value })}
              >
                {["24fps", "30fps", "60fps"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {activeTab === "batch" && (
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <FieldLabel>Niche / topik</FieldLabel>
              <input
                required
                className={inputClass}
                placeholder="contoh: sustainable living, fintech indonesia"
                value={batchForm.niche}
                onChange={(e) => setBatchForm({ ...batchForm, niche: e.target.value })}
              />
            </div>
            <div>
              <FieldLabel>Tipe asset</FieldLabel>
              <select
                className={inputClass}
                value={batchForm.assetType}
                onChange={(e) => setBatchForm({ ...batchForm, assetType: e.target.value })}
              >
                {["vector", "photo", "illustration", "video", "campuran"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel>Target pasar</FieldLabel>
              <input
                className={inputClass}
                placeholder="contoh: Global, US, Eropa"
                value={batchForm.targetMarket}
                onChange={(e) => setBatchForm({ ...batchForm, targetMarket: e.target.value })}
              />
            </div>
            <div>
              <FieldLabel>Jumlah ide (1-20)</FieldLabel>
              <input
                type="number"
                min={1}
                max={20}
                className={inputClass}
                value={batchForm.count}
                onChange={(e) => setBatchForm({ ...batchForm, count: Number(e.target.value) })}
              />
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-red-950/50 border border-red-500/20 text-sm text-red-400">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full sm:w-auto px-8 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? "Generating..." : "Generate"}
        </button>
      </form>

      {result && (
        <div className="mt-8">
          <GenerationResult output={result} />
        </div>
      )}
    </div>
  );
}
