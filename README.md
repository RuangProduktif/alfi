# Ritual

Pelacak kebiasaan (habit tracker) berbahasa Indonesia: akun pengguna, kebiasaan, penyelesaian harian, rentetan (streak), kalender, statistik, tema Terang/Gelap, dan PWA. Dibangun dengan React 19, TypeScript (strict), Vite, Tailwind CSS 4, TanStack Query, Recharts, dan Supabase (Auth + PostgreSQL + RLS).

Status proyek dan hasil pengujian yang jujur ada di [`PROGRESS.md`](PROGRESS.md). Baca itu lebih dulu untuk tahu apa yang sudah dan belum terbukti.

## Persyaratan
- Node.js 20.19 atau lebih baru (atau 22.12+), sesuai syarat Vite 8, dan npm. Diuji pada Node 22.
- Proyek Supabase (gratis cukup). Tanpa proyek Supabase, aplikasi hanya menampilkan halaman "belum terhubung ke Supabase".

## Memulai
1. `npm ci`
2. Buat proyek Supabase, jalankan **kedua** migration SQL **berurutan**, dan atur URL redirect: ikuti [`docs/SETUP-SUPABASE.md`](docs/SETUP-SUPABASE.md).
3. Salin `.env.example` menjadi `.env.local`, isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_PUBLISHABLE_KEY` (kunci *publishable/anon* saja). **Jangan pernah** menaruh service-role key di frontend atau repository.
4. `npm run dev`, lalu buka alamat yang tampil.

## Perintah
| Perintah | Fungsi |
|---|---|
| `npm run dev` | Server pengembangan |
| `npm run build` | Pemeriksaan tipe + build produksi (juga membuat service worker dan manifest) |
| `npm run preview` | Menyajikan hasil build (untuk memeriksa PWA di `localhost`) |
| `npm test` | Tes unit/komponen (Vitest, jsdom) dan tes SQL/RLS pada Postgres sungguhan (PGlite) |
| `npx tsc -b` | Pemeriksaan tipe (termasuk folder `e2e/`) |
| `npm run lint` | Oxlint |
| `npm run contrast` | Mengukur kontras WCAG semua warna antarmuka (token di `src/index.css`) pada tema Terang dan Gelap; `-- --write` memperbarui `docs/KONTRAS-WARNA.md` |
| `npx playwright install chromium` lalu `npm run e2e` | Uji browser di Chromium: audit visual (60 halaman, kontras WCAG AA), alur autentikasi, kebiasaan, kalender, statistik, pengaturan, service worker |

Uji browser memakai **backend Supabase tiruan** (`e2e/mock-supabase.ts`) dan tidak pernah menyentuh proyek Supabase kamu. Tiruan itu tidak punya RLS; isolasi antar akun dibuktikan oleh `supabase/tests/rls.test.ts` dan oleh uji manual.

## Uji manual
[`docs/PANDUAN-UJI-MANUAL.md`](docs/PANDUAN-UJI-MANUAL.md) berisi langkah demi langkah untuk dijalankan di browser dengan Supabase sungguhan (akun, kebiasaan, kalender, statistik, tema, PWA, dan isolasi data dua akun). [`docs/AUDIT-INTERAKSI.md`](docs/AUDIT-INTERAKSI.md) mendaftar setiap elemen interaktif beserta jenis bukti yang ada.

## Deploy ke Vercel
1. Dorong repository ke GitHub, lalu *Import Project* di Vercel (preset Vite: build `npm run build`, output `dist`).
2. Tambahkan environment variable `VITE_SUPABASE_URL` dan `VITE_SUPABASE_PUBLISHABLE_KEY` di pengaturan proyek Vercel.
3. Tambahkan domain Vercel kamu ke **Authentication → URL Configuration** di Supabase (Site URL dan Redirect URLs, termasuk `/reset-password`).
4. `vercel.json` sudah memuat rewrite SPA dan header cache untuk `sw.js` dan `manifest.webmanifest`. **Belum pernah dijalankan di Vercel oleh saya**; periksa setelah deploy pertama.
5. PWA butuh HTTPS (Vercel menyediakannya) atau `localhost`. Detail dan cara memeriksanya: [`docs/PWA.md`](docs/PWA.md).

## Fitur
Sudah ada dan teruji (lihat `PROGRESS.md` untuk bukti dan batasannya): pendaftaran, masuk, keluar, pemulihan kata sandi, proteksi route; tambah/ubah/arsip/hapus/cari/filter kebiasaan; penyelesaian dan pembatalan; rentetan dan statistik dari satu modul yang diuji; kalender bulanan dengan batas ubah 30 hari ke belakang; zona waktu per akun; tema Terang/Gelap/Sistem yang tersimpan di akun; PWA yang bisa dipasang dengan status offline yang jujur.

**Tidak ada (sengaja, jangan dianggap berfungsi):** perubahan offline dengan antrean sinkronisasi, notifikasi push, background sync.

## Struktur
`src/features/*` (auth, habits, dashboard, calendar, analytics, settings, profile), `src/lib/*` (tanggal, streak, validasi, tema, Supabase), `src/pwa`, `supabase/migrations` dan `supabase/tests`, `e2e/` (uji browser), `docs/`.
