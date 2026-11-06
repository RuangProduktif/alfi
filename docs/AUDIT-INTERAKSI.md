# Audit Interaksi — Ritual (Fase 8, sebagian)

Daftar semua elemen interaktif, hasil yang seharusnya, dan **bukti yang ada saat ini**. Kolom status memakai istilah ini saja:

- **Browser+mock**: dijalankan di Chromium sungguhan (Playwright) terhadap backend Supabase **tiruan** (`e2e/mock-supabase.ts`). Membuktikan UI, navigasi, dan pesan. Tidak membuktikan Supabase sungguhan.
- **Visual+mock**: halaman dirender di Chromium; diukur overflow, kontras WCAG AA, nama aksesibel, ukuran target.
- **Manual (asli)**: dijalankan pemilik proyek di Supabase asli dan lulus.
- **Jsdom**: ada tes komponen/unit (Vitest + jsdom). Jsdom tidak menghitung CSS, jadi tidak membuktikan tampilan. Pemetaan per elemen belum dibuat; kolom ini hanya berarti "ada tes untuk fitur ini".
- **Manual**: belum diuji oleh siapa pun. Jalankan lewat `docs/PANDUAN-UJI-MANUAL.md` (kode bagian dalam kolom terakhir).

Tidak ada baris yang bisa disebut "lulus di Supabase nyata" sebelum kamu menjalankan panduan manual.

## Ringkasan bukti otomatis

| Bukti | Cakupan | Hasil |
|---|---|---|
| `npm test` | 347 tes, 27 file (jsdom, SQL/PGlite) | Lulus |
| `npm run e2e` → `10-visual` | 10 halaman × 3 viewport (360/768/1280) × 2 tema = 60 | 60/60: tanpa overflow horizontal, nav sesuai ukuran, kontras teks ≥ AA, batas kolom isian ≥ 3:1, semua kontrol bernama, satu `h1`, `lang="id"`, tanpa galat konsol |
| `20-auth` | 14 tes autentikasi/route | 13 lulus; 1 `fixme` (verifikasi email di mock) digantikan uji manual A3 yang **lulus di Supabase asli** |
| `21-habits` | 14 tes: tambah/ubah/arsip/hapus/cari/filter, validasi, kegagalan server, klik ganda, keadaan kosong, penyelesaian di Beranda | Lulus |
| `22-calendar-stats-settings` | 21 tes: navigasi bulan, grid, detail tanggal, tandai/batalkan, masa depan, batas 30 hari, galat; statistik; tema; zona waktu | Lulus |
| `30-pwa` | 8 tes: manifest + ikon, SW aktif + precache, shell offline, tidak ada data privat di Cache Storage, banner offline, perubahan offline gagal jujur, muat ulang tanpa koneksi, banner versi baru | Lulus |
| Uji manual `PANDUAN-UJI-MANUAL.md` | Semua bagian A–I di Supabase asli | **Lulus semuanya**, tanpa galat konsol (dilaporkan pemilik proyek) |

Tes yang ditulis diuji dengan **mutasi**: bug sengaja disuntikkan ke aplikasi dan tes harus gagal. Tertangkap: toast sukses palsu (kebiasaan dan Beranda), logika arsip terbalik, kolom awal bulan bergeser, batas mundur 31 hari, "hari ini" memakai UTC, mutasi offline tanpa `networkMode`, SW yang meng-cache respons API, dan warna batas isian lama.

## Halaman

| Route | Seharusnya | Status | Manual |
|---|---|---|---|
| `/` | Arah ke `/login` bila belum masuk, `/app` bila sudah | Browser+mock | A |
| `/login` | Formulir masuk | Browser+mock, Visual+mock | A |
| `/signup` | Formulir daftar | Browser+mock (tanpa verifikasi email), Visual+mock, Manual (asli, dengan verifikasi email) | A |
| `/forgot-password` | Kirim tautan pemulihan | Browser+mock, Visual+mock | A |
| `/reset-password` | Tanpa token: pesan tidak valid + tautan "Minta tautan baru" | Browser+mock | A |
| `/app` Beranda | Sapaan, progres, daftar hari ini, grafik, aktivitas | Visual+mock, Browser+mock (penyelesaian), Jsdom, Manual (asli) | C |
| `/app/habits` | Daftar, cari, filter, tambah/ubah/arsip/hapus | Visual+mock, Browser+mock, Jsdom, Manual (asli) | B |
| `/app/calendar` | Kalender bulanan + detail tanggal | Visual+mock, Browser+mock, Jsdom, Manual (asli) | D |
| `/app/analytics` | Statistik, grafik, heatmap, detail | Visual+mock, Browser+mock, Jsdom, Manual (asli) | E |
| `/app/settings` | Tema, zona waktu, pemasangan PWA | Visual+mock, Browser+mock, Jsdom, Manual (asli) | F |
| `/app/profile` | Nama, email, Keluar | Visual+mock, Browser+mock (Keluar) | A |
| rute tidak dikenal | 404 + "Kembali ke beranda" | Browser+mock, Visual+mock | A |

## Elemen interaktif

