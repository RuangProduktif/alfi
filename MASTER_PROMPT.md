# MASTER PROMPT — RITUAL HABIT TRACKER PWA

## PERAN DAN MISI

Bertindaklah sebagai Senior Full-Stack Engineer, UI/UX Designer, Software Architect, Database Engineer, dan QA Engineer.

Bangun aplikasi bernama **Ritual**, sebuah Habit Tracker premium yang membantu pengguna membangun kebiasaan baik, memantau konsistensi, melihat progres, dan mempertahankan streak.

Saya ingin aplikasi yang benar-benar berfungsi, bukan sekadar desain, prototype statis, atau kumpulan halaman dengan tombol palsu.

Kerjakan proyek langsung pada workspace atau repository yang tersedia jika kamu memiliki akses ke file dan terminal. Jika kamu hanya memiliki akses chat, hasilkan struktur proyek, kode lengkap, dan instruksi implementasi yang dapat dijalankan.

Jangan hanya memberikan tutorial atau contoh kode. Implementasikan aplikasi secara bertahap, jalankan pengujian yang tersedia, perbaiki error, dan laporkan hasil secara jujur.

---

# 1. TUJUAN PRODUK

Buat aplikasi Habit Tracker yang:

- Menggunakan Bahasa Indonesia pada seluruh antarmuka.
- Memiliki desain premium terinspirasi dari kesederhanaan Linear, tanpa menyalin branding atau asetnya.
- Mendukung dark mode dan light mode.
- Responsif di HP, tablet, dan desktop.
- Bisa dipasang sebagai Progressive Web App (PWA) pada perangkat dan browser yang mendukung.
- Memiliki sistem akun pengguna.
- Menyimpan data pengguna ke database cloud.
- Memiliki dashboard, manajemen kebiasaan, kalender, statistik, streak, dan pengaturan.
- Memastikan setiap tombol, tautan, menu, filter, formulir, dan interaksi memiliki fungsi yang nyata.
- Menjaga data setiap pengguna agar tidak dapat diakses oleh pengguna lain.

Nama produk: Ritual.

Bahasa aplikasi: Bahasa Indonesia (id-ID).

Zona waktu awal: Asia/Jakarta, dapat diubah pengguna.

Nama, variabel, fungsi, struktur kode, tabel database, dan route boleh menggunakan Bahasa Inggris demi konsistensi pengembangan.

---

# 2. TEKNOLOGI

Gunakan stack berikut jika repository belum memiliki stack yang ditentukan:

Frontend:
- React
- TypeScript dengan strict mode
- Vite
- Tailwind CSS
- shadcn/ui
- Lucide React
- React Router
- Recharts
- TanStack Query jika diperlukan untuk pengelolaan server state
- Zod untuk validasi data

Backend:
- Supabase Auth
- Supabase PostgreSQL
- Supabase Row Level Security (RLS)

PWA:
- vite-plugin-pwa
- Workbox
- Web App Manifest
- Service Worker

Testing:
- Vitest
- React Testing Library
- Playwright jika lingkungan mendukung browser automation

Deployment:
- Vercel atau platform HTTPS lain yang sesuai.

Gunakan versi dependency yang stabil dan kompatibel.

Jika repository sudah memiliki teknologi yang cocok, periksa terlebih dahulu sebelum mengganti arsitektur secara besar-besaran.

Jangan memasukkan dependency yang tidak diperlukan.

---

# 3. DESAIN UI/UX PREMIUM

Buat identitas visual orisinal untuk Ritual.

## Dark mode

