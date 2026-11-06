# PROGRESS — Ritual

Terakhir diperbarui: 5 November 2026 (Fase 9, pemolesan tampilan, selesai). Laporan ini sengaja membedakan **yang sudah dibuktikan** dari **yang belum diuji**.

## Snapshot terakhir yang dikirim

| | |
|---|---|
| Paket | `ritual-fase9.zip` (tanpa `node_modules`, `dist`, `dist-e2e`; sudah termasuk riwayat git) |
| Isi | Fase 1–9 selesai. Fase 9 = pemolesan tampilan saja (aksen hijau sage menggantikan ungu, kartu berlapis, ikon/warna kategori, navigasi bawah kapsul, kontras terukur). Tanpa perubahan logika, data, atau teks. |
| Tes | 350 tes unit/komponen/SQL lulus (`npm test`, 3 tes baru untuk palet warna); `tsc -b` bersih; `npm run build` berhasil (17 entri precache, 1044,6 KiB); `npm run contrast`: 218/218 pengukuran lulus; `npm run e2e` (Chromium + backend tiruan): **128 lulus, 1 `fixme`** (60 audit visual, 28 smoke/auth/kebiasaan, 29 kalender/statistik/pengaturan/PWA, 11 polish) |
| Mutasi | SQL 28/28 tertangkap; Fase 5 9/9; Fase 6 17/18 + 1 mutan ekuivalen; Fase 7 24/24; Fase 8 (tes browser) 9/9; Fase 9 (tes polish) 6/6 (lihat bagian Fase 8) |
| Migration | 2 berkas, **jalankan berurutan**: `20261031000000_init.sql`, lalu `20261101000000_backfill_limit.sql` |
| Cara memakai | `npm ci`, salin `.env.example` ke `.env.local` (lihat `docs/SETUP-SUPABASE.md`), `npm run dev` |
| Dokumen | `PROGRESS.md`, `docs/SETUP-SUPABASE.md`, `docs/PWA.md`, `docs/AUDIT-INTERAKSI.md`, `docs/PANDUAN-UJI-MANUAL.md` |

Catatan: tanpa `.env.local` aplikasi hanya menampilkan halaman "belum terhubung ke Supabase". Pemilik proyek menyatakan proyek Supabase dan kedua migration sudah dijalankan, aplikasi terhubung dan data tersimpan, dan **seluruh panduan uji manual (A–I, termasuk pendaftaran dengan verifikasi email dan isolasi dua akun) lulus di Supabase asli tanpa galat konsol** (laporan pemilik proyek; saya tidak menjalankannya).

## Ringkasan status

| Fase | Isi | Status |
|---|---|---|
| 1 | Fondasi: Vite + React 19 + TS strict + Tailwind 4 + Router + Vitest, struktur folder, `.env.example` | Selesai |
| 2 | Design system, tema Terang/Gelap/Sistem, layout sidebar + navigasi bawah, teks Indonesia terpusat | Selesai |
| 3 | Modul tanggal & streak (TDD), Beranda, manajemen kebiasaan (tambah/ubah/arsip/hapus/cari/filter) | Selesai |
| 4 | Migration SQL + RLS, Supabase Auth, proteksi route, repositori Supabase, isolasi antar akun | Selesai (lihat batasan) |
| 5 | Sambungkan `user_settings`: zona waktu dan tema per akun | Selesai (lihat batasan) |
| 6 | Kalender dan Statistik, batas mundur 30 hari | Selesai (lihat batasan) |
| 7 | PWA: manifest, service worker, pemasangan, pembaruan versi, status offline | Selesai (lihat batasan) |
| 8 | Audit interaksi, kontras, browser test, uji service worker, dokumentasi | Selesai (lihat batasan) |
| 9 | Pemolesan tampilan (sage, kartu, kategori, navigasi kapsul, kontras terukur) | Selesai (lihat batasan Fase 9) |

## Fase 8 — audit interaksi, uji browser, PWA

**Cara menjalankan uji browser:** `npx playwright install chromium` (sekali), lalu `npm run e2e`. Aplikasi dibangun dengan URL Supabase **tiruan** `http://127.0.0.1:4174` (`e2e/serve.mjs` memasang env lewat `process.env`, sehingga `.env.local` tidak bisa menyambungkannya ke proyek nyata); semua permintaan keluar selain localhost diblokir dan dicatat. `@playwright/test` dipasang eksak `1.56.0`. Tidak ada kunci atau rahasia Supabase yang dipakai.

