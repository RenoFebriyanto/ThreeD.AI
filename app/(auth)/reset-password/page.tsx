// src/app/(auth)/reset-password/page.tsx
"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const linkInvalid = !email || !token;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Password dan konfirmasi tidak sama.");
      return;
    }
    if (password.length < 8) {
      setError("Password minimal 8 karakter.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Gagal mereset password. Coba lagi.");
        setLoading(false);
        return;
      }

      setDone(true);
      setTimeout(() => router.push("/login"), 2000);
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
          <h1 className="text-2xl font-bold text-white mb-1">Atur ulang password</h1>
          <p className="text-sm text-white/40">Buat password baru untuk akun kamu.</p>
        </div>

        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-7">
          {linkInvalid ? (
            <div className="text-center py-2 space-y-3">
              <p className="text-sm text-white/70">Link reset tidak valid atau tidak lengkap.</p>
              <Link href="/forgot-password" className="inline-block text-sm text-violet-400 hover:text-violet-300">
                Minta link reset baru →
              </Link>
            </div>
          ) : done ? (
            <div className="text-center py-2">
              <p className="text-sm text-white/70">Password berhasil diubah. Mengarahkan ke halaman masuk...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="px-4 py-3 rounded-lg bg-red-950/50 border border-red-500/20 text-sm text-red-400">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-xs text-white/40 mb-1.5">Password baru</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                  className="w-full px-3.5 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-violet-500/50"
                  placeholder="Minimal 8 karakter" />
              </div>
              <div>
                <label className="block text-xs text-white/40 mb-1.5">Konfirmasi password</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required
                  className="w-full px-3.5 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-violet-500/50"
                  placeholder="••••••••" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-colors">
                {loading ? "Menyimpan..." : "Simpan password baru"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