- Latar belakang charcoal atau hampir hitam.
- Kartu menggunakan warna permukaan gelap yang sedikit berbeda dari latar belakang.
- Garis pemisah tipis dan halus.
- Teks utama berkontras tinggi.
- Teks sekunder berwarna abu-abu.
- Warna aksen hijau sage digunakan secara terukur (tombol utama, item aktif, fokus). Menggantikan aksen awal; diubah pada Fase 9 atas permintaan pemilik proyek.
- Setiap kategori kebiasaan punya ikon dan warna aksen sendiri yang tidak mirip dengan aksen utama.
- Semua warna antarmuka berasal dari design token (`src/index.css`), mendukung Terang, Gelap, dan Sistem. Kontrasnya diukur dengan skrip (`npm run contrast`), bukan diperkirakan.
- Status selesai dapat menggunakan warna hijau yang tetap mudah dibaca.

## Light mode

- Latar belakang putih atau abu-abu sangat muda.
- Kartu putih.
- Border netral yang lembut.
- Teks utama berwarna gelap.
- Warna aksen konsisten dengan dark mode.

## Gaya desain

- Minimalis, rapi, profesional, dan premium.
- Tipografi modern seperti Inter.
- Spacing konsisten.
- Ikon Lucide dengan ukuran seragam.
- Animasi singkat dan halus.
- Hindari terlalu banyak gradient, shadow berat, atau kartu berlebihan.
- Gunakan desain mobile-first.
- Hormati preferensi reduced motion.
- Pastikan aksesibilitas, kontras, keyboard navigation, dan focus state.

## Navigasi

Desktop:
- Sidebar di sebelah kiri.
- Konten utama di sebelah kanan.
- Profil dan pengaturan di area navigasi yang sesuai.

Mobile:
- Navigasi bawah yang mudah dijangkau.
- Header ringkas.
- Formulir dan dialog yang nyaman digunakan dengan sentuhan.
- Tidak ada konten yang terpotong atau overflow horizontal.

## Tema

Sediakan tiga pilihan:
- Terang.
- Gelap.
- Mengikuti sistem perangkat.

Simpan preferensi tema dan pulihkan ketika aplikasi dibuka kembali.

---

# 4. SELURUH ANTARMUKA WAJIB BERBAHASA INDONESIA

Jangan menggunakan teks UI bahasa Inggris pada aplikasi yang ditujukan kepada pengguna.

Gunakan istilah berikut secara konsisten:

- Dashboard → Beranda
- My Habits → Kebiasaan Saya
- Calendar → Kalender
- Analytics → Statistik
- Settings → Pengaturan
- Profile → Profil
- Add Habit → Tambah Kebiasaan
- Edit → Ubah
- Delete → Hapus
- Save → Simpan
- Cancel → Batal
- Mark Complete → Tandai Selesai
- Completed → Selesai
- Current Streak → Rentetan Saat Ini
- Longest Streak → Rekor Konsistensi
- Weekly Progress → Progres Mingguan
- Monthly Progress → Progres Bulanan
- Recent Activity → Aktivitas Terbaru
- Loading → Memuat
- Retry → Coba Lagi
- Log Out → Keluar

Contoh pesan:

- "Kebiasaan berhasil ditambahkan."
- "Perubahan berhasil disimpan."
- "Terjadi kesalahan. Silakan coba lagi."
- "Belum ada kebiasaan."
- "Apakah kamu yakin ingin menghapus kebiasaan ini?"
- "Tidak ada aktivitas pada tanggal ini."

Gunakan Bahasa Indonesia yang natural, ringkas, dan konsisten.

Format tanggal dan angka mengikuti locale id-ID.

Audit semua teks yang terlihat pengguna, termasuk validasi formulir, dialog, toast, halaman login, halaman pemulihan kata sandi, halaman 404, pesan error, dan halaman offline.

Jangan menerjemahkan nama variabel atau kode program hanya demi membuat UI berbahasa Indonesia.

---

# 5. HALAMAN DAN ROUTING

Implementasikan route berikut:

/ 
- Arahkan ke halaman yang sesuai berdasarkan status autentikasi.

/login
- Halaman masuk.

/signup
- Halaman pendaftaran.

/forgot-password
- Pemulihan kata sandi.

/app
- Beranda dan dashboard.