| Berkas uji | Cakupan | Hasil |
|---|---|---|
| `00-smoke`, `20-auth` | login/daftar/lupa & reset kata sandi, proteksi route, Keluar, sesi, 404, mundur/maju | 14 lulus, 1 `fixme` |
| `10-visual` | 10 halaman × 360/768/1280 px × Terang/Gelap: overflow, nav, kontras teks AA, batas isian 3:1, nama aksesibel, `h1`, `lang`, galat konsol | 60/60 |
| `21-habits` | tambah/ubah/arsip/hapus/cari/filter, validasi, kegagalan server, klik ganda, keadaan kosong, penyelesaian & pembatalan di Beranda | 14/14 |
| `22-calendar-stats-settings` | navigasi bulan, posisi hari, detail tanggal, tandai/batalkan, masa depan, batas 30 hari, galat; statistik (kosong, kartu, rentang, detail, heatmap); tema; zona waktu (tanggal lokal vs UTC) | 21/21 |
| `30-pwa` | manifest + ikon, SW aktif + precache, shell offline, Cache Storage tanpa data privat, banner offline, perubahan offline gagal jujur, muat ulang tanpa koneksi, banner versi baru | 8/8 |

**Mutasi pada tes browser (bug disuntikkan ke aplikasi, tes harus gagal): 9/9 tertangkap.** Toast sukses palsu (form kebiasaan dan Beranda), arsip terbalik, kolom awal bulan bergeser, batas mundur 31 hari, "hari ini" memakai UTC, `networkMode` dikembalikan ke bawaan, SW meng-cache respons API, dan warna batas isian lama. Satu celah tes ditemukan dan ditutup: pernyataan negatif Playwright (`not.toContainText`, `toBeHidden`) mengulang sampai lolos dan toast palsu hilang sendiri setelah 4 detik, sehingga mutasi pertama **lolos**; diganti pengecekan sekali jalan.

**Temuan nyata dan perbaikan:**
1. (Riwayat Fase 8; token aksen ini sudah diganti di Fase 9.) Tema gelap: teks putih pada tombol aksen 4,38:1 dan teks aksen pada permukaan gelap 3,83–4,43:1 → token `--accent-text`, `--accent` gelap `#7050f5`; `text-accent` untuk teks diganti `text-accent-text` (toast, tautan auth, hari ini di kalender, nav bawah).
2. Batas kolom isian ±1,2:1 (WCAG 1.4.11) → token `--input-border`. Perubahan tampilan kecil: garis kolom isian lebih tegas.
3. **Bug perilaku offline:** TanStack Query menjeda permintaan saat offline (`networkMode` bawaan `online`). Tombol Tandai Selesai macet nonaktif tanpa pesan, lalu terkirim sendiri dengan toast sukses saat online; muat ulang offline berhenti di "Memuat…". Bertentangan dengan `docs/PWA.md`. Perbaikan satu baris di `src/features/auth/guards.tsx`: `networkMode: 'always'` untuk query dan mutasi. Kini gagal cepat dengan galat + Coba Lagi, dan tidak ada yang terkirim diam-diam. (Muat ulang tanpa koneksi menampilkan "Memuat…" ±10 detik karena supabase-js mencoba ulang sebelum galat muncul.)

**Alat uji:** `e2e/mock-supabase.ts` meniru bentuk respons Auth dan PostgREST; ia **tidak** punya RLS, trigger, atau Postgres. Untuk uji service worker mock dijalankan sebagai server HTTP sungguhan (port 4174, lintas-origin seperti Supabase asli) karena SW mengirim permintaan lintas-origin sendiri dan `context.route` tidak melihatnya. `context.setOffline` tidak menghentikan permintaan SW, jadi koneksi putus disimulasikan dengan mematikan server mock. Banner versi baru diuji dengan SW sungguhan; rilis baru disimulasikan dengan menambah satu baris komentar ke `dist-e2e/sw.js` (dipulihkan setelah tes).