| # | Elemen | Hasil yang seharusnya | Status | Manual |
|---|---|---|---|---|
| 1 | Logo Ritual | Membuka Beranda | Manual (asli) | G |
| 2 | Navigasi: Beranda, Kebiasaan Saya, Kalender, Statistik | Pindah route benar; item aktif ditandai | Browser+mock (pindah route + mundur/maju), Manual (asli) | G |
| 3 | Ikon Pengaturan, Profil (header mobile) | Membuka `/app/settings`, `/app/profile` | Manual (asli) | G |
| 4 | Keluar (sidebar, Profil) | Sesi berakhir, ke `/login`, `/app` tertutup lagi | Browser+mock, Manual (asli) | A |
| 5 | Masuk / Daftar / Kirim tautan | Validasi, pesan Indonesia, tanpa kirim ganda | Browser+mock, Manual (asli, termasuk verifikasi email) | A |
| 6 | Tambah Kebiasaan (Beranda, Kebiasaan Saya) | Dialog formulir terbuka | Browser+mock (Kebiasaan Saya), Jsdom, Manual (asli) | B |
| 7 | Simpan kebiasaan | Validasi; toast sukses hanya setelah berhasil; data bertahan setelah refresh | Browser+mock (termasuk kegagalan server dan klik ganda), Jsdom, Manual (asli) | B |
| 8 | Batal (formulir) | Menutup tanpa menyimpan | Browser+mock (Batal dan Esc, fokus kembali), Jsdom, Manual (asli) | B |
| 9 | Ubah | Formulir terisi data lama; simpan memperbarui | Browser+mock, Jsdom, Manual (asli) | B |
| 10 | Arsipkan / Pulihkan | Status berubah; hilang/muncul sesuai filter | Browser+mock, Jsdom, Manual (asli) | B |
| 11 | Hapus | Dialog konfirmasi; Batal tidak menghapus; konfirmasi menghapus | Browser+mock, Jsdom, Manual (asli) | B |
| 12 | Cari, Filter kategori, Filter status | Daftar tersaring benar | Browser+mock, Jsdom, Manual (asli) | B |
| 13 | Tandai Selesai / Batalkan (Beranda) | Tersimpan, progres dan rentetan diperbarui; gagal → galat + Coba Lagi, tanpa sukses palsu | Browser+mock (termasuk gagal, klik ganda), Jsdom, Manual (asli) | C |
| 14 | Bulan sebelumnya / berikutnya / Hari Ini | Label bulan benar; tanggal tidak bergeser | Browser+mock, Jsdom, Manual (asli) | D |
| 15 | Pilih tanggal; tandai pada tanggal terpilih | Detail berubah; tanggal masa depan tidak bisa ditandai | Browser+mock (termasuk batas 30 hari), Jsdom, Manual (asli) | D |
| 16 | Rentang waktu 7/30/90 | Angka dan grafik berubah | Browser+mock, Jsdom, Manual (asli) | E |
| 17 | Lihat detail kebiasaan → Tutup / Esc | Dialog terbuka/tertutup, fokus kembali | Browser+mock, Jsdom, Manual (asli) | E |
| 18 | Tema Terang/Gelap/Sistem | Tampilan berganti; bertahan setelah refresh; tersimpan di akun | Browser+mock (termasuk gagal simpan), Visual+mock, Jsdom, Manual (asli) | F |
| 19 | Zona waktu | Tersimpan; "hari ini" mengikuti | Browser+mock (tanggal lokal vs UTC), Jsdom, Manual (asli) | F |
| 20 | Pasang Aplikasi / panduan pasang | Prompt pasang, atau panduan bila browser tak mendukung | Jsdom (komponen); kartu tampil di Browser+mock. Prompt pasang sungguhan: Manual (asli) | H |
| 21 | Banner offline | Muncul saat offline, jujur bahwa perubahan tidak disimpan | Browser+mock (build produksi + SW), Jsdom | H |
| 22 | Banner versi baru (Muat Ulang / Nanti) | Memuat ulang / menutup | Browser+mock (SW sungguhan, rilis disimulasikan dengan mengubah `sw.js`), Jsdom | H |
| 23 | Tautan "Lupa kata sandi?", "Ke halaman masuk", "Minta tautan baru" | Berpindah ke route benar | Browser+mock | A |

## Temuan dan perbaikan Fase 8

| Temuan | Bukti | Perbaikan |
|---|---|---|
| Tema gelap: teks putih pada tombol aksen 4,38:1; teks aksen pada permukaan gelap 3,83–4,43:1 (syarat 4,5:1) | Audit kontras 60 halaman | Token `--accent-text`, `--accent` gelap `#7050f5` |
| Batas kolom isian ±1,2:1 (WCAG 1.4.11 butuh 3:1) | Audit visual | Token `--input-border` |
| Saat offline, tombol Tandai Selesai macet nonaktif tanpa pesan lalu terkirim sendiri saat online; muat ulang offline berhenti di "Memuat…" | Uji PWA (diamati langsung); bertentangan dengan `docs/PWA.md` | `networkMode: 'always'` pada QueryClient (`src/features/auth/guards.tsx`): gagal cepat dengan galat + Coba Lagi |

## Keterbatasan yang tersisa

- Uji otomatis memakai backend tiruan (tanpa RLS/trigger/Postgres). Isolasi antar akun terbukti oleh `supabase/tests/rls.test.ts` (PGlite) **dan** uji manual Bagian I di Supabase asli.
- Uji PWA di Chromium desktop (headless). Prompt pasang sungguhan, iOS Safari, dan Android Chrome tidak diuji secara otomatis. `context.setOffline` tidak menghentikan permintaan service worker, jadi putusnya koneksi disimulasikan dengan mematikan server mock.
- Kontras diukur untuk teks dan batas kolom isian; warna penanda kalender/heatmap (non-teks) belum diukur. Pembaca layar dan zoom 200% hanya diuji manual, tanpa alat otomatis.
- Verifikasi email di mock (`fixme`): penyebab "Failed to fetch" belum ditemukan; fitur sudah lulus di Supabase asli.
- Pemecahan bundle tidak dikerjakan (precache ±1 MB), sesuai keputusan pemilik proyek.