/app/habits
- Daftar dan pengelolaan kebiasaan.

/app/calendar
- Kalender dan riwayat aktivitas.

/app/analytics
- Statistik dan analisis progres.

/app/settings
- Preferensi aplikasi dan pengaturan.

/app/profile
- Profil pengguna.

Buat route yang terlindungi untuk halaman yang membutuhkan autentikasi.

Pengguna yang belum masuk harus diarahkan ke halaman masuk ketika membuka halaman privat.

Setelah login berhasil, arahkan pengguna ke halaman yang tepat.

Halaman 404 harus memiliki tombol kembali yang benar-benar berfungsi.

Dukung browser back dan forward.

Tautan navigasi harus mengarah ke route yang benar, dan navigasi aktif harus ditandai dengan jelas.

Jangan membuat halaman kosong atau tautan palsu.

---

# 6. DASHBOARD BERANDA

Dashboard harus menampilkan:

1. Sapaan berdasarkan waktu lokal pengguna.
2. Tanggal hari ini dalam format Indonesia.
3. Persentase progres hari ini.
4. Jumlah kebiasaan selesai dibanding kebiasaan yang dijadwalkan.
5. Ringkasan rentetan kebiasaan.
6. Daftar kebiasaan hari ini.
7. Grafik progres mingguan.
8. Aktivitas terbaru.
9. Tombol tambah kebiasaan.
10. Ringkasan pencapaian.

Contoh tampilan:

"Selamat pagi!"

"Sudah berapa jauh progresmu hari ini?"

"Progres Hari Ini: 3 dari 5 kebiasaan."

Daftar kebiasaan harus menampilkan:
- Ikon.
- Nama kebiasaan.
- Kategori.
- Target atau keterangan singkat jika tersedia.
- Status selesai atau belum selesai.
- Tombol untuk menandai selesai.

Saat kebiasaan ditandai selesai:
- Data benar-benar disimpan.
- Status UI langsung diperbarui.
- Persentase progres dihitung ulang.
- Statistik terkait diperbarui.
- Rentetan diperbarui jika relevan.
- Tampilkan umpan balik yang sesuai.

Jika penyimpanan gagal, jangan tampilkan pesan sukses palsu. Tampilkan error dan berikan opsi mencoba lagi.

---

# 7. MANAJEMEN KEBIASAAN

Implementasikan fitur lengkap:

- Tambah kebiasaan.
- Lihat daftar kebiasaan.
- Ubah kebiasaan.
- Arsipkan kebiasaan.
- Hapus kebiasaan.
- Tandai selesai.
- Batalkan status selesai.
- Cari kebiasaan.
- Filter berdasarkan kategori dan status jika relevan.

Setiap kebiasaan memiliki:

- ID.
- User ID.
- Nama.
- Deskripsi opsional.
- Kategori.
- Ikon.
- Warna.
- Frekuensi.
- Hari yang dipilih.
- Tanggal mulai.
- Status aktif atau arsip.
- Waktu pembuatan.
- Waktu perubahan.

Frekuensi minimal:
- Setiap hari.
- Hari tertentu dalam seminggu.

Kategori awal:
- Kesehatan.
- Olahraga.
- Belajar.
- Produktivitas.
- Keuangan.
- Mindfulness.
- Lainnya.

Form tambah dan ubah harus memiliki validasi yang benar.

Tombol batal tidak boleh menyimpan perubahan.

Tombol hapus harus meminta konfirmasi.

Jika pengguna menghapus kebiasaan, jelaskan dampaknya pada riwayat dan statistik. Gunakan pendekatan yang menjaga integritas data, misalnya arsip untuk kebiasaan yang tidak lagi digunakan dan penghapusan permanen dengan konfirmasi jika diperlukan.

---

# 8. SISTEM PENYELESAIAN DAN STREAK

Buat modul bisnis terpisah untuk menghitung streak.

Bedakan:

- Rentetan saat ini.
- Rekor rentetan terpanjang.
- Total hari penyelesaian.
- Persentase keberhasilan.
- Penyelesaian sesuai jadwal.

Aturan:

1. Gunakan zona waktu pengguna.
2. Simpan tanggal penyelesaian sebagai tanggal kalender DATE dengan format YYYY-MM-DD.
3. Jangan hanya mengandalkan timestamp UTC untuk menentukan tanggal penyelesaian.
4. Habit harian dinilai berdasarkan jadwal hariannya.
5. Habit dengan jadwal tertentu hanya dinilai pada hari yang dijadwalkan.
6. Hari yang tidak dijadwalkan tidak memutus rentetan.
7. Habit yang belum mulai atau sudah diarsipkan tidak boleh dihitung sembarangan.
8. Tangani hari ini, hari yang terlewat, tanggal masa depan, dan batas pergantian minggu dengan benar.
9. Tetapkan aturan eksplisit untuk rentetan saat hari ini belum selesai.
10. Rekor terpanjang dihitung dari seluruh riwayat valid.

Tuliskan unit test untuk logika streak, termasuk:
- Habit setiap hari.
- Habit tiga kali seminggu.
- Hari yang terlewat.
- Perubahan bulan.
- Pergantian tahun.
- Zona waktu.
- Perubahan jadwal.
- Data kosong.
- Tanggal masa depan.

Jangan menulis algoritma streak secara berulang di setiap komponen.

Gunakan satu sumber logika yang dapat diuji.

---

# 9. KALENDER

Buat halaman kalender bulanan.

Fitur:
- Bulan sebelumnya.
- Bulan berikutnya.
- Penanda tanggal dengan aktivitas.
- Pemilihan tanggal.
- Ringkasan penyelesaian untuk tanggal terpilih.
- Daftar kebiasaan pada tanggal tersebut.
- Status selesai, belum selesai, tidak dijadwalkan, dan tanggal masa depan.
- Riwayat aktivitas yang tersimpan.

Saat pengguna memilih tanggal, detail tanggal harus berubah.

Saat bulan diganti, kalender harus menampilkan bulan yang benar.

Jangan menggunakan data hardcoded sebagai sumber data kalender untuk pengguna yang sudah login.

Pastikan tanggal tidak bergeser akibat parsing tanggal yang salah.

---

# 10. STATISTIK DAN ANALYTICS

Implementasikan:

- Persentase penyelesaian mingguan.
- Persentase penyelesaian bulanan.
- Grafik progres per hari.
- Grafik performa setiap kebiasaan.
- Rentetan saat ini.
- Rekor rentetan terpanjang.
- Total penyelesaian.
- Heatmap aktivitas.
- Riwayat pencapaian.

Definisi persentase:

Jumlah penyelesaian valid dibagi jumlah kewajiban penyelesaian yang dijadwalkan dalam periode tersebut, dikali 100.

Tentukan secara eksplisit bagaimana kebiasaan yang diarsipkan, belum dimulai, atau memiliki perubahan jadwal diperlakukan.

Semua angka harus berasal dari data yang benar-benar tersimpan.

Klik pada grafik, kartu statistik, atau kebiasaan harus membuka detail yang relevan jika elemen tersebut disajikan sebagai elemen interaktif.

Jika tidak ada data, tampilkan halaman kosong yang informatif, bukan grafik dengan data palsu.

---

# 11. AUTENTIKASI DAN DATABASE SUPABASE

Gunakan Supabase Auth dan PostgreSQL.

Fitur autentikasi:

- Pendaftaran dengan email dan kata sandi.
- Login.
- Logout.
- Pemulihan kata sandi.
- Pemulihan sesi setelah refresh.
- Validasi formulir.
- Pesan error yang mudah dipahami.
- Proteksi route.
- Verifikasi email jika dikonfigurasi.

Buat migration SQL untuk:

profiles:
- id.
- display_name.
- created_at.
- updated_at.