**Dokumen:** `docs/AUDIT-INTERAKSI.md` (setiap elemen beserta jenis bukti), `docs/PANDUAN-UJI-MANUAL.md` (sudah dijalankan pemilik proyek, lulus).

**Sengaja tidak dikerjakan:** pemecahan bundle (keputusan pemilik proyek). Precache masih ±1 MB.

## Fase 9 — pemolesan tampilan (tanpa perubahan logika, data, atau teks)

Permintaan pemilik proyek: tampilan terlalu datar dan monoton, aksen ungu tidak disukai. Aksen aksi utama kini **hijau sage** (menggantikan "violet accent" di `MASTER_PROMPT.md`).

**Catatan jujur sebelum rincian:** zip baru dan gambar acuan yang disebut dalam permintaan **tidak sampai** ke saya (folder unggahan hanya berisi `ritual-fase7.zip` lama). Saya memakai salinan kerja Fase 8 yang sama dengan `ritual-fase8.zip`. Gambar acuan tidak pernah saya lihat; susunan tata letak mengikuti deskripsi teks, jadi kemiripan dengan gambar itu **tidak terverifikasi**.

| Bagian | Isi | Commit |
|---|---|---|
| Token dan warna | Semua warna di `src/index.css` (satu-satunya tempat). Lapisan: `bg` → `surface` → `surface-2` → `surface-hover`. Token aksen: `--accent`, `-hover`, `-fg`, `-text`, `-soft`. Tema Terang, Gelap, Sistem tetap berfungsi. Ikon PWA, favicon, `theme_color`, `background_color`, dan `<meta theme-color>` diganti ke sage. | 9a |
| Kartu | `Card` punya tiga peran: `default`, `hero` (progres hari ini), `row` (baris kebiasaan), dengan radius berbeda, bayangan halus (`--elev-card`, `--elev-float`), dan hierarki teks lebih tegas. Tanpa gradien. Di tema gelap bayangan nyaris tak terlihat, jadi lapisan dibedakan lewat warna permukaan dan highlight tipis. | 9b |
| Kategori | Tujuh kategori punya ikon dan warna sendiri (token `--cat-*`, `CategoryBadge`). Teks label sama persis dengan sebelumnya. Tidak ada hijau/sage dan tidak ada ungu. | 9c |
| Navigasi bawah | Kapsul mengambang (jarak dari tepi, `bottom: 0.75rem + safe-area`), kaca blur di dalam `@supports` dengan cadangan solid semi-transparan, item min 56 px, padding bawah halaman, toast dan banner dinaikkan. `viewport-fit=cover` ditambahkan ke `index.html` (tanpa itu safe-area tidak berlaku di iOS). Sidebar desktop tidak diubah. | 9d |
| Nama terpotong | Nama kebiasaan membungkus (bukan elipsis) dan tombol aksi turun ke baris bawah di layar sempit. | 9d |
| Kontras | `scripts/check-contrast.mjs` (`npm run contrast`) membaca token langsung dari `index.css` dan palet dari `habit-icons.ts`: 218 pengukuran di dua tema, **semua lulus** (teks ≥ 4,5:1; non-teks ≥ 3:1; pembeda kategori vs aksen ΔE ≥ 30). Laporan: `docs/KONTRAS-WARNA.md` (dibuat skrip). Penanda kalender dan heatmap sudah termasuk. | 9a–9e |
| Penanda kalender | "Sebagian selesai" kini cincin kosong dan "Semua selesai" bulatan penuh, karena keduanya sekarang hijau (aksen sage dan success bertabrakan) dan tidak boleh dibedakan hanya lewat warna. Ini perubahan tampilan yang terlihat. | 9e |
| Heatmap | Memakai token `--heat-0..4` (sebelumnya opasitas aksen), supaya bisa diukur. | 9e |
| Reduced motion | Animasi baru (transisi item navigasi, isi progres) mengikuti aturan global `prefers-reduced-motion`; diuji di Chromium. | 9d/9e |
| Dokumen | `MASTER_PROMPT.md` diperbarui (satu baris "violet" diganti, plus dua baris tentang kategori dan token). `CLAUDE.md` **tidak** menyebut violet, jadi tidak diubah (salinannya disertakan di akar repo). File di folder project Claude bersifat baca-saja bagi saya; salin versi baru dari zip jika ingin menggantinya di sana. | 9e |

