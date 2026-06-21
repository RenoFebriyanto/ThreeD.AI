// src/app/(auth)/forgot-password/page.tsx
"use client";
import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Terjadi kesalahan. Coba lagi.");
        setLoading(false);
        return;
      }

      // API always returns a generic success regardless of whether the
      // email exists, so we just show the confirmation state.
      setSent(true);
    } catch {
      setError("Gagal terhubung ke server. Periksa koneksi kamu.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-sm font-bold">S</div>
            <span className="font-semibold text-white">StockAI</span>
          </Link>
          <h1 className="text-2xl font-bold text-white mb-1">Lupa password?</h1>
          <p className="text-sm text-white/40">Masukkan email kamu, kami kirimkan link reset.</p>
        </div>

        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-7">
          {sent ? (
            <div className="text-center py-2">
              <p className="text-sm text-white/70 leading-relaxed">
                Jika <span className="text-white">{email}</span> terdaftar, kami sudah
                mengirim link reset password ke email tersebut. Cek inbox atau folder spam kamu.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="px-4 py-3 rounded-lg bg-red-950/50 border border-red-500/20 text-sm text-red-400">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-xs text-white/40 mb-1.5">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  className="w-full px-3.5 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-violet-500/50"
                  placeholder="email@kamu.com" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-colors">
                {loading ? "Mengirim..." : "Kirim link reset"}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-white/30 mt-6">
          <Link href="/login" className="text-violet-400 hover:text-violet-300">← Kembali ke masuk</Link>
        </p>
      </div>
    </div>
  );
}
