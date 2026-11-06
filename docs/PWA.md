# PWA Ritual: apa yang ada, apa yang tidak, dan cara memeriksanya

## Yang sudah ada
- **Manifest** (`/manifest.webmanifest`): nama *Ritual*, `start_url` `/app`, `scope` `/`, `display: standalone`, bahasa `id`, ikon 192 dan 512 (any) serta 512 (maskable). Dibuat otomatis saat `npm run build`.
- **Service worker** (`/sw.js`, Workbox `generateSW`) yang hanya men-*precache* berkas statis hasil build (app shell). Navigasi SPA jatuh ke `/index.html`.
- **Tidak ada data yang di-cache.** Semua permintaan lintas-origin (termasuk Supabase: auth dan REST) memakai `NetworkOnly`. Tidak ada cache runtime lain. Dengan begitu data privat satu pengguna tidak bisa muncul pada pengguna lain lewat cache.
- **Versi baru tidak dipasang diam-diam.** Muncul pemberitahuan "Versi baru Ritual tersedia" dengan tombol *Muat Ulang* dan *Nanti*. Aplikasi memeriksa pembaruan tiap jam selama terbuka dan online.
- **Pemasangan**: kartu *Pasang Aplikasi* di Pengaturan. Bila browser menawarkan pemasangan, tombolnya aktif. Bila tidak, tampil petunjuk manual sesuai platform (iOS, Android, desktop).
- **Status offline yang jujur**: spanduk "Kamu sedang offline" muncul saat tidak ada jaringan, dan pesan gagal-muat menyebut offline bila memang offline.

## Yang TIDAK ada (jangan dianggap berfungsi)
- **Perubahan offline.** Tidak ada antrean sinkronisasi. Menandai kebiasaan saat offline akan gagal dan tidak disimpan. Strategi konflik, duplikasi, dan pergantian akun untuk antrean belum dirancang, jadi fitur ini sengaja tidak dibuat.
- **Notifikasi push** dan **background sync**: tidak ada.
- Halaman `offline.html` terpisah: tidak dibuat. App shell di-cache sehingga aplikasi tetap terbuka saat offline; yang ditampilkan adalah spanduk offline dan error yang menyebut offline. (Data tidak dimuat tanpa jaringan.)

## Perilaku offline yang diuji di Chromium (Fase 8)
- Tanpa koneksi, menandai kebiasaan menampilkan galat dengan *Coba Lagi*; tombol tidak macet, dan **tidak ada** perubahan yang terkirim sendiri saat online kembali (`networkMode: 'always'` pada QueryClient).
- Muat ulang tanpa koneksi: app shell terbuka dari cache; data tidak ditampilkan dari cache; galat dengan *Coba Lagi* muncul setelah ±10 detik (supabase-js mencoba ulang dulu).
- Cache Storage hanya berisi berkas statis; tidak ada URL Supabase.
- Cara menjalankan: `npm run e2e` (`e2e/30-pwa.spec.ts`). Keterbatasan: Chromium desktop headless, bukan iOS/Android.

## Syarat
- **HTTPS wajib** di produksi (service worker dan pemasangan tidak aktif di HTTP biasa). `localhost` dikecualikan untuk pengembangan.
- Server harus mengembalikan `/index.html` untuk semua rute (`/app/...`). `vercel.json` sudah mengaturnya, termasuk header agar `sw.js` dan manifest tidak di-cache lama oleh CDN.

## Cara memeriksa sendiri (belum pernah saya lakukan di browser)
Service worker hanya aktif pada build produksi:

```
npm run build
npm run preview
```
Buka alamat yang tampil (biasanya `http://localhost:4173`) di Chrome atau Edge, lalu DevTools → **Application**:
1. **Manifest**: tidak ada peringatan; ikon tampil; *Installability* tidak menampilkan masalah.
2. **Service workers**: status *activated and is running*.
3. **Cache storage**: hanya berisi `workbox-precache-…` (berkas statis). **Tidak boleh** ada cache berisi respons Supabase.
4. Tab **Network** → centang *Offline*, muat ulang: aplikasi terbuka, spanduk offline tampil, tidak ada data baru.
5. **Lighthouse** → kategori *Progressive Web App*/*Installable*.
6. Uji pembaruan: ubah teks apa pun, `npm run build` lagi, biarkan `preview` berjalan, muat ulang tab: pemberitahuan versi baru harus muncul, dan tidak memuat ulang sebelum kamu menekan *Muat Ulang*.
