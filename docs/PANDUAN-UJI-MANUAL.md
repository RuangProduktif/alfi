# Panduan Uji Manual — Ritual

> **Status:** seluruh bagian A–I sudah dijalankan pemilik proyek di Supabase asli dan lulus tanpa galat konsol (termasuk A3 pendaftaran dan Bagian I isolasi dua akun). Panduan ini tetap dipakai sebagai daftar uji ulang sebelum rilis.

Jalankan sendiri di browser dengan **proyek Supabase kamu**. Setiap langkah punya hasil yang diharapkan. Catat Lulus/Gagal; bila Gagal, catat langkah, hasil nyata, dan pesan di konsol (F12 → Console).

## Persiapan

1. `npm ci`, pastikan `.env.local` terisi (lihat `docs/SETUP-SUPABASE.md`), lalu `npm run dev` dan buka alamat yang tampil.
2. Siapkan **dua akun** dengan email berbeda (akun 1 dan akun 2). Untuk akun 1 gunakan email nyata agar bisa menerima email Supabase.
3. Buka DevTools → Console; biarkan terbuka sepanjang uji. Galat merah berarti catat sebagai temuan.
4. Untuk uji tampilan buka DevTools → mode perangkat (Ctrl+Shift+M): 360×740, 768×1024, dan jendela desktop.

## A. Akun dan akses

| # | Langkah | Diharapkan |
|---|---|---|
| A1 | Buka `/app` saat belum masuk | Diarahkan ke `/login` |
| A2 | Di `/signup` kirim formulir kosong, lalu isi kata sandi < 8 karakter dan konfirmasi berbeda | Pesan validasi Indonesia per kolom; tidak ada permintaan terkirim |
| A3 | Daftar akun 1 | Jika verifikasi email aktif di Supabase: pesan "Kami telah mengirim tautan verifikasi…", email diterima, tautan membawa ke `/login`. Jika nonaktif: langsung ke `/app`. **Ini langkah pengganti uji otomatis yang masih `fixme`.** |
| A4 | Daftar lagi dengan email yang sama | Pesan "Email sudah terdaftar. Silakan masuk." (atau petunjuk verifikasi bila Supabase menyembunyikannya; catat yang terjadi) |
| A5 | Masuk dengan kata sandi salah | "Email atau kata sandi salah."; tetap di `/login`; tidak ada teks Inggris |
| A6 | Masuk benar, lalu refresh | Tetap masuk |
| A7 | `/forgot-password` dengan email akun 1 | Pesan netral; email pemulihan diterima; tautannya membuka `/reset-password` dan kata sandi baru bisa disimpan; masuk dengan kata sandi baru berhasil |
| A8 | Keluar (sidebar), lalu tombol Kembali browser, lalu buka `/app` | Selalu berakhir di `/login` |
| A9 | Buka `/ngawur` | 404 dengan tombol "Kembali ke beranda" yang berfungsi |

## B. Kebiasaan (akun 1)

| # | Langkah | Diharapkan |
|---|---|---|
| B1 | Tambah Kebiasaan tanpa nama → Simpan | Pesan validasi; dialog tetap terbuka |
| B2 | Tambah "Minum air" (Setiap hari) | Toast sukses **setelah** tersimpan; muncul di daftar dan di Beranda |
| B3 | Tambah "Lari" dengan Hari tertentu tanpa memilih hari | Validasi menolak; pilih Sen/Rab/Jum lalu simpan berhasil |
| B4 | Mulai tambah lalu tekan Batal / Esc | Tidak ada kebiasaan baru |
| B5 | Refresh halaman | Kedua kebiasaan masih ada |
| B6 | Ubah "Minum air" (ganti nama, ikon, warna) | Formulir terisi nilai lama; perubahan tersimpan dan bertahan setelah refresh |
| B7 | Cari "lar"; filter kategori; filter status | Daftar tersaring benar; pesan "Tidak ada kebiasaan yang cocok…" bila kosong |
| B8 | Arsipkan "Lari" | Hilang dari Aktif, muncul di Diarsipkan; Pulihkan mengembalikannya |
| B9 | Hapus: Batal, lalu Hapus lagi dan konfirmasi | Batal tidak menghapus; konfirmasi menghapus dan menjelaskan dampak pada riwayat |
| B10 | Di Supabase → Table Editor, lihat `habits` | Baris milik akun 1 ada; `user_id` benar |

## C. Penyelesaian (Beranda)

| # | Langkah | Diharapkan |
|---|---|---|
| C1 | Tandai Selesai "Minum air" | Status, persentase, dan jumlah "X dari Y" langsung berubah; baris muncul di `habit_completions` dengan `completed_date` = tanggal lokalmu (YYYY-MM-DD) |
| C2 | Refresh | Masih selesai |
| C3 | Batalkan | Kembali belum selesai; baris di database hilang |
| C4 | Klik Tandai Selesai dua kali cepat | Hanya satu baris di `habit_completions` |
| C5 | DevTools → Network → Offline, lalu Tandai Selesai | Galat jelas dengan Coba Lagi; **tidak** ada toast sukses; setelah Online, Coba Lagi berhasil |
| C6 | Sapaan dan tanggal di Beranda | Sesuai jam lokal; format Indonesia |