**Keputusan yang perlu kamu ketahui:**
- **Warna ungu lama di database tidak diubah.** Kebiasaan lama yang tersimpan dengan `#7c5cfc` hanya *ditampilkan* sebagai Biru (`displayColor` di `src/lib/habit-icons.ts`, diuji). Nilai di database tetap sampai kamu menyimpan ulang kebiasaan itu. Satu literal `#7c5cfc` sengaja tersisa di berkas itu untuk pemetaan ini.
- **Palet warna kebiasaan:** "Violet" diganti "Jingga"; lima warna lain tidak berubah nilainya (itu data yang sudah tersimpan). Ikon dan swatch kini dicampur dengan warna teks tema (`inkColor`/`tintColor`) agar terbaca di Terang dan Gelap; tanpa itu Kuning gagal kontras di tema terang.
- **Font tetap Inter.** Saya sempat mencoba font lain, lalu membatalkannya: aturan precache font di `vite.config.ts` terikat pada nama berkas Inter, dan kamu melarang menyentuh konfigurasi PWA. Mengganti font masih mungkin dengan satu perubahan di konfigurasi itu bila kamu mengizinkan.
- **Tes yang diubah karena perubahan yang disengaja:** `src/pwa/pwa-build.test.ts` (nilai `theme_color`/`background_color` baru); data uji `#7c5cfc` diganti `#3b82f6`; string tema tidak valid `'ungu'` diganti `'tema-asing'` di dua tes (hanya nilai input uji, bukan perilaku). Tidak ada tes yang dilonggarkan.
- Precache bertambah ±17 KiB (1027,7 → 1044,6 KiB) karena CSS dan ikon baru. Bundle tidak dipecah.

**Mutasi pada tes polish (bug disuntikkan, tes harus gagal): 6/6 tertangkap** (nama kembali terpotong, padding bawah hilang, safe-area dihapus, aturan reduced-motion dihapus, heatmap kembali ke kelas lama, penanda sama-sama penuh). Satu tes ternyata rapuh dan meloloskan mutasi nama terpotong (mengukur sebelum tombol aksi dirender, dan bergantung pada data tes lain); sudah diperbaiki dan mutasi diulang.

**Belum teruji / batasan Fase 9:**
- Tidak ada uji di perangkat nyata. Safe-area hanya diemulasikan lewat CDP di Chromium (inset 34 px); blur kaca dan kapsul belum dilihat di iOS Safari atau Android Chrome. Cadangan solid saat `backdrop-filter` tidak didukung hanya diperiksa lewat isi CSS hasil build, bukan dengan browser yang benar-benar tanpa dukungan itu.
- Kontras kaca navigasi diukur untuk kasus terburuk yang saya definisikan (kanvas, kartu, area teks padat, tombol aksen di belakang), bukan semua kemungkinan isi di belakangnya.
- Tingkat heatmap 0 (tanpa penyelesaian) tidak dipersyaratkan 3:1 (ia menandai ketiadaan data); tingkat 1–4 dipersyaratkan dan lulus.
- `success` dan aksen sage sama-sama hijau (ΔE ditampilkan di laporan sebagai info); penanda kalender dibedakan lewat bentuk. Opsi warna kebiasaan "Hijau" juga masih ada sebagai data pilihan pengguna.
- Label "Kebiasaan Saya" membungkus jadi dua baris di kapsul pada layar 360 px (teks tidak boleh diubah).
- Ikon PWA diganti; aplikasi yang sudah terpasang mungkin masih memakai ikon lama sampai dipasang ulang (cache browser/OS), belum diperiksa.
- Tidak ada uji regresi visual berbasis tangkapan layar; penilaian tampilan mengandalkan audit otomatis (overflow, kontras, ukuran target) dan pemeriksaan visual saya atas tangkapan layar.

## Pengujian saat ini

