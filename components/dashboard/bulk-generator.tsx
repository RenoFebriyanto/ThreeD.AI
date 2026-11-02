// components/dashboard/bulk-generator.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Download,
  Edit3,
  ExternalLink,
  FileSpreadsheet,
  ImagePlus,
  Layers,
  Loader2,
  Menu,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Square,
  SlidersHorizontal,
  TriangleAlert,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BulkAspectRatio, BulkItem, BulkKind, BulkMode, BulkResolution } from "@/types";

// Keep requests sequential to stay within free-tier provider rate limits.
const CONCURRENCY = 1;
// Delay between sequential image requests.
const REQUEST_DELAY_MS = 3000;
const MAX_COUNT = 20;

interface CreditsState {
  plan: string;
  creditsRemaining: number;
  creditsLimit: number;
}

interface ReferenceImage {
  name: string;
  mimeType: string;
  data: string;
  previewUrl: string;
}

interface RenderOptions {
  kind: BulkKind;
  aspectRatio: BulkAspectRatio;
  resolution: BulkResolution;
  referenceGuidance?: string;
}

const inputClass =
  "w-full px-3.5 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-violet-500/50 transition-colors";

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "asset"
  );
}

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function fileName(theme: string, id: number, mime?: string): string {
  const extension =
    mime === "image/jpeg"
      ? "jpg"
      : mime === "image/webp"
        ? "webp"
        : mime === "image/svg+xml"
          ? "svg"
          : "png";
  return `${slugify(theme)}-${String(id).padStart(2, "0")}.${extension}`;
}

/** Adobe Stock upload template: Filename,Title,Keywords,Category,Releases */
function buildCsv(theme: string, items: BulkItem[]): string {
  const header = "Filename,Title,Keywords,Category,Releases";
  const rows = items.map((item) =>
    [fileName(theme, item.id, item.mime), item.title, item.keywords.join(", "), item.category, ""]
      .map(csvCell)
      .join(",")
  );

  return [header, ...rows].join("\r\n");
}

function triggerDownload(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  // Give the browser a tick to start the download before releasing the blob.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function base64ToBlob(base64: string, mime: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

async function prepareReferenceImage(file: File): Promise<ReferenceImage> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Pilih gambar JPG, PNG, atau WebP.");
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error(`${file.name} melebihi batas ukuran 10 MB.`);
  }

  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1024 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Gambar referensi tidak dapat diproses.");

    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => result ? resolve(result) : reject(new Error("Gambar referensi gagal dikompres.")),
        "image/jpeg",
        0.82
      );
    });
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result !== "string") {
          reject(new Error("Gambar referensi gagal dibaca."));
          return;
        }
        resolve(result.split(",", 2)[1] ?? "");
      };
      reader.onerror = () => reject(new Error("Gambar referensi gagal dibaca."));
      reader.readAsDataURL(blob);
    });

    return {
      name: file.name,
      mimeType: "image/jpeg",
      data,
      previewUrl: URL.createObjectURL(blob),
    };
  } finally {
    bitmap.close();
  }
}

/** Short per-tile label for failures that affect the whole batch. */
function shortReason(kind: string | null, status: number): string {
  if (kind === "quota") return "Kuota AI habis";
  if (kind === "auth") return "Akses API ditolak";
  if (kind === "credits" || status === 403) return "Kredit habis";
  return "Gagal";
}