## D. Kalender

| # | Langkah | Diharapkan |
|---|---|---|
| D1 | Bulan sebelumnya / berikutnya / Hari Ini | Nama bulan benar; tanggal 1 jatuh di hari yang benar (cocokkan dengan kalender di ponselmu) |
| D2 | Pilih beberapa tanggal | Panel detail berganti; status Selesai / Belum / Tidak dijadwalkan benar |
| D3 | Tanggal masa depan | Tidak bisa ditandai |
| D4 | Tanggal lampau yang masih diizinkan | Bisa ditandai/dibatalkan; penanda kalender dan rentetan ikut berubah |
| D5 | Tanggal jauh di masa lalu | Perubahan ditolak dengan penjelasan batas yang berlaku (catat batasnya) |
| D6 | Tengah malam / ubah zona waktu (F2) | Tanggal tidak bergeser sehari |

## E. Statistik

| # | Langkah | Diharapkan |
|---|---|---|
| E1 | Akun baru tanpa data | Keadaan kosong informatif, bukan grafik palsu |
| E2 | Setelah beberapa penyelesaian | Angka cocok dengan hitungan tanganmu (rentetan saat ini, rekor, total, persentase) |
| E3 | Rentang 7 / 30 / 90 | Angka dan grafik berubah |
| E4 | "Lihat detail" suatu kebiasaan → Tutup, lalu ulangi dan Esc | Dialog terbuka/tertutup; fokus kembali ke tombol |
| E5 | Heatmap di layar 360px | Bisa digulir horizontal tanpa membuat halaman melebar |

## F. Tema dan pengaturan

| # | Langkah | Diharapkan |
|---|---|---|
| F1 | Pilih Gelap, refresh, lalu Terang, Sistem | Tampilan berganti; pilihan bertahan setelah refresh; `user_settings.theme` di Supabase ikut berubah |
| F2 | Ubah zona waktu | Tersimpan; "hari ini" mengikuti |
| F3 | Masuk di browser lain dengan akun 1 | Tema dan zona waktu sama |

## G. Navigasi, tata letak, aksesibilitas

| # | Langkah | Diharapkan |
|---|---|---|
| G1 | Klik logo; klik tiap menu; Kembali/Maju browser | Route benar, item aktif jelas |
| G2 | Layar 360px, gulir ke bawah pada tiap halaman | Elemen terakhir **tidak tertutup** navigasi bawah; tidak ada gulir horizontal |
| G3 | Navigasi hanya dengan Tab/Enter/Esc | Semua tombol terjangkau, fokus terlihat, dialog bisa ditutup dengan Esc |
| G4 | Zoom browser 200% | Tidak ada teks terpotong |
| G5 | Semua teks yang terlihat | Berbahasa Indonesia (periksa juga toast dan pesan galat) |

## H. PWA (butuh HTTPS atau localhost; paling baik pada build produksi)

1. `npm run build && npm run preview`, buka di Chrome. Application → Manifest: nama, ikon, tema terisi. Application → Service Workers: aktif.
2. Ikon "Pasang" di bilah alamat (atau kartu Pasang Aplikasi di Pengaturan) memasang aplikasi; terbuka sebagai jendela mandiri.
3. DevTools → Offline lalu muat ulang: halaman aplikasi tetap terbuka (app shell) dan muncul "Kamu sedang offline."; data privat tidak ditampilkan dari cache.
4. Setelah deploy ke Vercel: ulangi pada alamat HTTPS, lalu pada ponselmu (Chrome Android: Pasang aplikasi; iOS Safari: Bagikan → Tambah ke Layar Utama).
5. Setelah deploy ulang dengan perubahan kecil: buka aplikasi lama; banner "Versi baru Ritual tersedia." muncul, "Muat Ulang" memuat versi baru.

## I. Isolasi data (WAJIB sebelum menganggap aman)

| # | Langkah | Diharapkan |
|---|---|---|
| I1 | Buat kebiasaan "Rahasia akun 1" di akun 1 | Ada di akun 1 |
| I2 | Keluar, masuk sebagai akun 2 | Daftar kebiasaan akun 2 **tidak** memuat "Rahasia akun 1"; statistik dan kalender tidak memuat data akun 1 |
| I3 | Di DevTools → Console akun 2, ambil `id` kebiasaan akun 1 dari Table Editor, lalu coba tandai selesai lewat API (REST `habit_completions` dengan `habit_id` itu) | Ditolak (galat 403/42501 atau baris tidak tertulis) |
| I4 | Di akun 2, Hapus kebiasaan dengan id akun 1 lewat API | 0 baris terhapus; kebiasaan akun 1 tetap ada |

## J. Setelah semua selesai

Kirim saya tabel hasil (Lulus/Gagal + catatan) dan galat konsol yang muncul; temuan Gagal akan menjadi pekerjaan Fase 8 berikutnya.