Dijalankan lewat `npm test`, `npx tsc -b`, `npm run build`, `npx oxlint`:
- Unit/komponen (jsdom): tanggal, streak, validasi, repositori lokal, ringkasan dashboard, alur Beranda & Kebiasaan, alur autentikasi, proteksi route, isolasi akun.
- Database (`supabase/tests/rls.test.ts`): migration dijalankan pada **Postgres 18 sungguhan (PGlite/WASM)** dengan skema `auth` Supabase yang ditiru. Mencakup isolasi RLS, constraint, trigger.
- **Uji mutasi** pada keamanan: 25 pelonggaran policy/grant/constraint disuntikkan satu per satu; **25 dari 25 tertangkap** oleh tes. `WITH CHECK` pada policy UPDATE kini dikunci secara mandiri (tes di database terpisah yang policy SELECT-nya sengaja dilonggarkan), jadi tidak lagi bergantung pada policy SELECT.
- **Uji mutasi PWA (Fase 7):** 24 perusakan (konfigurasi build, manifest, aturan cache, pembaruan, pemasangan, offline); **24 dari 24 tertangkap**. Satu celah tes nyata ditemukan dan ditutup: `registerType: 'autoUpdate'` tidak mengubah logika service worker tetapi membalik bendera di kode klien sehingga aplikasi memuat ulang sendiri; kini diperiksa langsung pada bundel hasil build.
- **Uji mutasi SQL (dua migration):** 28 perusakan policy/grant/constraint/trigger/batas tanggal; **28 dari 28 tertangkap**.
- **Uji mutasi** perilaku aplikasi Fase 6: 18 perusakan (batas mundur, pemilihan tanggal, filter rentang, definisi persentase, penanda kalender, heatmap, pencapaian); **17 tertangkap, 1 mutan ekuivalen** (lihat batasan). Satu celah tes ditemukan (data uji membuat "bulan ini" dan "keseluruhan" kebetulan sama) dan sudah ditutup.
- **Uji mutasi** pada perilaku aplikasi Fase 5: 9 perusakan (gerbang pengaturan, sumber zona waktu, sinkron tema, pemulihan diam-diam, pesan sukses palsu, cache, pelingkupan akun); **9 dari 9 tertangkap**.

## Keputusan penting

**Data & tanggal**
- Tanggal penyelesaian disimpan sebagai `DATE` kalender (`YYYY-MM-DD`) pada zona waktu pengguna, dihitung dengan aritmetika UTC murni. Tidak pernah diturunkan dari timestamp UTC.
- Satu sumber logika: `src/lib/streaks` (jadwal, rentetan, persentase) dan `src/lib/dates`. Tidak ada rumus streak di komponen.
- Awal pekan = Senin. Hari 0 = Minggu … 6 = Sabtu.

**Aturan streak**
- Hari ini belum selesai **tidak** memutus rentetan; hari terjadwal sebelum hari ini yang terlewat memutusnya.
- Hari tidak terjadwal tidak memutus rentetan.
- Penyelesaian di masa depan, sebelum tanggal mulai, atau di hari tidak terjadwal diabaikan (tidak dihitung, tidak merusak).
- **Jadwal saat ini berlaku untuk seluruh riwayat** (riwayat perubahan jadwal tidak disimpan). Penyederhanaan yang disengaja.
- Kebiasaan diarsipkan: rentetan saat ini = 0; rekor dan persentase tetap dihitung untuk periode sebelum pengarsipan. Bila dipulihkan, hari selama diarsipkan dihitung terlewat.
- Hapus permanen ikut menghapus seluruh riwayat (dijelaskan di dialog konfirmasi). Arsip adalah jalur yang menjaga data.

**Database & keamanan**
- Database adalah pengaman utama; frontend hanya kenyamanan.
- `habit_completions` memakai **FK komposit** `(habit_id, user_id)` → `habits(id, user_id)`, sehingga penyelesaian tidak bisa dipasang ke habit orang lain. Pemeriksaan FK tidak tunduk pada RLS, jadi ini lapisan yang berdiri sendiri.
- Penyelesaian hanya bisa dibuat/dihapus (tidak ada hak UPDATE). Tanggal masa depan ditolak trigger (toleransi +1 hari untuk zona waktu).
- Grant ke `authenticated` ditulis eksplisit; `anon` tidak diberi akses.
- Policy memakai `(select auth.uid())`.
- Cache query dan repositori dibuat ulang per pengguna (`key = user.id`) agar data tidak tercampur saat berganti akun, termasuk perpindahan sesi langsung A→B.
- Hanya publishable key di frontend. Tanpa `.env.local`, aplikasi menampilkan halaman "belum terhubung ke Supabase" (tidak ada mode lokal).

