// src/app/page.tsx
import Link from "next/link";
import { PLANS, formatIDR } from "@/types";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/[0.06] bg-[#0A0A0B]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-xs font-bold">S</div>
            <span className="font-semibold tracking-tight">StockAI</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-white/60">
            <a href="#features" className="hover:text-white transition-colors">Fitur</a>
            <a href="#pricing" className="hover:text-white transition-colors">Harga</a>
            <a href="#how" className="hover:text-white transition-colors">Cara kerja</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-white/60 hover:text-white transition-colors">Masuk</Link>
            <Link href="/register" className="px-4 py-2 text-sm font-medium bg-white text-black rounded-lg hover:bg-white/90 transition-colors">
              Mulai gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-40 pb-24 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-violet-950/30 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-violet-600/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 text-xs font-medium mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            Powered by Claude AI (Anthropic)
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.05] mb-6">
            Generate aset Adobe Stock
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-purple-300">
              dalam hitungan detik
            </span>
          </h1>

          <p className="text-lg text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed">
            Buat prompt, keywords, dan metadata profesional untuk vector, foto, ilustrasi,
            dan video stock — siap upload ke Adobe Stock.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/register" className="px-8 py-3.5 bg-white text-black font-semibold rounded-xl hover:bg-white/90 transition-all hover:scale-[1.02] active:scale-[0.98]">
              Coba gratis sekarang
            </Link>
            <Link href="#how" className="px-8 py-3.5 border border-white/10 rounded-xl text-white/70 hover:text-white hover:border-white/20 transition-colors">
              Lihat cara kerja
            </Link>
          </div>

          <p className="mt-5 text-sm text-white/30">10 generate gratis · Tanpa kartu kredit</p>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 border-y border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { num: "20+", label: "Keywords per generate" },
            { num: "4", label: "Tipe aset didukung" },
            { num: "<5s", label: "Waktu generate rata-rata" },
            { num: "100%", label: "AI-powered output" },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-3xl font-bold text-white mb-1">{s.num}</div>
              <div className="text-sm text-white/40">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-sm text-violet-400 font-medium mb-3">Fitur lengkap</div>
            <h2 className="text-4xl font-bold tracking-tight">Semua yang kamu butuhkan</h2>
            <p className="text-white/40 mt-3 max-w-xl mx-auto">Dari satu konsep singkat, dapatkan paket aset lengkap yang siap upload.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: "🎨", title: "Vector / SVG", desc: "Flat design, geometric, mandala, pattern, icon set — lengkap dengan prompt Firefly & Midjourney." },
              { icon: "📷", title: "Foto & Ilustrasi", desc: "Photography, digital art, watercolor, 3D render — dengan mood, orientasi, dan lighting yang presisi." },
              { icon: "🎬", title: "Video & Motion", desc: "Production brief, AI video prompt untuk Sora & Runway, specs 4K, frame rate, dan codec." },
              { icon: "💡", title: "Batch Ideas", desc: "Generate 5–20 ide aset high-demand sekaligus dari satu niche. Cocok untuk riset pasar." },
              { icon: "🔑", title: "API Access", desc: "Integrasikan ke workflow kamu dengan REST API. Tersedia di plan Starter ke atas." },
              { icon: "📊", title: "History & Analytics", desc: "Lacak semua generate, lihat output, dan export ke JSON atau CSV untuk keperluan produksi." },
            ].map((f) => (
              <div key={f.title} className="p-6 rounded-2xl border border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-24 px-6 border-t border-white/[0.06]">
        <div className="max-w-4xl mx-auto text-center">
          <div className="text-sm text-violet-400 font-medium mb-3">Cara kerja</div>
          <h2 className="text-4xl font-bold tracking-tight mb-16">3 langkah, aset siap upload</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Pilih tipe aset", desc: "Vector, foto, video, atau batch ideas. Isi konsep dan preferensi style kamu." },
              { step: "02", title: "AI generate otomatis", desc: "Claude AI membuat prompt, 20 keywords, deskripsi, dan sales tip dalam hitungan detik." },
              { step: "03", title: "Upload ke Adobe Stock", desc: "Copy output langsung ke dashboard Adobe Stock. Done — aset siap dijual." },
            ].map((s) => (
              <div key={s.step} className="text-left">
                <div className="text-sm font-mono text-violet-400 mb-4">{s.step}</div>
                <h3 className="font-semibold text-lg mb-2">{s.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6 border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-sm text-violet-400 font-medium mb-3">Harga</div>
            <h2 className="text-4xl font-bold tracking-tight">Mulai gratis, upgrade kapan saja</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {PLANS.map((plan) => (
              <div key={plan.id} className={`p-6 rounded-2xl border ${plan.id === "PRO" ? "border-violet-500/50 bg-violet-950/30" : "border-white/[0.07] bg-white/[0.02]"} relative`}>
                {plan.id === "PRO" && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-violet-500 rounded-full text-xs font-semibold">
                    Populer
                  </div>
                )}
                <div className="text-sm text-white/40 mb-1">{plan.name}</div>
                {plan.priceMonthly > 0 ? (
                  <div className="text-3xl font-bold mb-1">
                    {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(plan.priceMonthly)}
                    <span className="text-sm font-normal text-white/30">/bln</span>
                  </div>
                ) : plan.id === "ENTERPRISE" ? (
                  <div className="text-3xl font-bold mb-1">Custom</div>
                ) : (
                  <div className="text-3xl font-bold mb-1">Gratis</div>
                )}
                <div className="text-xs text-white/30 mb-6">
                  {plan.credits < 999999 ? `${plan.credits} generate/bulan` : "Unlimited generate"}
                </div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="text-sm text-white/60 flex items-start gap-2">
                      <span className="text-violet-400 mt-0.5 shrink-0">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Link href={plan.id === "ENTERPRISE" ? "mailto:hello@stockai.id" : plan.id === "FREE" ? "/register" : `/register?plan=${plan.id.toLowerCase()}`}
                  className={`block text-center py-2.5 rounded-lg text-sm font-medium transition-colors ${plan.id === "PRO" ? "bg-violet-500 text-white hover:bg-violet-400" : "border border-white/10 hover:bg-white/5"}`}>
                  {plan.id === "FREE" ? "Mulai gratis" : plan.id === "ENTERPRISE" ? "Hubungi kami" : "Pilih plan"}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 text-center border-t border-white/[0.06]">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-4xl font-bold tracking-tight mb-4">Siap mulai generate?</h2>
          <p className="text-white/40 mb-8">10 generate gratis untuk semua akun baru. Tanpa kartu kredit.</p>
          <Link href="/register" className="inline-block px-10 py-4 bg-white text-black font-semibold rounded-xl hover:bg-white/90 transition-colors">
            Buat akun gratis
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-white/30">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-[10px] font-bold text-white">S</div>
            <span>StockAI</span>
          </div>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-white transition-colors">Privasi</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Syarat</Link>
            <a href="mailto:hello@stockai.id" className="hover:text-white transition-colors">Kontak</a>
          </div>
          <p>© {new Date().getFullYear()} StockAI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}