habits:
- id.
- user_id.
- name.
- description.
- category.
- icon.
- color.
- frequency.
- scheduled_days.
- start_date.
- archived_at.
- created_at.
- updated_at.

habit_completions:
- id.
- habit_id.
- user_id.
- completed_date.
- completed_at.
- created_at.

user_settings:
- user_id.
- theme.
- timezone.
- locale.
- created_at.
- updated_at.

Sesuaikan skema jika diperlukan, tetapi dokumentasikan alasannya.

Tambahkan:
- Foreign key yang tepat.
- Unique constraint agar satu habit tidak memiliki penyelesaian ganda untuk tanggal yang sama.
- Index untuk pencarian berdasarkan user, habit, dan tanggal.
- Timestamp yang sesuai.
- Validasi dan constraint database.

Jangan mengandalkan frontend sebagai satu-satunya pengaman data.

Aktifkan RLS untuk semua tabel yang berisi data pengguna.

Pastikan pengguna hanya dapat membaca dan mengubah data miliknya sendiri.

Pastikan completion record selalu terkait dengan habit yang dimiliki pengguna yang sama.

Jangan pernah mengekspos service-role key pada frontend.

Gunakan environment variables.

Buat file .env.example dengan nama variabel dan placeholder saja.

Contoh variabel:

VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=

Sesuaikan dengan format credential Supabase yang tersedia pada proyek.

Jangan menaruh secret asli dalam source code, dokumentasi publik, atau repository.

Sertakan SQL migration dan petunjuk menjalankannya.

Uji isolasi data antar pengguna. Jangan mengklaim keamanan sudah terverifikasi jika belum diuji.

---

# 12. SEMUA TOMBOL HARUS BENAR-BENAR BERFUNGSI

Ini merupakan persyaratan wajib.

Jangan membuat tombol pajangan.

Jangan membuat tautan dengan href="#".

Jangan menggunakan handler kosong.

Jangan menampilkan pesan sukses palsu.

Jangan membuat tombol yang hanya berfungsi secara visual.

Setiap elemen interaktif harus memiliki tujuan dan perilaku yang jelas.

Contoh:

- Logo membuka beranda yang benar.
- Beranda membuka dashboard.
- Kebiasaan Saya membuka daftar kebiasaan.
- Kalender membuka kalender.
- Statistik membuka halaman statistik.
- Pengaturan membuka pengaturan.
- Tambah Kebiasaan membuka formulir yang berfungsi.
- Simpan memvalidasi dan menyimpan data.
- Ubah membuka formulir dengan data lama.
- Hapus meminta konfirmasi dan menghapus data yang tepat.
- Checkbox menyimpan status penyelesaian.
- Batalkan mengembalikan status sesuai aturan.
- Tombol bulan sebelumnya dan berikutnya mengubah kalender.
- Filter benar-benar memfilter data.
- Tombol tema mengganti tampilan.
- Logout mengakhiri sesi.
- Tombol kembali membawa pengguna ke lokasi yang tepat.
- Tombol coba lagi mengulangi operasi yang gagal.

Untuk setiap operasi:
- Tampilkan status loading saat diperlukan.
- Cegah submit ganda.
- Tampilkan pesan sukses hanya setelah operasi berhasil.
- Tampilkan pesan error jika operasi gagal.
- Pastikan UI konsisten dengan database.
- Pastikan data tetap tersedia setelah halaman di-refresh.

Gunakan button untuk tindakan dan link untuk navigasi.

Sembunyikan atau nonaktifkan fitur yang belum diimplementasikan, dan jelaskan keterbatasannya jika relevan.

---

# 13. PWA DAN PERILAKU OFFLINE

Buat aplikasi yang dapat diinstal sebagai PWA pada browser dan perangkat yang mendukung.

Implementasikan:

- Web App Manifest.
- Nama aplikasi Ritual.
- Nama pendek aplikasi.
- Ikon aplikasi yang benar.
- Warna tema.
- Start URL.
- Display mode standalone.
- Service worker.
- Cache app shell yang aman.
- Halaman fallback offline.
- Penanganan versi aplikasi baru.
- Panduan instalasi untuk browser yang tidak mendukung prompt instalasi langsung.

Gunakan HTTPS pada deployment.

Jangan meng-cache respons API yang berisi data privat dengan cara yang memungkinkan kebocoran antar pengguna.

Jika offline completion belum memiliki antrean sinkronisasi yang aman, jangan mengklaim aplikasi mendukung perubahan offline penuh.

Implementasikan antrean offline hanya jika tersedia strategi yang jelas untuk:
- Penyimpanan lokal.
- Sinkronisasi ulang.
- Konflik data.
- Duplikasi.
- Pergantian akun.
- Kegagalan jaringan.

Jika fitur sinkronisasi offline belum tersedia, tampilkan status offline secara jujur.

Notifikasi push dan background sync hanya boleh ditampilkan sebagai fitur aktif setelah benar-benar diimplementasikan dan diuji.

---

# 14. STRUKTUR KODE

Gunakan arsitektur modular.

Contoh:

src/
  app/
  components/
    ui/
    layout/
  features/
    auth/
    dashboard/
    habits/
    calendar/
    analytics/
    settings/
    profile/
  hooks/
  lib/
    supabase/
    dates/
    streaks/
    validation/
  types/
  test/

supabase/
  migrations/
  tests/

public/
  icons/

Gunakan struktur yang sesuai dengan ukuran proyek.

Pisahkan:
- Komponen UI.
- Logika bisnis.
- Akses database.
- Validasi.
- Perhitungan statistik.
- Logika tanggal.
- Autentikasi.
- Pengujian.

Hindari satu file yang terlalu besar.

Gunakan TypeScript dengan tipe yang jelas.

Tangani error secara konsisten.

Dokumentasikan keputusan arsitektur yang penting.

---

# 15. PENGUJIAN WAJIB

Buat dan jalankan pengujian untuk:

- Pendaftaran.
- Login dan logout.
- Route protection.
- Pembuatan kebiasaan.
- Pengubahan kebiasaan.
- Penghapusan kebiasaan.
- Penyelesaian dan pembatalan penyelesaian.
- Pencegahan duplikasi.
- Perhitungan streak.
- Kalender.
- Statistik.
- Pergantian tema.
- Penyimpanan preferensi.
- Isolasi data RLS.
- Responsivitas.
- Navigasi.
- Penanganan error.
- PWA build.

Gunakan browser automation jika lingkungan mendukung.

Uji setidaknya:
- Tampilan mobile.
- Tampilan desktop.
- Pengguna yang belum login.
- Pengguna yang sudah login.
- Data kosong.
- Data yang sudah ada.
- Error jaringan jika dapat disimulasikan.

Jalankan:
- TypeScript checks.
- Lint.
- Unit tests.
- Build produksi.
- Pengujian browser yang tersedia.

Perbaiki error yang ditemukan.

Jangan mengklaim suatu pengujian berhasil jika belum benar-benar dijalankan.

---

# 16. AUDIT SEMUA INTERAKSI

Sebelum menyatakan aplikasi selesai:

1. Daftar semua halaman.
2. Daftar semua tombol, link, menu, filter, tab, formulir, dan kartu interaktif.
3. Tentukan hasil yang seharusnya terjadi saat setiap elemen digunakan.
4. Uji setiap elemen.
5. Pastikan navigasi menuju route yang benar.
6. Pastikan operasi database benar-benar menyimpan perubahan.
7. Pastikan halaman tetap berfungsi setelah refresh.
8. Periksa semua teks agar menggunakan Bahasa Indonesia.
9. Periksa dark mode dan light mode.
10. Periksa tampilan mobile dan desktop.
11. Periksa console error.
12. Perbaiki setiap tombol mati dan tautan rusak.
13. Uji ulang setelah perbaikan.