**Pengaturan akun (Fase 5)**
- `user_settings` dimuat oleh `SettingsGate` **sebelum** halaman privat tampil. Tanpa itu, "hari ini" dihitung dengan zona waktu bawaan lalu berubah, dan penyelesaian bisa tercatat pada tanggal yang salah.
- Bila pengaturan gagal dimuat, aplikasi **tidak** diam-diam memakai Asia/Jakarta; pengguna melihat error dan tombol Coba Lagi.
- Akun adalah sumber kebenaran tema: saat pengaturan dimuat, tema perangkat mengikutinya (menimpa `localStorage`). `localStorage` tetap dipakai agar tidak ada kilatan tema saat load pertama.
- Mengubah tema berlaku langsung di perangkat; bila gagal tersimpan ke akun, pengguna diberi tahu jujur ("belum tersimpan ke akunmu") dengan Coba Lagi.
- Zona waktu dipilih dari daftar singkat 14 zona (`src/lib/timezones.ts`; semuanya diuji diterima Postgres). Zona di luar daftar yang sudah tersimpan tetap ditampilkan apa adanya.
- Mengubah zona waktu hanya memengaruhi penentuan "hari ini"; tanggal penyelesaian yang sudah tersimpan (DATE) tidak berubah.
- Akun lama tanpa baris `user_settings` otomatis dibuatkan dengan nilai bawaan database.

**Kalender, statistik, batas mundur (Fase 6)**
- **Batas mundur 30 hari** untuk menandai/membatalkan penyelesaian: hari ini dan 30 hari ke belakang boleh, masa depan dan lebih lama tidak. Ditegakkan di tiga tempat: UI (tombol disembunyikan + penjelasan), hook mutasi (`useToggleCompletion`, diuji langsung), dan database (migration kedua).
- **Database lebih longgar 1 hari (31 hari terhadap tanggal UTC)** karena server tidak tahu zona waktu pengguna saat insert; aplikasi menegakkan 30 hari tepat menurut zona waktu pengguna. Di database yang dibatasi hanya INSERT/UPDATE tanggal; penghapusan (termasuk cascade) tidak.
- **Persentase** = penyelesaian valid ÷ kewajiban terjadwal yang sudah berlangsung sampai hari ini × 100 (`completionRate`), satu definisi untuk semua halaman. Hari yang belum tiba dan hari tidak terjadwal tidak dihitung; kebiasaan diarsipkan hanya untuk periode sebelum diarsipkan; kebiasaan belum dimulai tidak dihitung. Aturan ini juga tertulis di halaman Statistik ("Cara perhitungan").
- Kalender: awal pekan Senin; status per kebiasaan = selesai / belum selesai / tidak dijadwalkan / belum tiba / belum dimulai. Kebiasaan yang diarsipkan tidak tampil pada tanggal sesudah pengarsipan; yang belum ada pada tanggal lampau disembunyikan.
- Statistik: kartu pekan/bulan/keseluruhan, rentetan, rekor, total; grafik per hari (7/30/90 hari); performa tiap kebiasaan (klik membuka detail); heatmap 12 pekan; riwayat pencapaian (rentetan 3/7/14/30/60/100 hari, total penyelesaian 1/10/50/100/500, hari sempurna pertama) dihitung dari data tersimpan beserta tanggal tercapainya. Grafik dan kartu bukan elemen interaktif (tidak ada klik palsu).
- `lib/streaks` bertambah: `dayStatus`, `dailyResults`, `dailyTotals`, `streakReachedOn`, `canEditDate`.

