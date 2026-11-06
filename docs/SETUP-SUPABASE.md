# Panduan Setup Supabase untuk Ritual

Panduan ini untuk kamu yang belum pernah memakai Supabase. Ikuti urut dari atas ke bawah. Estimasi: 15–20 menit.

> **Status pengujian:** langkah dan nama menu di bawah disusun dari dokumentasi resmi Supabase (diperiksa 1 November 2026).
> Dasbor Supabase sering berubah tampilan, jadi bila ada menu yang namanya sedikit berbeda, cari kata kuncinya di kotak pencarian dasbor.
> **Panduan ini belum pernah dijalankan pada proyek Supabase nyata** (oleh siapa pun di proyek ini). Jika ada langkah yang gagal, catat pesan errornya.

---

## 1. Buat proyek

1. Buka <https://supabase.com> → **Sign in** (bisa dengan GitHub atau email).
2. Klik **New project**.
3. Isi:
   - **Organization**: pilih organisasi pribadimu (dibuat otomatis saat pertama masuk).
   - **Project name**: `ritual`.
   - **Database password**: klik **Generate a password**, lalu **simpan di pengelola kata sandi**. Aplikasi tidak memakainya, tetapi kamu butuh bila suatu saat mengakses database langsung.
   - **Region**: pilih yang terdekat dengan penggunamu (untuk Medan, biasanya **Southeast Asia (Singapore)**).
4. Klik **Create new project** dan tunggu beberapa menit sampai proyek siap.

## 2. Jalankan migration SQL (membuat tabel + keamanan RLS)

1. Di menu kiri proyek, klik **SQL Editor**.
2. Klik **New query**.
3. Ada **dua** file di folder `supabase/migrations/`. Jalankan **berurutan sesuai nama (angka terkecil dulu)**, satu per satu:
   1. `20261031000000_init.sql` (tabel, keamanan RLS)
   2. `20261101000000_backfill_limit.sql` (batas mundur 30 hari untuk penyelesaian)

   Untuk masing-masing: buka file dengan editor teks, salin **seluruh** isinya, tempel ke SQL Editor (gunakan **New query** baru tiap file).
4. Klik **Run** (atau Ctrl/Cmd + Enter). Hasil yang benar untuk keduanya: **Success. No rows returned**.
5. Pastikan hasilnya: menu kiri **Table Editor** → harus ada 4 tabel: `profiles`, `user_settings`, `habits`, `habit_completions`. Tabel-tabel itu seharusnya ditandai RLS aktif.

Catatan:
- Jalankan tiap migration **sekali saja**, dan selalu berurutan. File kedua mengganti satu fungsi dari file pertama, jadi jangan dibalik.
- Jika sebelumnya kamu sudah menjalankan file pertama, cukup jalankan file kedua.
- Jangan mengubah isi file migration. Keamanan data antar pengguna bergantung padanya.
- Untuk mengulang dari nol saat uji coba, cara termudah adalah menghapus proyek lalu membuat yang baru.

## 3. Ambil URL dan kunci

1. Di bagian atas halaman proyek klik tombol **Connect** (menampilkan URL dan kunci siap salin).
   Alternatif: ikon gerigi **Project Settings** → **API Keys**.
2. Salin dua nilai:
   - **Project URL**: bentuknya `https://xxxxxxxx.supabase.co`.
   - **Publishable key**: bentuknya `sb_publishable_...`.
3. Jika kamu tidak melihat publishable key (biasanya di proyek lama), klik **Create new API keys** di halaman **API Keys**.

> ⚠️ **Jangan pernah** memakai **Secret key** (`sb_secret_...`) atau `service_role` di aplikasi ini. Kunci itu melewati seluruh aturan keamanan. Frontend hanya boleh memakai publishable key.

## 4. Isi `.env.local`

Di folder proyek Ritual, buat file `.env.local` dari contoh:

- Mac/Linux: `cp .env.example .env.local`
- Windows (PowerShell): `copy .env.example .env.local`

Isi dua barisnya (tanpa tanda kutip, tanpa spasi):

```
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Lalu **hentikan dan jalankan ulang** server pengembangan (`npm run dev`). Perubahan `.env.local` tidak terbaca tanpa restart.
File `.env.local` otomatis diabaikan git, jadi tidak ikut ter-commit. Pastikan kamu tidak membagikannya.

Jika halaman menampilkan "Ritual belum terhubung ke Supabase", berarti salah satu variabel kosong, salah ketik, atau server belum di-restart.

## 5. Atur URL redirect (termasuk `/reset-password`)

Tanpa ini, tautan di email (verifikasi dan pemulihan kata sandi) akan ditolak atau mengarah ke tempat yang salah.

1. Menu kiri **Authentication** → **URL Configuration**.
2. **Site URL**: isi alamat aplikasimu.
   - Pengembangan: `http://localhost:5173` (periksa port yang tampil di terminal saat `npm run dev`).
