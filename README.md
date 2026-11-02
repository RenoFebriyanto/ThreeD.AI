# StockAI — Bulk Generator untuk Adobe Stock

Satu tema masuk, banyak aset siap upload keluar: judul, prompt render, 25 keyword,
kategori Adobe Stock, dan (opsional) gambar yang bisa diunduh satu per satu.

```
Tema ──► N ide (metadata) ──► N gambar ──► Unduh gambar satu per satu + metadata.csv
```

## Fitur

| Fitur | Keterangan |
|---|---|
| **Bulk Generator** | 1 tema → hingga 20 ide berbeda, lalu render gambarnya paralel (3 sekaligus) |
| **Mode metadata** | Gratis, 0 kredit — langsung export CSV untuk upload manual |
| **Mode render gambar** | 1 kredit aplikasi per gambar, unduh sebagai file terpisah |
| **Riwayat** | Semua generation tersimpan (metadata saja, gambar tidak disimpan) |
| **API Keys** | Akses terprogram, dibatasi sesuai plan |
| **Billing** | Stripe Checkout + Portal, kuota kredit per plan |

## Setup

```powershell
npm install

# salin dan isi environment
Copy-Item .env.example .env

npm run db:push   # buat tabel di database
npm run dev
```

Lalu buka `http://localhost:3000` → daftar → `/dashboard`.

### Environment wajib

| Variabel | Untuk apa |
|---|---|
| `DATABASE_URL` / `DIRECT_URL` | PostgreSQL (Supabase, Neon, Railway, …) |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` |
| `AI_PROVIDER` | Provider ide/metadata: `gemini` atau `anthropic` |
| `IMAGE_PROVIDER` | Provider render gambar; gunakan `cloudflare` untuk jatah gratis harian |
| `CLOUDFLARE_ACCOUNT_ID` | Account ID dari halaman Workers AI Cloudflare |
| `CLOUDFLARE_API_TOKEN` | Token Workers AI; buat dari halaman Workers AI atau token dengan izin Workers AI Read + Edit |
| `GEMINI_API_KEY` | Gemini untuk ide/metadata dan render gambar — buat API key di [AI Studio](https://aistudio.google.com/app/apikey) |
| `GEMINI_API_KEYS` | Opsional: beberapa Gemini API key dipisahkan koma; otomatis berpindah key saat kuota habis atau key ditolak |
| `ANTHROPIC_API_KEY` | Hanya jika `AI_PROVIDER=anthropic` |

Workers AI menyediakan **10.000 Neurons gratis per hari**; setelah jatah harian
habis, generate berhenti sampai reset. Buat akun Cloudflare, buka
[Workers AI](https://dash.cloudflare.com/?to=/:account/ai/workers-ai), buat REST
API token, lalu isi dua variabel Cloudflare di `.env`.
Render gambar menggunakan Leonardo Phoenix 1.0 melalui Cloudflare Workers AI.
Untuk memakai Gemini, atur `IMAGE_PROVIDER=gemini`; key dari `GEMINI_API_KEY`
dan `GEMINI_API_KEYS` akan dicoba berurutan. Tambahkan key berikutnya ke
`GEMINI_API_KEYS` tanpa menghapus key lama agar aplikasi otomatis beralih saat
kuota key aktif habis. Restart aplikasi setelah mengubah `.env`.

Stripe dan Resend bersifat opsional; aplikasi tetap jalan tanpa keduanya
(link reset password akan di-log ke console saat mode dev).

### Database (Supabase)

`prisma db push` memakai `DIRECT_URL` untuk migration, sedangkan runtime memakai
`DATABASE_URL`. Di Supabase:

- `DATABASE_URL` → **Session pooler** (`aws-0-<region>.pooler.supabase.com:5432`,
  user `postgres.<project-ref>`) atau Transaction pooler (port 6543 +
  `?pgbouncer=true&connection_limit=1`).
- `DIRECT_URL` → normalnya **Direct connection** (`db.<ref>.supabase.co:5432`).

**Kalau muncul `P1001: Can't reach database server`:** project Supabase baru
memberi direct connection sebagai **IPv6-only** (`db.<ref>.supabase.co` cuma punya
record AAAA). Di jaringan tanpa IPv6, migration gagal walau kredensial benar.
Perbaikannya: isi `DIRECT_URL` dengan URL **Session pooler** yang sama seperti
`DATABASE_URL` — session pooler berjalan di IPv4 dan mendukung migration.

Cek cepat dari PowerShell:

```powershell
Resolve-DnsName db.<ref>.supabase.co -Type A     # kosong = IPv6-only
Resolve-DnsName db.<ref>.supabase.co -Type AAAA
Test-NetConnection aws-0-<region>.pooler.supabase.com -Port 5432
```

## Mode & kredit

| Mode | Biaya | Output |
|---|---|---|
| Metadata saja | **0 kredit** | `stockai-<tema>-metadata.csv` |
| Render gambar | **1 kredit / gambar** | Gambar individual, diunduh dari tiap hasil |

- Ide **tidak** memotong kredit. Kredit hanya dipakai saat gambar benar-benar dirender.
- Kredit diklaim **per gambar**, bukan per batch. Kalau kredit habis di tengah jalan,
  gambar yang sudah jadi tetap bisa diunduh dan sisanya ditandai gagal — bukan seluruh
  batch dibatalkan.
- Render yang gagal / kena safety filter / timeout → kredit **otomatis direfund**.
- Tombol **Stop** menghentikan antrean; gambar yang sedang berjalan tetap diselesaikan
  dan tetap dihitung.

Kuota bawaan: FREE 10 · STARTER 100 · PRO 500 · ENTERPRISE unlimited (lihat `types.ts`).

## Export Adobe Stock

`metadata.csv` memakai urutan kolom template Adobe Stock:

```
Filename,Title,Keywords,Category,Releases
tropical-leaves-01.png,"Tropical Monstera Leaves Pattern","tropical, leaves, …",Nature,
```

`Releases` sengaja dikosongkan — isi manual kalau aset memuat orang/properti berhak.
CSV ditulis dengan BOM agar Excel tidak merusak karakter non-ASCII.

## Pakai API key

Key dibuat di `/dashboard/api-keys` (limit per plan: FREE 0 · STARTER 1 · PRO 5 · ENTERPRISE ∞).

```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Authorization: Bearer sk_live_..." \
  -H "Content-Type: application/json" \
  -d '{"kind":"batch","input":{"niche":"sustainable living","assetType":"vector","count":10}}'
```

Satu request memakai 1 kredit (direfund kalau gagal). `GET /api/generate?type=batch`
mengembalikan riwayat milik pemilik key.

## Struktur inti

```
lib/
├── ai/
│   ├── shared.ts              # prompt builder, parser, style guardrail
│   ├── gemini-provider.ts     # teks (gemini-2.5-flash) + gambar (Nano Banana 2.1)
│   ├── anthropic-provider.ts  # teks saja
│   ├── capabilities.ts        # cek provider mana yang bisa render gambar
│   └── index.ts               # pemilih provider via AI_PROVIDER
├── credits.ts                 # claimCredit / refundCredit (atomik)
├── api-auth.ts                # session ATAU Bearer API key
└── prisma.ts

app/
├── api/bulk/ideas/route.ts    # 0 kredit — tema → ide
├── api/bulk/image/route.ts    # 1 kredit — prompt → gambar base64
├── api/generate/route.ts      # endpoint generate tunggal (untuk API key)
└── dashboard/
    ├── page.tsx               # Bulk Generator
    ├── history/               # riwayat generation
    ├── api-keys/              # kelola API key
    └── billing/               # Stripe
```

## Catatan penting

1. **"Vector" bukan file SVG.** Model gambar menghasilkan **PNG raster** bergaya
   flat-vector. Adobe Stock mewajibkan EPS/SVG untuk kategori vector, jadi hasil ini
   realistisnya masuk kategori **Ilustrasi/Foto**. Butuh tracing tambahan untuk vector asli.
2. **Kuota gambar gratis.** Cloudflare Workers AI memberi jatah 10.000 Neurons
   gratis per hari; kuota bersama akun Cloudflare dan dapat habis. Kredit aplikasi
   tetap dipotong satu per gambar. Lihat [harga Workers AI](https://developers.cloudflare.com/workers-ai/platform/pricing/).
3. **Gambar tidak disimpan di database.** Base64 dikirim langsung ke browser dan
   ditampung sebagai blob. Kalau tab ditutup, gambar yang belum disimpan akan hilang —
   riwayat hanya menyimpan metadata.
4. **`maxDuration = 60`** per request (batas Next.js). Satu gambar biasanya aman;
   kalau timeout, kredit direfund dan tombol "Ulangi yang gagal" bisa dipakai.
5. **Privasi.** Free tier Gemini boleh memakai prompt/output untuk perbaikan model —
   jangan render materi sensitif lewat free tier.