**PWA (Fase 7)** (rincian lengkap di `docs/PWA.md`)
- `vite-plugin-pwa@2.0.0` terbukti bekerja dengan Vite 8 lewat build nyata (mode `generateSW`, 17 entri precache).
- Hanya berkas statis yang di-precache. **Semua permintaan lintas-origin `NetworkOnly`**, tidak ada cache runtime lain, sehingga respons Supabase tidak pernah masuk cache.
- `registerType: 'prompt'`: versi baru menunggu pilihan pengguna ("Muat Ulang" / "Nanti"); `skipWaiting` hanya lewat pesan `SKIP_WAITING`, tanpa `clientsClaim`.
- **Tidak ada dukungan offline untuk perubahan** (tidak ada antrean sinkronisasi). Status offline ditampilkan jujur (spanduk + pesan galat yang menyebut offline). Tidak ada push/background sync.
- `beforeinstallprompt` ditangkap di akar aplikasi (bukan di halaman Pengaturan) karena peristiwanya terpicu jauh sebelum Pengaturan dibuka. Ada petunjuk manual untuk iOS/Android/desktop.
- `vercel.json`: rewrite SPA ke `/index.html` dan header `no-cache` untuk `sw.js` dan manifest.
- Ikon dibuat oleh `scripts/generate-icons.py` (dapat diulang).

**Lain-lain**
- Route tambahan `/reset-password` (tidak ada di daftar awal) karena alur pemulihan kata sandi tidak bisa selesai tanpanya.
- Setelah masuk, pengguna kembali ke halaman privat yang semula dituju (hanya tujuan di bawah `/app`).
- Pesan error dari Supabase dipetakan ke teks Indonesia; teks mentah server tidak pernah ditampilkan.
- Dialog memakai elemen `<dialog>` native.

## Belum teruji / batasan (jujur)