3. **Redirect URLs** → **Add URL**, tambahkan dua alamat berikut satu per satu:
   - `http://localhost:5173/login` ← tujuan setelah verifikasi email
   - `http://localhost:5173/reset-password` ← tujuan tautan pemulihan kata sandi
4. Klik **Save changes**.

Untuk produksi (setelah deploy), tambahkan juga, dengan `domainmu.com` diganti domain aslimu:
- Site URL: `https://domainmu.com`
- Redirect URLs: `https://domainmu.com/login` dan `https://domainmu.com/reset-password`

Dokumentasi Supabase menyarankan alamat persis seperti di atas untuk produksi. Pola wildcard `**` memang diizinkan, tetapi lebih cocok untuk pengembangan lokal dan URL preview.

## 6. Pengaturan verifikasi email

Menu: **Authentication** → **Sign In / Providers** → **Email**.

**Confirm email** (verifikasi email):

| Pilihan | Artinya | Kapan dipakai |
|---|---|---|
| **Aktif** | Pengguna harus mengklik tautan di email sebelum bisa masuk. Aplikasi menampilkan halaman "Periksa email kamu". | Produksi. Wajib sebelum dibuka untuk umum. |
| **Nonaktif** | Pendaftaran langsung masuk tanpa verifikasi. | Hanya uji coba lokal. Siapa pun bisa mendaftar dengan email yang bukan miliknya. **Aktifkan lagi sebelum publik.** |

**Batas email bawaan (penting):** layanan email bawaan Supabase hanya untuk mencoba. Menurut dokumentasi resmi, saat Confirm email aktif ia hanya mengirim sekitar **2 email per jam untuk seluruh proyek** dan hanya ke alamat yang diizinkan (anggota tim proyek). Karena itu:
- Untuk uji coba, daftar dan uji dengan **email milikmu sendiri** (pemilik proyek), dan jangan mengulang terlalu sering.
- Jika muncul pesan "Terlalu banyak email terkirim", tunggu sebentar.
- Untuk dipakai orang lain, pasang **SMTP kustom** (layanan seperti Resend, SendGrid, atau Postmark). Menunya ada di **Authentication** → **Emails** → **SMTP Settings**. Bila tidak ketemu, cari "SMTP" di dasbor. Batas pengiriman bisa diubah di **Authentication** → **Rate Limits**.

**Panjang kata sandi minimum:** aplikasi mewajibkan minimal 8 karakter. Bila pengaturan *Minimum password length* tersedia di halaman provider Email tadi, samakan menjadi 8 agar server dan aplikasi sejalan.

## 7. Uji cepat

1. Buka `http://localhost:5173` → **Daftar** dengan email milikmu → (bila verifikasi aktif) klik tautan di email → **Masuk**.
2. **Tambah Kebiasaan**, lalu tandai selesai di Beranda.
3. Di dasbor Supabase buka **Table Editor** → `habits` dan `habit_completions`. Baris yang baru dibuat harus ada, dengan `user_id` yang sama dengan akunmu.
4. **Uji isolasi:** buka jendela penyamaran (incognito), daftar dengan akun kedua. Akun kedua **tidak boleh** melihat kebiasaan akun pertama.
   > Jangan menguji isolasi lewat Table Editor. Table Editor berjalan sebagai admin sehingga melihat semua data. Ujilah lewat aplikasi.
5. **Lupa kata sandi:** klik **Lupa kata sandi?**, buka tautan dari email. Kamu harus mendarat di `/reset-password` dan bisa memasukkan kata sandi baru.

## 8. Masalah umum

| Gejala | Kemungkinan penyebab |
|---|---|
| "Ritual belum terhubung ke Supabase" | `.env.local` belum diisi/typo, atau server belum di-restart. |
| Tautan email membawa ke halaman salah atau error "redirect URL not allowed" | Alamat belum ada di **Redirect URLs** (langkah 5), atau port/domain tidak sama persis. |
| "Terlalu banyak email terkirim" | Batas email bawaan (langkah 6). Tunggu, atau pasang SMTP kustom. |
| Email tidak datang | Cek folder spam; pastikan alamat adalah milik anggota proyek bila memakai layanan bawaan. |
| Setelah daftar tidak langsung masuk | Itu normal bila Confirm email aktif. Verifikasi dulu lewat email. |
| Data tidak muncul setelah login | Pastikan migration (langkah 2) sukses dan keempat tabel ada. |

## 9. Keamanan singkat

- Hanya **Project URL** dan **Publishable key** yang boleh masuk ke aplikasi.
- Jangan commit `.env.local`, jangan tempel kunci di chat/README/screenshot publik.
- Bila kunci rahasia pernah bocor, buat kunci baru di **Project Settings** → **API Keys** lalu hapus yang lama.
