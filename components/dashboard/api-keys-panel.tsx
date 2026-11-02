// components/dashboard/api-keys-panel.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, Check, Copy, Loader2, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ApiKeyRecord {
  id: string;
  name: string;
  key: string;
  lastUsed: string | null;
  usageCount: number;
  isActive: boolean;
  createdAt: string;
}

/** Mirrors the limits enforced in app/api/user/api-keys/route.ts */
const PLAN_LIMITS: Record<string, number> = { FREE: 0, STARTER: 1, PRO: 5, ENTERPRISE: 999 };

const inputClass =
  "w-full px-3.5 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-violet-500/50 transition-colors";

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(iso));
}

function maskKey(key: string): string {
  if (key.length <= 16) return key;
  return `${key.slice(0, 14)}${"•".repeat(8)}${key.slice(-4)}`;
}

export function ApiKeysPanel() {
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [plan, setPlan] = useState<string>("FREE");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [keysRes, creditsRes] = await Promise.all([
        fetch("/api/user/api-keys"),
        fetch("/api/user/credits"),
      ]);

      if (keysRes.ok) {
        const data = await keysRes.json();
        setKeys(data.keys ?? []);
      }
      if (creditsRes.ok) {
        const data = await creditsRes.json();
        setPlan(data.plan ?? "FREE");
      }
    } catch {
      setError("Gagal memuat API key.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const limit = PLAN_LIMITS[plan] ?? 0;
  const activeCount = keys.filter((key) => key.isActive).length;
  const canCreate = plan === "ENTERPRISE" || activeCount < limit;

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (creating || name.trim().length === 0) return;

    setCreating(true);
    setError(null);

    try {
      const res = await fetch("/api/user/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Gagal membuat API key.");
        return;
      }

      setName("");
      await load();
    } catch {
      setError("Gagal terhubung ke server.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string, keyName: string) {
    if (!window.confirm(`Hapus API key "${keyName}"? Aplikasi yang memakainya akan langsung berhenti bekerja.`)) {
      return;
    }

    setDeletingId(id);
    setError(null);

    try {
      const res = await fetch(`/api/user/api-keys?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Gagal menghapus API key.");
        return;
      }
      await load();
    } catch {
      setError("Gagal terhubung ke server.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleCopy(record: ApiKeyRecord) {
    await navigator.clipboard.writeText(record.key);
    setCopiedId(record.id);
    setTimeout(() => setCopiedId((current) => (current === record.id ? null : current)), 1500);
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-white/70">
              {activeCount} / {limit === 999 ? "∞" : limit} key aktif
            </p>
            <p className="text-xs text-white/35 mt-0.5">Plan {plan}</p>
          </div>

          {!canCreate && (
            <Link
              href="/dashboard/billing"
              className="text-xs text-violet-400 hover:text-violet-300"
            >
              Upgrade untuk menambah key →
            </Link>
          )}
        </div>

        <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-2">
          <input
            className={inputClass}
            placeholder="Nama key, contoh: integrasi n8n"
            value={name}
            maxLength={50}
            disabled={!canCreate || creating}
            onChange={(event) => setName(event.target.value)}
          />
          <button
            type="submit"
            disabled={!canCreate || creating || name.trim().length === 0}
            className="shrink-0 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Buat key
          </button>
        </form>

        {!canCreate && (
          <p className="text-xs text-amber-400/80">
            Plan {plan} belum bisa membuat API key.
          </p>
        )}

        {error && (
          <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-red-950/50 border border-red-500/20 text-sm text-red-400">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            {error}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-white/40 px-1">
          <Loader2 className="w-4 h-4 animate-spin" />
          Memuat…
        </div>
      ) : keys.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/[0.08] p-10 text-center">
          <p className="text-sm text-white/50">Belum ada API key.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {keys.map((record) => (
            <div
              key={record.id}
              className={cn(
                "rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 flex items-center gap-3",
                !record.isActive && "opacity-50"
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm text-white/80 truncate">{record.name}</p>
                <p className="font-mono text-[11px] text-white/35 mt-0.5 truncate">
                  {maskKey(record.key)}
                </p>
                <p className="text-[11px] text-white/30 mt-1">
                  Dibuat {formatDate(record.createdAt)} · {record.usageCount}x dipakai
                  {record.lastUsed && ` · terakhir ${formatDate(record.lastUsed)}`}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleCopy(record)}
                className="shrink-0 p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors"
                aria-label="Salin API key"
                title="Salin"
              >
                {copiedId === record.id ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>

              <button
                type="button"
                onClick={() => handleDelete(record.id, record.name)}
                disabled={deletingId === record.id}
                className="shrink-0 p-2 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-40 transition-colors"
                aria-label="Hapus API key"
                title="Hapus"
              >
                {deletingId === record.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