export function BulkGenerator({
  supportsImages,
  imageHint,
}: {
  supportsImages: boolean;
  imageHint: string | null;
}) {
  const [theme, setTheme] = useState("");
  const [kind, setKind] = useState<BulkKind>("vector");
  const [count, setCount] = useState(10);
  const [mode, setMode] = useState<BulkMode>("metadata");
  const [items, setItems] = useState<BulkItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [credits, setCredits] = useState<CreditsState | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [submittedPrompt, setSubmittedPrompt] = useState("");
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
  const [submittedReferences, setSubmittedReferences] = useState<ReferenceImage[]>([]);
  const [aspectRatio, setAspectRatio] = useState<BulkAspectRatio>("1:1");
  const [resolution, setResolution] = useState<BulkResolution>(1024);
  const [searchQuery, setSearchQuery] = useState("");
  const referenceInputRef = useRef<HTMLInputElement>(null);

  const stopRef = useRef(false);
  const stopReasonRef = useRef<"credits" | "quota" | "auth" | "user" | null>(null);
  const urlsRef = useRef<string[]>([]);
  const submittedReferenceUrlsRef = useRef<string[]>([]);
  const lastRenderOptionsRef = useRef<RenderOptions | null>(null);

  const loadCredits = useCallback(async () => {
    try {
      const res = await fetch("/api/user/credits");
      if (res.ok) setCredits(await res.json());
    } catch {
      // ignore — the estimate line just stays hidden
    }
  }, []);

  useEffect(() => {
    loadCredits();
  }, [loadCredits]);

  const revokeUrls = useCallback(() => {
    urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    urlsRef.current = [];
  }, []);

  useEffect(() => revokeUrls, [revokeUrls]);

  const releaseSubmittedReferences = useCallback(() => {
    submittedReferenceUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    submittedReferenceUrlsRef.current = [];
  }, []);

  useEffect(() => releaseSubmittedReferences, [releaseSubmittedReferences]);

  const patch = useCallback((id: number, changes: Partial<BulkItem>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...changes } : item)));
  }, []);

  const renderOne = useCallback(
    async (item: BulkItem, options: RenderOptions) => {
      patch(item.id, { status: "running", error: undefined });

      // Up to 3 attempts with increasing back-off for transient 429/5xx errors.
      const MAX_ATTEMPTS = 3;
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        if (stopRef.current) {
          patch(item.id, { status: "pending" });
          return;
        }

        try {
          const res = await fetch("/api/bulk/image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt: item.prompt,
              kind: options.kind,
              title: item.title,
              keywords: item.keywords,
              category: item.category,
              aspectRatio: options.aspectRatio,
              resolution: options.resolution,
              referenceGuidance: options.referenceGuidance,
            }),
          });

          const data = await res.json();
          const errorKind = typeof data.kind === "string" ? (data.kind as string) : null;

          if (res.ok) {
            const blob = base64ToBlob(data.data, data.mime);
            const url = URL.createObjectURL(blob);
            urlsRef.current.push(url);
            patch(item.id, { status: "done", url, mime: data.mime });
            return;
          }

          // Permanent failures (out of credits, quota exhausted, bad key) apply
          // to every remaining item, so stop the whole queue instead of
          // hammering the API with requests that cannot succeed.
          const fatal = res.status === 403 || errorKind === "auth";

          // Hard quota (billing required) should also stop the whole queue.
          const hardQuota =
            errorKind === "quota" &&
            /limit.*0|billing|kuota harian/i.test(data.error ?? "");

          if (fatal || hardQuota) {
            stopRef.current = true;
            stopReasonRef.current =
              errorKind === "quota" ? "quota" : errorKind === "auth" ? "auth" : "credits";
            setError(data.error ?? "Batch dihentikan — tidak ada gambar yang bisa dirender.");
            patch(item.id, { status: "error", error: shortReason(errorKind, res.status) });
            return;
          }

          // Soft 429 (rate limit) — wait longer before retrying.
          if (res.status === 429 || errorKind === "quota") {
            if (attempt < MAX_ATTEMPTS - 1) {
              const waitMs = (attempt + 1) * 8000; // 8s, 16s
              patch(item.id, {
                status: "running",
                error: `Rate limit, menunggu ${waitMs / 1000}s…`,
              });
              await new Promise((resolve) => setTimeout(resolve, waitMs));
              continue;
            }
            patch(item.id, {
              status: "error",
              error: "Kuota atau rate limit penyedia AI tercapai (429). Tunggu sebentar lalu coba lagi.",
            });
            return;
          }

          if (attempt === MAX_ATTEMPTS - 1) {
            patch(item.id, { status: "error", error: data.error ?? "Gagal render" });
            return;
          }
        } catch {
          if (attempt === MAX_ATTEMPTS - 1) {
            patch(item.id, { status: "error", error: "Koneksi ke server gagal" });
            return;
          }
        }

        // Generic back-off before next attempt.
        await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1)));
      }
    },
    [patch]
  );

  const runQueue = useCallback(
    async (queue: BulkItem[], options: RenderOptions) => {
      const pending = [...queue];
      const workers = Math.min(CONCURRENCY, pending.length);

      await Promise.all(
        Array.from({ length: workers }, async () => {
          while (pending.length && !stopRef.current) {
            const next = pending.shift();
            if (!next) return;
            await renderOne(next, options);
            // Pause between requests to reduce provider rate-limit failures.
            if (pending.length > 0 && !stopRef.current) {
              await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY_MS));
            }
          }
        })
      );

      // Anything left behind (Stop pressed, credits/quota exhausted) gets a
      // clear status instead of sitting in the queue forever.
      const leftover =
        stopReasonRef.current === "credits"
          ? "Kredit habis"
          : stopReasonRef.current === "quota"
            ? "Kuota AI habis"
            : stopReasonRef.current === "auth"
              ? "API key ditolak"
              : "Dihentikan";

      setItems((prev) =>
        prev.map((item) =>
          item.status === "queued" || item.status === "running"
            ? { ...item, status: "error", error: leftover }
            : item
        )
      );
    },
    [renderOne]
  );

  async function handleGenerate() {
    if (busy) return;
    const prompt = theme.trim();
    if (prompt.length < 2) return;

    setBusy(true);
    setSubmittedPrompt(prompt);
    releaseSubmittedReferences();
    const submitted = referenceImages.map((image) => ({
      ...image,
      previewUrl: URL.createObjectURL(base64ToBlob(image.data, image.mimeType)),
    }));
    submittedReferenceUrlsRef.current = submitted.map((image) => image.previewUrl);
    setSubmittedReferences(submitted);
    setError(null);
    setNotice(null);
    stopRef.current = false;
    stopReasonRef.current = null;
    revokeUrls();
    setItems([]);
    lastRenderOptionsRef.current = null;

    try {
      const res = await fetch("/api/bulk/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theme: prompt,
          kind,
          count,
          referenceImages: mode === "image"
            ? referenceImages.map(({ mimeType, data }) => ({ mimeType, data }))
            : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal membuat ide.");

      const ideas = (data.ideas ?? []) as Array<Omit<BulkItem, "id" | "status">>;
      if (ideas.length === 0) throw new Error("AI tidak mengembalikan ide. Coba tema lain.");

      setTheme("");

      if (mode === "metadata") {
        setItems(ideas.map((idea, index) => ({ ...idea, id: index + 1, status: "done" })));
        setNotice(`${ideas.length} ide siap. Metadata bisa langsung diunduh sebagai CSV.`);
        return;
      }

      const list: BulkItem[] = ideas.map((idea, index) => ({
        ...idea,
        id: index + 1,
        status: "queued",
      }));
      setItems(list);

      const options: RenderOptions = {
        kind,
        aspectRatio,
        resolution,
        referenceGuidance: data.referenceGuidance,
      };
      lastRenderOptionsRef.current = options;
      await runQueue(list, options);

      setNotice(stopRef.current ? "Batch dihentikan." : `Selesai — ${list.length} ide diproses.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan. Coba lagi.");
    } finally {
      setBusy(false);
      loadCredits();
      window.dispatchEvent(new Event("credits:refresh"));
    }
  }

  async function handleRetryFailed() {
    const failed = items.filter((item) => item.status === "error");
    if (failed.length === 0 || busy) return;

    setBusy(true);
    setError(null);
    setNotice(null);
    stopRef.current = false;
    stopReasonRef.current = null;

    failed.forEach((item) => patch(item.id, { status: "queued", error: undefined }));
    await runQueue(failed, lastRenderOptionsRef.current ?? { kind, aspectRatio, resolution });

    setBusy(false);
    loadCredits();
    window.dispatchEvent(new Event("credits:refresh"));
  }

  function handleStop() {
    stopRef.current = true;
    stopReasonRef.current = "user";
    setNotice("Menghentikan setelah gambar yang sedang berjalan selesai…");
  }

  function downloadCsv() {
    const list = mode === "image" ? items.filter((item) => item.status === "done") : items;
    if (list.length === 0) return;

    // BOM keeps Excel from mangling non-ASCII keywords.
    const outputTheme = submittedPrompt || theme;
    const blob = new Blob(["\uFEFF" + buildCsv(outputTheme, list)], {
      type: "text/csv;charset=utf-8",
    });
    triggerDownload(blob, `stockai-${slugify(outputTheme)}-metadata.csv`);
  }

  function downloadImage(item: BulkItem) {
    if (!item.url) return;

    const anchor = document.createElement("a");
    anchor.href = item.url;
    anchor.download = fileName(submittedPrompt || theme, item.id, item.mime);
    anchor.click();
  }

  function openImage(item: BulkItem) {
    if (item.url) window.open(item.url, "_blank", "noopener,noreferrer");
  }

  async function handleReferenceFiles(files: FileList | null) {
    if (!files) return;
    const available = Math.max(0, 3 - referenceImages.length);
    if (files.length > available) {
      setError("Maksimal 3 gambar referensi.");
    }

    try {
      const prepared = await Promise.all(
        Array.from(files).slice(0, available).map(prepareReferenceImage)
      );
      setReferenceImages((current) => [...current, ...prepared].slice(0, 3));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gambar referensi gagal diproses.");
    }
  }

  function removeReferenceImage(image: ReferenceImage) {
    URL.revokeObjectURL(image.previewUrl);
    setReferenceImages((current) => current.filter((entry) => entry !== image));
  }

  function clearDraft() {
    setTheme("");
    referenceImages.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    setReferenceImages([]);
    setError(null);
    setNotice(null);
  }

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    if (!query) return items;
    return items.filter((item) =>
      [item.title, item.prompt, item.category, ...item.keywords]
        .join(" ")
        .toLocaleLowerCase()
        .includes(query)
    );
  }, [items, searchQuery]);

  const planned = Math.min(Math.max(Number(count) || 1, 1), MAX_COUNT);
  const done = items.filter((item) => item.status === "done").length;
  const failed = items.filter((item) => item.status === "error").length;
  const finished = done + failed;
  const progress = items.length > 0 ? Math.round((finished / items.length) * 100) : 0;

  const remaining = credits?.creditsRemaining ?? null;
  const shortOnCredits = mode === "image" && remaining !== null && planned > remaining;

  const modeOptions = useMemo(
    () => [
      {
        id: "metadata" as BulkMode,
        label: "Metadata saja",
        hint: "Gratis · 0 kredit",
        icon: FileSpreadsheet,
        disabled: false,
      },
      {
        id: "image" as BulkMode,
        label: "Render gambar",
        hint: "1 kredit / gambar",
        icon: ImagePlus,
        disabled: !supportsImages,
      },
    ],
    [supportsImages]
  );

  return (
    <div className="relative h-full px-5 pb-5 pt-4 lg:px-6 lg:pr-[356px]">
      <div className="mb-4 grid min-h-10 grid-cols-1 items-center gap-3 md:grid-cols-[1fr_minmax(240px,360px)_1fr]">
        <div>
          <h1 className="text-sm font-semibold text-white/90">Generator gambar</h1>
          <p className="mt-0.5 text-xs text-white/35">Generate dan kelola aset stock dari satu panel</p>
        </div>
        <label className="relative md:col-start-2 md:row-start-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Cari hasil gambar..."
            aria-label="Cari hasil gambar"
            className="h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.035] pl-9 pr-3 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-violet-500/40"
          />
        </label>
      </div>

      {/* ── Form ────────────────────────────────────────────── */}
      <aside className="flex flex-col border-white/[0.07] bg-[#0d0d0f] p-4 lg:fixed lg:bottom-0 lg:right-0 lg:top-0 lg:z-20 lg:w-[340px] lg:border-l">
        <div className="mb-4 flex h-10 items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-white/55 hover:bg-white/[0.06] hover:text-white"
              aria-label="Menu chat"
            >
              <Menu className="h-4 w-4" />
            </button>
            <p className="text-[15px] font-semibold text-white/90">Sesi tanpa judul</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                clearDraft();
                releaseSubmittedReferences();
                setSubmittedReferences([]);
                setSubmittedPrompt("");
                setItems([]);
                lastRenderOptionsRef.current = null;
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-white/45 hover:bg-white/[0.06] hover:text-white"
              aria-label="Buat sesi baru"
              title="Sesi baru"
            >
              <Edit3 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={clearDraft}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-white/45 hover:bg-white/[0.06] hover:text-white"
              aria-label="Tutup prompt"
              title="Tutup"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {items.length === 0 && !busy && (
            <div className="flex h-full flex-col items-center pt-[12vh]">
              <div className="mb-12 text-center">
                <p className="text-[22px] font-medium text-white/20">Halo</p>
                <p className="mt-3 max-w-[240px] text-[22px] font-medium leading-[1.35] text-white/20">
                  Apa yang ingin Anda buat?
                </p>
              </div>

              <div className="w-full space-y-2">
                {[
                  { label: "Kembangkan storyboard", icon: "◩" },
                  { label: "Buat beberapa versi gambar", icon: "▦" },
                  { label: "Mari kita berdiskusi", icon: "◉" },
                ].map((suggestion) => (
                  <button
                    key={suggestion.label}
                    type="button"
                    onClick={() => setTheme(suggestion.label)}
                    className="flex h-[70px] w-full items-center gap-4 rounded-xl border border-white/[0.035] bg-white/[0.035] px-4 text-left text-[13px] font-medium text-white/75 transition-colors hover:border-white/[0.08] hover:bg-white/[0.06]"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-black/20 text-lg text-violet-200">
                      {suggestion.icon}
                    </span>
                    <span>{suggestion.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {(submittedPrompt || items.length > 0) && (
            <div className="px-1 pt-3">
              <div className="ml-auto max-w-[280px] rounded-2xl rounded-tr-md bg-violet-500/10 px-3.5 py-2.5 text-sm leading-relaxed text-white/75">
                {submittedPrompt}
                {submittedReferences.length > 0 && (
                  <div className="mt-2 flex gap-1.5">
                    {submittedReferences.map((image) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={image.previewUrl} src={image.previewUrl} alt="Gambar referensi yang dikirim" className="h-12 w-12 rounded-md object-cover" />
                    ))}
                  </div>
                )}
              </div>
              {items.length > 0 && <div className="mt-3 rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-3 text-xs text-white/45">
                {done}/{items.length} hasil selesai
                {failed > 0 ? ` · ${failed} gagal` : ""}
              </div>}
            </div>
          )}
        </div>

        <div className="relative border-t border-white/[0.06] pt-3">
          {showSettings && (
            <div className="absolute bottom-[58px] left-0 right-0 z-30 max-h-[70vh] overflow-y-auto rounded-xl border border-white/[0.09] bg-[#17171a] p-3 shadow-2xl">
              {!supportsImages && imageHint && (
                <p className="mb-3 text-[11px] leading-relaxed text-amber-200/80">{imageHint}</p>
              )}
              <div className="mb-3 grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1.5 block text-[11px] text-white/40">Tipe aset</label>
                  <select
                    className="w-full rounded-lg border border-white/[0.08] bg-[#111114] px-2.5 py-2 text-xs text-white outline-none"
                    value={kind}
                    onChange={(event) => setKind(event.target.value as BulkKind)}
                  >
                    <option value="vector">Vector</option>
                    <option value="photo">Foto</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] text-white/40">Jumlah</label>
                  <input
                    type="number"
                    min={1}
                    max={MAX_COUNT}
                    className="w-full rounded-lg border border-white/[0.08] bg-[#111114] px-2.5 py-2 text-xs text-white outline-none"
                    value={count}
                    onChange={(event) => setCount(Number(event.target.value))}
                  />
                </div>
              </div>
              <div className="mb-3 grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1.5 block text-[11px] text-white/40">Rasio gambar</label>
                  <select
                    className="w-full rounded-lg border border-white/[0.08] bg-[#111114] px-2.5 py-2 text-xs text-white outline-none"
                    value={aspectRatio}
                    onChange={(event) => setAspectRatio(event.target.value as BulkAspectRatio)}
                  >
                    {(["1:1", "4:3", "3:2", "16:9", "3:4", "2:3", "9:16"] as const).map((ratio) => (
                      <option key={ratio} value={ratio}>{ratio}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] text-white/40">Resolusi sisi panjang</label>
                  <select
                    className="w-full rounded-lg border border-white/[0.08] bg-[#111114] px-2.5 py-2 text-xs text-white outline-none"
                    value={resolution}
                    onChange={(event) => setResolution(Number(event.target.value) as BulkResolution)}
                  >
                    {[512, 768, 1024, 1536, 2048].map((size) => (
                      <option key={size} value={size}>{size}px</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {modeOptions.map((option) => {
                  const active = mode === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      disabled={option.disabled || busy}
                      onClick={() => setMode(option.id)}
                      className={cn(
                        "rounded-lg border px-2 py-2 text-xs transition-colors disabled:opacity-40",
                        active ? "border-violet-500/40 bg-violet-500/10 text-violet-200" : "border-white/[0.08] text-white/50"
                      )}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {referenceImages.length > 0 && (
            <div className="mb-2 flex items-center gap-2 overflow-x-auto">
              <span className="shrink-0 text-[10px] text-white/35">Referensi</span>
              {referenceImages.map((image) => (
                <div key={image.previewUrl} className="group relative h-14 w-14 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.previewUrl} alt={image.name} className="h-full w-full rounded-lg object-cover" />
                  <button
                    type="button"
                    onClick={() => removeReferenceImage(image)}
                    aria-label={`Hapus referensi ${image.name}`}
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/90 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {referenceImages.length > 0 && (
            <p className="mb-1 text-[10px] text-white/30">
              {mode === "image"
                ? "Gambar dikirim ke Gemini untuk analisis gaya dan komposisi."
                : "Pilih Render Gambar untuk menggunakan referensi ini."}
            </p>
          )}
          <input
            ref={referenceInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(event) => {
              void handleReferenceFiles(event.target.files);
              event.target.value = "";
            }}
          />
          <textarea
            className="h-[62px] w-full resize-none bg-transparent px-1 pt-1 text-sm text-white outline-none placeholder:text-white/35"
            placeholder="Apa yang ingin Anda buat?"
            value={theme}
            maxLength={200}
            onChange={(event) => setTheme(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && theme.trim().length >= 2 && !busy) {
                event.preventDefault();
                handleGenerate();
              }
            }}
          />

          <div className="grid grid-cols-[44px_44px_44px_1fr] items-center gap-1.5">
          <button
            type="button"
            onClick={() => referenceInputRef.current?.click()}
            disabled={referenceImages.length >= 3 || busy}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-white/45 hover:bg-white/[0.05] hover:text-white disabled:opacity-30"
            aria-label="Tambah gambar referensi"
            title="Tambah gambar referensi"
          >
            <Plus className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-white/45 hover:bg-white/[0.05] hover:text-white"
            aria-label="Mode render"
          >
            <Sparkles className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setShowSettings((current) => !current)}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
              showSettings ? "bg-violet-500/10 text-violet-300" : "text-white/45 hover:bg-white/[0.05] hover:text-white"
            )}
            aria-label="Pengaturan"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={busy || theme.trim().length < 2}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-violet-300 transition-colors hover:bg-violet-500/10 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Generate"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
            </button>
          </div>
          </div>
        </div>

        {shortOnCredits && (
          <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-amber-950/40 border border-amber-500/20 text-sm text-amber-300">
            <TriangleAlert className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              Kredit cuma cukup untuk {remaining} gambar — sisanya akan gagal.{" "}
              <Link href="/dashboard/billing" className="underline hover:text-amber-200">
                Upgrade plan
              </Link>
              .
            </span>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-red-950/50 border border-red-500/20 text-sm text-red-400">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {busy && mode === "image" && (
          <button
            type="button"
            onClick={handleStop}
            className="mt-2 flex h-10 items-center justify-center gap-2 rounded-lg border border-white/[0.12] text-xs text-white/60 hover:border-white/25 hover:text-white"
          >
            <Square className="h-3 w-3" />
            Stop
          </button>
        )}
        {notice && !busy && (
          <span className="mt-2 flex items-center gap-1.5 text-xs text-white/40">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400/70" />
            {notice}
          </span>
        )}
      </aside>

      {/* ── Results ─────────────────────────────────────────── */}
      {items.length > 0 && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 sm:p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-white/60">
                <Layers className="w-4 h-4 text-violet-300" />
                <span>
                  {done}/{items.length} selesai
                  {failed > 0 && <span className="text-red-400/80"> · {failed} gagal</span>}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {failed > 0 && !busy && (
                  <button
                    type="button"
                    onClick={handleRetryFailed}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.12] text-xs text-white/60 hover:text-white hover:border-white/25 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Ulangi yang gagal
                  </button>
                )}

                <button
                  type="button"
                  onClick={downloadCsv}
                  disabled={done === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.12] text-xs text-white/60 hover:text-white hover:border-white/25 disabled:opacity-40 transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  CSV
                </button>

              </div>
            </div>

            {mode === "image" && (
              <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>

          {mode === "image" ? (
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-3 2xl:grid-cols-4">
              {filteredItems.map((item) => (
                <div key={item.id} className="group relative">
                  <div className="relative aspect-square overflow-hidden rounded-xl bg-white/[0.04]">
                    {item.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.url}
                        alt={item.title}
                        className="h-full w-full bg-white object-contain"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center px-3 text-center text-[11px] leading-relaxed text-white/40">
                        {item.status === "error" ? (
                          <span className="text-red-400/80">{item.error}</span>
                        ) : item.status === "running" ? (
                          <span className="flex items-center gap-1.5">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Rendering…
                          </span>
                        ) : (
                          "Antre"
                        )}
                      </span>
                    )}
                    {item.url && (
                      <div className="absolute inset-0 flex items-end justify-end gap-2 bg-gradient-to-t from-black/70 via-black/10 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                        <button
                          type="button"
                          onClick={() => openImage(item)}
                          aria-label={`Buka gambar ${item.title}`}
                          title="Buka gambar"
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-black/50 text-white transition-colors hover:bg-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadImage(item)}
                          aria-label={`Unduh gambar ${item.title}`}
                          title="Unduh gambar"
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-black/50 text-white transition-colors hover:bg-violet-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-medium text-white">
                      {String(item.id).padStart(2, "0")}. {item.title}
                    </h3>
                    <span className="shrink-0 text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20">
                      {item.category}
                    </span>
                  </div>
                  <p className="text-xs text-white/40 leading-relaxed">{item.prompt}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {item.keywords.map((keyword) => (
                      <span
                        key={keyword}
                        className="text-[11px] px-2 py-0.5 rounded-md bg-white/[0.04] text-white/50"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          {filteredItems.length === 0 && (
            <p className="rounded-xl border border-dashed border-white/[0.08] p-8 text-center text-sm text-white/40">
              Tidak ada hasil yang cocok dengan pencarian.
            </p>
          )}
        </div>
      )}

      {items.length === 0 && !busy && (
        <div className="rounded-2xl border border-dashed border-white/[0.08] p-10 text-center">
          <Sparkles className="w-5 h-5 text-violet-400/60 mx-auto mb-3" />
          <p className="text-sm text-white/50">
            Tulis satu tema, pilih jumlah, lalu generate.
          </p>
          <p className="text-xs text-white/30 mt-1">
            Setiap ide berisi judul, prompt render, 25 keyword, dan kategori Adobe Stock.
          </p>
        </div>
      )}
    </div>
  );
}
