// app/dashboard/history/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight, History, ImageIcon } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Riwayat" };

const PAGE_SIZE = 20;

const TYPE_STYLES: Record<string, string> = {
  vector: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  photo: "bg-sky-500/10 text-sky-300 border-sky-500/20",
  video: "bg-amber-500/10 text-amber-300 border-amber-500/20",
  batch: "bg-violet-500/10 text-violet-300 border-violet-500/20",
};

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

/** Pulls a human-friendly title out of the stored output JSON. */
function readTitle(output: unknown): string {
  const record = (output ?? {}) as Record<string, unknown>;

  if (typeof record.title === "string" && record.title.trim()) return record.title.trim();

  const ideas = record.ideas;
  if (Array.isArray(ideas) && ideas.length > 0) {
    const first = ideas[0] as Record<string, unknown> | null;
    if (first && typeof first.title === "string") return first.title;
    return `${ideas.length} ide`;
  }

  if (typeof record.prompt === "string") return record.prompt;

  return "(tanpa judul)";
}

function readKeywordCount(output: unknown): number {
  const record = (output ?? {}) as Record<string, unknown>;
  return Array.isArray(record.keywords) ? record.keywords.length : 0;
}

function readMode(input: unknown): string | null {
  const record = (input ?? {}) as Record<string, unknown>;
  return record.mode === "bulk" ? "Bulk render" : null;
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;
  const requested = Number(searchParams.page);
  const page = Number.isFinite(requested) && requested > 0 ? Math.floor(requested) : 1;

  const [items, total] = await Promise.all([
    prisma.generation.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.generation.count({ where: { userId } }),
  ]);

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);
  const firstOnPage = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastOnPage = Math.min(page * PAGE_SIZE, total);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight mb-1">Riwayat</h1>
        <p className="text-sm text-white/40">
          Semua generation yang pernah kamu jalankan. Metadata disimpan, gambar tidak.
        </p>
      </div>

      {total === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/[0.08] p-12 text-center">
          <History className="w-5 h-5 text-white/30 mx-auto mb-3" />
          <p className="text-sm text-white/50">Belum ada riwayat.</p>
          <Link
            href="/dashboard"
            className="inline-block mt-3 text-xs text-violet-400 hover:text-violet-300"
          >
            Mulai generate →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-white/35">
            Menampilkan {firstOnPage}–{lastOnPage} dari {total} generation
          </p>

          <div className="space-y-2">
            {items.map((item) => {
              const title = readTitle(item.output);
              const keywordCount = readKeywordCount(item.output);
              const mode = readMode(item.input);

              return (
                <details
                  key={item.id}
                  className="group rounded-xl border border-white/[0.07] bg-white/[0.02] overflow-hidden"
                >
                  <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors">
                    <ImageIcon className="w-4 h-4 text-white/30 shrink-0" />

                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white/80 truncate">{title}</p>
                      <p className="text-[11px] text-white/35 mt-0.5">
                        {formatDate(item.createdAt)}
                        {keywordCount > 0 && ` · ${keywordCount} keyword`}
                        {mode && ` · ${mode}`}
                      </p>
                    </div>

                    <span
                      className={cn(
                        "shrink-0 text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border",
                        TYPE_STYLES[item.type] ?? "bg-white/[0.04] text-white/50 border-white/10"
                      )}
                    >
                      {item.type}
                    </span>
                  </summary>

                  <div className="border-t border-white/[0.06] px-4 py-3 bg-black/20">
                    <p className="text-[10px] uppercase tracking-wide text-white/30 mb-1.5">
                      Output
                    </p>
                    <pre className="text-[11px] leading-relaxed text-white/50 whitespace-pre-wrap break-words max-h-72 overflow-auto">
                      {JSON.stringify(item.output, null, 2)}
                    </pre>
                  </div>
                </details>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <Link
                href={`/dashboard/history?page=${page - 1}`}
                aria-disabled={page <= 1}
                className={cn(
                  "flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs transition-colors",
                  page <= 1
                    ? "pointer-events-none opacity-30 border-white/[0.08] text-white/40"
                    : "border-white/[0.12] text-white/60 hover:text-white hover:border-white/25"
                )}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Sebelumnya
              </Link>

              <span className="text-xs text-white/35">
                Halaman {page} / {totalPages}
              </span>

              <Link
                href={`/dashboard/history?page=${page + 1}`}
                aria-disabled={page >= totalPages}
                className={cn(
                  "flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs transition-colors",
                  page >= totalPages
                    ? "pointer-events-none opacity-30 border-white/[0.08] text-white/40"
                    : "border-white/[0.12] text-white/60 hover:text-white hover:border-white/25"
                )}
              >
                Berikutnya
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
