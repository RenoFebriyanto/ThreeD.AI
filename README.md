# StockAI — Update Batch 2: AI Provider Abstraction (Gemini + Anthropic)

## Yang berubah

Sebelumnya, app langsung manggil Anthropic API lewat `lib/anthropic.ts`. Sekarang ada
lapisan abstraksi di `lib/ai/` yang bisa switch provider lewat **satu env var**, tanpa
ubah kode lagi nanti.

```
lib/ai/
├── shared.ts              ← types + prompt builder + JSON parser (dipakai kedua provider)
├── anthropic-provider.ts  ← implementasi Claude (logic lama dari lib/anthropic.ts)
├── gemini-provider.ts     ← implementasi Gemini (BARU — gratis untuk development)
└── index.ts                ← pemilih provider berdasarkan env var AI_PROVIDER
```

`app/api/generate/route.ts` sekarang import dari `@/lib/ai` (bukan `@/lib/anthropic`
lagi), tapi nama fungsinya tetap sama (`generateVector`, `generateImage`, dst) — jadi
tidak ada perubahan lain yang dibutuhkan di route itu sendiri.

## ⚠️ Langkah wajib: hapus file lama

`lib/anthropic.ts` **sudah tidak dipakai** dan digantikan oleh `lib/ai/anthropic-provider.ts`.
**Hapus file `lib/anthropic.ts` secara manual** di repo kamu — kalau dibiarkan, isinya jadi
dead code yang membingungkan (tidak akan error, tapi sebaiknya dibersihkan).

```powershell
Remove-Item lib\anthropic.ts
```

## Cara pakai Gemini (gratis)

1. Buka **https://aistudio.google.com/app/apikey**
2. Login dengan akun Google → **Create API Key** → copy key-nya
3. Di `.env`, tambahkan:
   ```env
   AI_PROVIDER="gemini"
   GEMINI_API_KEY="isi_key_dari_ai_studio"
   ```
4. Install dependency baru:
   ```powershell
   npm install
   ```
5. Restart dev server:
   ```powershell
   npm run dev
   ```
6. Coba klik Generate lagi di dashboard — sekarang akan manggil Gemini, bukan Claude.

## Cara balik ke Anthropic nanti (kalau sudah top-up)

Tinggal ubah satu baris di `.env`, tidak perlu ubah kode:
```env
AI_PROVIDER="anthropic"
```
Pastikan `ANTHROPIC_API_KEY` juga masih terisi. Restart dev server.

## Penting soal Gemini free tier

- **Model yang dipakai**: `gemini-2.5-flash` — model stabil (bukan preview), termasuk
  yang masih gratis per kebijakan Google saat ini.
- **Limit free tier**: sekitar 1.500 request/hari, 15 request/menit (bisa berubah
  sewaktu-waktu oleh Google — cek limit aktual di Google AI Studio kamu).
- **Privasi**: di free tier, prompt & output kamu boleh dipakai Google untuk
  improvement model mereka. Jangan generate data sensitif/rahasia lewat free tier.
- Limit dihitung **per Google Cloud project**, bukan per API key — bikin banyak API
  key tidak menambah kuota.
- Untuk production dengan banyak user nanti, kamu tetap perlu enable billing (baik
  di Gemini maupun Anthropic) — model freemium: user plan berbayar (STARTER/PRO)
  yang menutup biaya API dari semua tier termasuk user FREE.

## File yang berubah di batch ini

| File | Perubahan |
|---|---|
| `lib/ai/shared.ts` | **Baru.** Types, prompt builder, JSON parser — dipakai kedua provider |
| `lib/ai/anthropic-provider.ts` | **Baru.** Logic Claude (dipindah dari `lib/anthropic.ts`) |
| `lib/ai/gemini-provider.ts` | **Baru.** Logic Gemini |
| `lib/ai/index.ts` | **Baru.** Pemilih provider via `AI_PROVIDER` env var |
| `lib/anthropic.ts` | **Dihapus** — hapus manual di repo kamu |
| `app/api/generate/route.ts` | Import diubah ke `@/lib/ai` |
| `package.json` | Tambah dependency `@google/genai` |
| `.env.example` | Dokumentasi `AI_PROVIDER` dan `GEMINI_API_KEY` |

File lain di paket ini (`app/layout.tsx`, `lib/stripe.ts`, dst) sama seperti batch
sebelumnya — disertakan ulang karena ada di hasil `git status`, tapi isinya sudah
pernah kamu terima. Boleh diabaikan kalau sudah di-apply sebelumnya.

## Catatan teknis

- Kalau `AI_PROVIDER` diisi nilai selain `"anthropic"` atau `"gemini"` (misal typo),
  app akan **throw error jelas saat startup**: `Unknown AI_PROVIDER "xxx". Valid
  options: anthropic, gemini.` — sengaja dibuat gagal cepat & jelas daripada diam-diam
  pakai default yang salah.
- Saya tidak menyertakan `package-lock.json` di paket ini — jalankan `npm install` di
  komputer kamu supaya lockfile ter-generate ulang sesuai platform kamu sendiri.
