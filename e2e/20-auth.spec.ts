import { test, expect, login, seed, EMAIL, PASSWORD } from './fixtures'

test.describe('autentikasi dan proteksi route', () => {
  test('pengguna belum masuk diarahkan ke /login, lalu kembali ke halaman tujuan setelah masuk', async ({ page, mock, user }) => {
    seed(mock, user)
    await page.goto('/app/habits')
    await expect(page).toHaveURL(/\/login$/)
    await page.getByLabel('Email').fill(EMAIL)
    await page.getByLabel('Kata sandi').fill(PASSWORD)
    await page.getByRole('button', { name: 'Masuk' }).click()
    await expect(page).toHaveURL(/\/app\/habits$/)
    await expect(page.getByRole('heading', { name: 'Kebiasaan Saya' })).toBeVisible()
  })

  test('"/" mengarah sesuai status: login bila belum masuk, /app bila sudah', async ({ page, mock, user }) => {
    seed(mock, user)
    await page.goto('/')
    await expect(page).toHaveURL(/\/login$/)
    await login(page)
    await page.goto('/')
    await expect(page).toHaveURL(/\/app$/)
  })

  test('login dengan kata sandi salah: pesan Indonesia, tetap di /login, tanpa teks mentah server', async ({ page, user }) => {
    void user
    await page.goto('/login')
    await page.getByLabel('Email').fill(EMAIL)
    await page.getByLabel('Kata sandi').fill('salah-salah')
    await page.getByRole('button', { name: 'Masuk' }).click()
    await expect(page.getByRole('alert')).toHaveText('Email atau kata sandi salah.')
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.locator('body')).not.toContainText('Invalid login credentials')
  })

  test('validasi formulir login: kolom kosong dan email tidak valid tidak mengirim permintaan', async ({ page, mock, user }) => {
    void user
    await page.goto('/login')
    const before = mock.requests.length
    await page.getByRole('button', { name: 'Masuk' }).click()
    await expect(page.getByText('Email wajib diisi.')).toBeVisible()
    await expect(page.getByText('Kata sandi wajib diisi.')).toBeVisible()
    await page.getByLabel('Email').fill('bukan-email')
    await page.getByLabel('Kata sandi').fill('x')
    await page.getByRole('button', { name: 'Masuk' }).click()
    await expect(page.getByText('Format email tidak valid.')).toBeVisible()
    expect(mock.requests.length).toBe(before)
  })

  test('daftar: validasi, lalu berhasil (tanpa verifikasi email) langsung masuk ke /app', async ({ page, mock }) => {
    await page.goto('/signup')
    await page.getByRole('button', { name: 'Daftar' }).click()
    await expect(page.getByText('Nama wajib diisi.')).toBeVisible()
    await page.getByLabel('Nama', { exact: true }).fill('Budi')
    await page.getByLabel('Email').fill('budi@ritual.test')
    await page.getByLabel('Kata sandi', { exact: true }).fill('pendek')
    await page.getByLabel('Konfirmasi kata sandi').fill('beda')
    await page.getByRole('button', { name: 'Daftar' }).click()
    await expect(page.getByText('Kata sandi minimal 8 karakter.')).toBeVisible()
    await expect(page.getByText('Konfirmasi kata sandi tidak sama.')).toBeVisible()
    await page.getByLabel('Kata sandi', { exact: true }).fill('KataSandiBaik1')
    await page.getByLabel('Konfirmasi kata sandi').fill('KataSandiBaik1')
    await page.getByRole('button', { name: 'Daftar' }).click()
    await expect(page).toHaveURL(/\/app$/)
    expect(mock.users.some((u) => u.email === 'budi@ritual.test' && u.displayName === 'Budi')).toBe(true)
  })

  test('daftar dengan email sudah terdaftar menampilkan pesan Indonesia', async ({ page, user }) => {
    void user
    await page.goto('/signup')
    await page.getByLabel('Nama', { exact: true }).fill('Dewi')
    await page.getByLabel('Email').fill(EMAIL)
    await page.getByLabel('Kata sandi', { exact: true }).fill('KataSandiBaik1')
    await page.getByLabel('Konfirmasi kata sandi').fill('KataSandiBaik1')
    await page.getByRole('button', { name: 'Daftar' }).click()
    await expect(page.getByRole('alert')).toHaveText('Email sudah terdaftar. Silakan masuk.')
  })

  test.describe('verifikasi email aktif', () => {
    test.use({ mockOptions: { requireEmailConfirmation: true } })
    // BELUM TERVERIFIKASI: di Chromium, supabase-js melaporkan "Failed to fetch" pada respons signUp tanpa sesi dari mock ini,
    // padahal permintaan yang sama dari page.evaluate() berstatus 200 dan supabase-js di Node mengurainya dengan benar.
    // Penyebab belum ditemukan (mock atau aplikasi belum bisa dibedakan). Uji manual: PANDUAN-UJI-MANUAL.md, bagian A.
    test.fixme('daftar menampilkan petunjuk verifikasi, bukan masuk otomatis', async ({ page }) => {
      await page.goto('/signup')
      await page.getByLabel('Nama', { exact: true }).fill('Citra')
      await page.getByLabel('Email').fill('citra@ritual.test')
      await page.getByLabel('Kata sandi', { exact: true }).fill('KataSandiBaik1')
      await page.getByLabel('Konfirmasi kata sandi').fill('KataSandiBaik1')
      await page.getByRole('button', { name: 'Daftar' }).click()
      await expect(page.getByText('Kami telah mengirim tautan verifikasi ke')).toBeVisible()
      await page.getByRole('link', { name: 'Ke halaman masuk' }).click()
      await expect(page).toHaveURL(/\/login$/)
    })
  })

  test('lupa kata sandi: validasi lalu pesan netral (tidak membocorkan apakah email terdaftar)', async ({ page, mock }) => {
    await page.goto('/login')
    await page.getByRole('link', { name: 'Lupa kata sandi?' }).click()
    await expect(page).toHaveURL(/\/forgot-password$/)
    await page.getByRole('button').filter({ hasText: /Kirim/ }).click()
    await expect(page.getByText('Email wajib diisi.')).toBeVisible()
    await page.getByLabel('Email').fill('siapa-saja@ritual.test')
    await page.getByRole('button').filter({ hasText: /Kirim/ }).click()
    await expect(page.getByText('Jika email tersebut terdaftar, tautan pemulihan kata sandi telah dikirim.')).toBeVisible()
    expect(mock.requests.some((r) => r.url.includes('/auth/v1/recover'))).toBe(true)
    await page.getByRole('link', { name: /Kembali/ }).click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('tautan pemulihan tanpa token: /reset-password menampilkan pesan tidak valid dengan jalan keluar', async ({ page }) => {
    await page.goto('/reset-password')
    await expect(page.getByText('Tautan pemulihan tidak valid atau sudah kedaluwarsa.')).toBeVisible()
    await page.getByRole('link', { name: 'Minta tautan baru' }).click()
    await expect(page).toHaveURL(/\/forgot-password$/)
  })

  test('keluar dari sidebar mengakhiri sesi; tombol kembali tidak membuka /app lagi', async ({ page, mock, user }) => {
    seed(mock, user)
    await login(page)
    await page.getByRole('button', { name: 'Keluar' }).click()
    await expect(page).toHaveURL(/\/login$/)
    await page.goBack() // riwayat awal bisa about:blank; yang penting bukan halaman privat
    expect(page.url()).not.toMatch(/\/app/)
    await page.goto('/app')
    await expect(page).toHaveURL(/\/login$/)
  })

  test('keluar dari halaman Profil juga berfungsi', async ({ page, mock, user }) => {
    seed(mock, user)
    await login(page)
    await page.goto('/app/profile')
    await expect(page.locator('#konten').getByText(EMAIL)).toBeVisible()
    await page.locator('#konten').getByRole('button', { name: 'Keluar' }).click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('pengguna yang sudah masuk membuka /login diarahkan ke /app', async ({ page, mock, user }) => {
    seed(mock, user)
    await login(page)
    await page.goto('/login')
    await expect(page).toHaveURL(/\/app$/)
  })

  test('sesi bertahan setelah muat ulang', async ({ page, mock, user }) => {
    seed(mock, user)
    await login(page)
    await page.reload()
    await expect(page).toHaveURL(/\/app$/)
    await expect(page.getByText('Minum air 2 liter').first()).toBeVisible()
  })

  test('404: tombol kembali ke beranda berfungsi; navigasi mundur/maju browser berfungsi', async ({ page, mock, user }) => {
    seed(mock, user)
    await login(page)
    await page.getByRole('link', { name: 'Kebiasaan Saya' }).first().click()
    await page.getByRole('link', { name: 'Kalender' }).first().click()
    await expect(page).toHaveURL(/\/app\/calendar$/)
    await page.goBack()
    await expect(page).toHaveURL(/\/app\/habits$/)
    await page.goForward()
    await expect(page).toHaveURL(/\/app\/calendar$/)
    await page.goto('/tidak-ada-halaman-ini')
    await expect(page.getByRole('heading', { name: 'Halaman tidak ditemukan' })).toBeVisible()
    await page.getByRole('link', { name: 'Kembali ke beranda' }).click()
    await expect(page).toHaveURL(/\/app$/)
  })
})