1. **(Diperbarui Fase 8) Sudah dijalankan pemilik proyek pada Supabase nyata** (panduan manual A–I lulus, termasuk Auth/verifikasi email dan isolasi dua akun). Catatan lama, sebelum itu: **belum pernah dijalankan pada proyek Supabase nyata.** RLS terbukti pada Postgres yang meniru Supabase, bukan pada Supabase itu sendiri. Auth (verifikasi email, redirect, JWT) dan PostgREST belum pernah dilalui. `createSupabaseAuthService` dan `createSupabaseRepository` hanya teruji dengan klien tiruan. → **Memerlukan konfigurasi manual** (lihat `docs/SETUP-SUPABASE.md`).
2. **(Diperbarui Fase 8) Sudah dirender di Chromium terhadap backend tiruan** (lihat bagian Fase 8); belum di perangkat nyata atau Supabase nyata. Catatan lama: semua tes UI berjalan di jsdom yang tidak menghitung CSS/breakpoint. Responsivitas, tampilan dark/light, kontras warna, dan fokus `<dialog>` native belum diverifikasi. Menunggu Fase 8 (butuh Playwright dan sumber data; tanpa Supabase belum bisa membuka `/app`).
3. **(Diperbarui Fase 8) Kontras WCAG teks dan batas isian sudah diukur** dan diperbaiki; warna non-teks lain belum.
4. **Bundle JS ~812 kB** (peringatan chunk > 500 kB), sebagian besar Recharts. Rencana: lazy loading.
5. **(Diperbarui Fase 8) Kalender dan Statistik sudah dirender dan diuji di Chromium** (grid, kolom hari, grafik Recharts, heatmap, kontras teks). Belum diukur: warna penanda kalender/heatmap (non-teks) dan tampilan di perangkat nyata. Catatan lama: Kalender dan Statistik **belum pernah dirender di browser** (tes jsdom tidak menghitung CSS): tata letak grid kalender, heatmap yang bisa digulir horizontal, grafik Recharts, dan kontras warna penanda belum dilihat. Warna penanda tidak menjadi satu-satunya petunjuk (ada teks pada aria-label dan status), tetapi itu belum diuji dengan pembaca layar.
5e. **Migration kedua** (`20261101000000_backfill_limit.sql`) harus dijalankan **setelah** yang pertama. Panduan setup sudah diperbarui. Belum pernah dijalankan pada Supabase nyata.
5f. **Pembatalan penyelesaian lama tidak dibatasi di database** (hanya di aplikasi). Klien yang memanggil API langsung bisa menghapus penyelesaian lama, sehingga merusak riwayat/rentetannya sendiri (tidak menguntungkan pengguna lain; hanya merugikan dirinya).
5g. **Mutan ekuivalen** pada Fase 6: pemotongan di `lastEvaluatedDate` untuk kebiasaan diarsipkan berlebih, karena semua pemanggil sudah memfilter lewat `isScheduledOn`. Perilaku teramati sama; kode dibiarkan.
5h. Heatmap dan daftar pencapaian dihitung ulang di klien dari seluruh riwayat setiap render; belum diukur untuk ribuan penyelesaian.
5j. **(Diperbarui Fase 8) Service worker sudah dijalankan di Chromium desktop headless** (registrasi, precache, shell offline, tanpa data privat di cache, banner versi baru, perilaku offline). Belum diuji: iOS Safari, Android Chrome, prompt pasang sungguhan. Catatan lama: **Service worker belum pernah dijalankan di browser.** Yang teruji: isi manifest, isi `sw.js` hasil build, bendera klien, dan perilaku komponen (pembaruan, pemasangan, offline) dengan modul pendaftaran PWA yang ditiru. Belum teruji: pendaftaran SW sungguhan, alur pembaruan nyata, dialog pemasangan nyata, perilaku offline nyata, Lighthouse. Langkah pemeriksaan ada di `docs/PWA.md`.
5k. `vercel.json` (rewrite dan header) belum pernah dijalankan di Vercel.
5l. Pemeriksaan pembaruan **tiap jam** (`setInterval`) tidak teruji; yang teruji di browser adalah banner setelah pembaruan dipicu manual (`registration.update()`) dan setelah muat ulang.
5m. Perilaku sesi saat offline dengan token kedaluwarsa belum diuji: `getSession()` bisa gagal bila token perlu diperbarui, dan aplikasi akan menganggap pengguna belum masuk.
5n. Precache ~1 MB (JS utama ~812 kB belum dipecah). Pemecahan kode **tidak dikerjakan di Fase 8** atas keputusan pemilik proyek.
5i. Rentang grafik tetap (7/30/90 hari) dan heatmap tetap 12 pekan; belum ada pemilih rentang kustom.
5a. **Fase 5 belum teruji pada Supabase nyata**: `createSupabaseSettingsRepository` hanya teruji dengan klien tiruan (termasuk jalur akun tanpa baris pengaturan dan balapan pembuatan). Daftar zona waktu diuji terhadap tzdata Postgres 18 (PGlite), bukan versi Postgres di Supabase.
5b. Perpindahan tema berurutan sangat cepat bisa membuat respons yang datang terlambat menimpa pilihan terbaru (belum ditangani; tidak ada serialisasi permintaan).
5c. Saat berpindah akun, tema akun sebelumnya terlihat sesaat sampai pengaturan akun baru termuat.
5d. Mengubah zona waktu ke wilayah yang membuat "hari ini" mundur membuat penyelesaian bertanggal "besok" diabaikan oleh perhitungan streak sampai tanggalnya tiba (perilaku sesuai aturan tanggal masa depan, tetapi belum dijelaskan di UI).
6. PWA, offline, deployment: belum ada (Fase 7–8).
7. Lint: 12 peringatan *fast refresh* (hanya memengaruhi HMR saat dev), 0 error. (Catatan lama menulis 8; angka itu keliru.)
8. Mutan ekuivalen: tidak ada tersisa pada matriks mutasi SQL saat ini.
9. Aplikasi belum pernah diuji dengan jumlah data besar (ribuan penyelesaian). Pengambilan penyelesaian sudah berhalaman, tetapi kinerja klien belum diukur.

## Daftar tambahan Fase 8

- Uji otomatis verifikasi email di mock: `fixme` (supabase-js melaporkan "Failed to fetch" di Chromium pada respons signUp tanpa sesi dari mock ini; penyebab belum ditemukan, mock vs aplikasi belum bisa dibedakan). Fitur sebenarnya lulus di Supabase asli (manual A3).
- Lint: 12 peringatan *fast refresh*, 0 error.
- Belum diuji: pembaca layar, zoom 200% (hanya di panduan manual G), deployment Vercel nyata (`vercel.json`), perangkat iOS/Android.
- Navigasi bawah mobile tampak menimpa konten pada tangkapan layar halaman penuh; dianggap artefak tangkapan, uji manual G2 lulus.
- Nama kebiasaan terpotong ("Minum…") pada daftar kalender di 360 px (kosmetik, belum diubah).