Buat laporan audit dengan status:
- Lulus.
- Gagal.
- Belum diuji.
- Memerlukan konfigurasi manual.

Jangan menyatakan semua tombol berfungsi hanya berdasarkan inspeksi visual.

---

# 17. DEPLOYMENT DAN DOKUMENTASI

Siapkan aplikasi agar mudah dipublikasikan.

Dokumentasikan:

- Instalasi dependency.
- Menjalankan development server.
- Pengaturan environment variables.
- Membuat proyek Supabase.
- Menjalankan SQL migrations.
- Konfigurasi autentikasi dan redirect URL.
- Konfigurasi domain.
- Deployment ke Vercel.
- Persyaratan HTTPS untuk PWA.
- Cara menjalankan pengujian.
- Cara membuat build produksi.
- Fitur yang sudah selesai dan belum selesai.

Jangan memasukkan credential pribadi ke README.

Jangan menyatakan aplikasi telah dipublikasikan jika deployment belum dilakukan.

Jika memerlukan tindakan manual dari saya, jelaskan secara spesifik apa yang harus saya klik atau isi.

---

# 18. STRATEGI PELAKSANAAN

Jangan mencoba mengerjakan seluruh aplikasi dalam satu perubahan besar.

Ikuti urutan berikut:

FASE 1 — Audit repository, rencana, dan fondasi.
FASE 2 — Design system dan UI responsif.
FASE 3 — Dashboard dan manajemen kebiasaan.
FASE 4 — Supabase Auth, database, dan RLS.
FASE 5 — Penyelesaian kebiasaan dan streak.
FASE 6 — Kalender dan statistik.
FASE 7 — PWA.
FASE 8 — Pengujian, audit interaksi, dan deployment readiness.

Pada setiap fase:

1. Periksa kondisi proyek saat ini.
2. Implementasikan fitur terkait.
3. Jalankan pengujian yang relevan.
4. Perbaiki error.
5. Ringkas file yang diubah.
6. Jelaskan fitur yang berhasil dan belum selesai.
7. Lanjutkan ke fase berikutnya setelah fondasi fase sebelumnya cukup stabil.

Jika ada credential atau akses eksternal yang belum tersedia, implementasikan bagian yang tidak memerlukannya terlebih dahulu. Berikan instruksi konfigurasi yang aman tanpa berpura-pura integrasi sudah selesai.

Jika menemukan masalah teknis, investigasi akar penyebabnya dan perbaiki secara sistematis.

Jangan menghapus kode yang sudah berfungsi tanpa alasan yang jelas.

---

# 19. KRITERIA SELESAI

Aplikasi baru boleh dianggap siap ketika:

- Semua halaman utama tersedia.
- Seluruh UI menggunakan Bahasa Indonesia.
- Dark mode dan light mode berfungsi.
- Navigasi bekerja di desktop dan mobile.
- Pengguna dapat mendaftar dan login.
- Data tersimpan di Supabase.
- RLS membatasi akses antar pengguna.
- Pengguna dapat mengelola kebiasaan.
- Penyelesaian kebiasaan tersimpan dengan benar.
- Streak dan statistik memiliki hasil yang konsisten.
- Kalender bekerja sesuai tanggal lokal.
- PWA dapat diinstal pada lingkungan yang mendukung.
- Tidak ada tombol mati yang diketahui.
- Pengujian utama berhasil.
- Build produksi berhasil.
- Dokumentasi setup tersedia.
- Keterbatasan yang tersisa dilaporkan secara jujur.

Mulai dengan memeriksa workspace yang tersedia. Buat rencana implementasi yang konkret, jelaskan struktur proyek yang akan digunakan, kemudian mulai Fase 1.

Jika kamu memiliki akses terminal dan file, kerjakan langsung di repository. Jangan berhenti setelah membuat rencana saja. Lanjutkan implementasi secara bertahap dan verifikasi hasilnya.