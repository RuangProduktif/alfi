import { test, expect, login, seed, TODAY } from './fixtures'

// Catatan: tanggal tetap Selasa 3 Nov 2026 10:00 WIB. Seed: Minum air harian selesai 28 Okt–2 Nov; Lari Sen/Rab/Jum selesai 2 Nov.
const day = (p: import('@playwright/test').Page, label: RegExp) => p.getByRole('button', { name: label })
const monthTitle = (p: import('@playwright/test').Page) => p.locator('h2[aria-live="polite"]')
/** Kotak panel detail tanggal (region berjudul tanggal). */
const detail = (p: import('@playwright/test').Page) => p.getByRole('region').filter({ has: p.locator('#day-title') })

test.describe('kalender', () => {
  test.beforeEach(async ({ page, mock, user }) => { seed(mock, user); await login(page); await page.goto('/app/calendar'); await expect(monthTitle(page)).toHaveText('November 2026') })
  test.afterEach(({ mock }) => { expect(mock.mockErrors).toEqual([]) })

  test('navigasi bulan: label benar, tanggal 1 jatuh di hari yang benar, Hari Ini kembali', async ({ page }) => {
    await expect(day(page, /^Minggu, 1 November 2026/)).toBeVisible()
    await page.getByRole('button', { name: 'Bulan sebelumnya' }).click()
    await expect(monthTitle(page)).toHaveText('Oktober 2026')
    await expect(day(page, /^Kamis, 1 Oktober 2026/)).toBeVisible()
    await page.getByRole('button', { name: 'Bulan berikutnya' }).click()
    await page.getByRole('button', { name: 'Bulan berikutnya' }).click()
    await expect(monthTitle(page)).toHaveText('Desember 2026')
    await expect(day(page, /^Selasa, 1 Desember 2026/)).toBeVisible()
    await page.getByRole('button', { name: 'Hari Ini' }).click()
    await expect(monthTitle(page)).toHaveText('November 2026')
    await expect(page.locator('#day-title')).toHaveText('Selasa, 3 November 2026')
  })

  test('kolom grid: 1 November (Minggu) di kolom paling kanan, 2 November (Senin) di kolom paling kiri', async ({ page }) => {
    const x = async (re: RegExp) => (await day(page, re).boundingBox())!.x
    expect(await x(/^Minggu, 1 November/)).toBeGreaterThan(await x(/^Senin, 2 November/))
    expect(await x(/^Senin, 2 November/)).toBeLessThan(await x(/^Selasa, 3 November/))
  })

  test('memilih tanggal mengubah panel detail dan status per kebiasaan', async ({ page }) => {
    await day(page, /^Senin, 2 November 2026/).click()
    await expect(page.locator('#day-title')).toHaveText('Senin, 2 November 2026')
    await expect(detail(page).getByText('2 dari 2 kebiasaan selesai')).toBeVisible()
    await day(page, /^Minggu, 1 November 2026/).click()
    await expect(detail(page).getByText('1 dari 1 kebiasaan selesai')).toBeVisible() // Lari tidak dijadwalkan hari Minggu
    await expect(detail(page).getByText('Lari pagi')).toBeVisible()
    await day(page, /^Selasa, 3 November 2026/).click()
    await expect(detail(page).getByRole('button', { name: 'Tandai Selesai: Minum air 2 liter' })).toBeVisible()
  })

  test('batalkan dan tandai ulang pada tanggal lampau: completed_date tepat (tidak bergeser sehari)', async ({ page, mock }) => {
    await day(page, /^Minggu, 1 November 2026/).click()
    await detail(page).getByRole('button', { name: 'Batalkan: Minum air 2 liter' }).click()
    await expect(detail(page).getByRole('button', { name: 'Tandai Selesai: Minum air 2 liter' })).toBeVisible()
    expect(mock.completions.some((c) => c.completed_date === '2026-11-01')).toBe(false)
    expect(mock.completions.some((c) => c.completed_date === '2026-10-31')).toBe(true)
    await detail(page).getByRole('button', { name: 'Tandai Selesai: Minum air 2 liter' }).click()
    await expect(detail(page).getByRole('button', { name: 'Batalkan: Minum air 2 liter' })).toBeVisible()
    const rows = mock.completions.filter((c) => c.completed_date === '2026-11-01')
    expect(rows).toHaveLength(1)
    expect(mock.completions.some((c) => c.completed_date === '2026-10-31' || c.completed_date === '2026-11-02') && true).toBe(true)
    await page.reload()
    await day(page, /^Minggu, 1 November 2026/).click()
    await expect(detail(page).getByRole('button', { name: 'Batalkan: Minum air 2 liter' })).toBeVisible()
  })

  test('tanggal masa depan tidak bisa ditandai', async ({ page, mock }) => {
    await day(page, /^Rabu, 4 November 2026/).click()
    await expect(detail(page).getByText('Tanggal ini belum tiba, jadi belum bisa ditandai.')).toBeVisible()
    await expect(detail(page).getByRole('button', { name: /Tandai Selesai/ })).toHaveCount(0)
    expect(mock.completions.some((c) => c.completed_date === '2026-11-04')).toBe(false)
  })

  test('batas mundur 30 hari: 4 Okt masih bisa diubah, 3 Okt tidak', async ({ page }) => {
    await page.getByRole('button', { name: 'Bulan sebelumnya' }).click()
    await day(page, /^Minggu, 4 Oktober 2026/).click()
    await expect(detail(page).getByRole('button', { name: /Tandai Selesai: Minum air/ })).toBeVisible()
    await day(page, /^Sabtu, 3 Oktober 2026/).click()
    await expect(detail(page).getByText('Perubahan hanya dapat dilakukan hingga 30 hari ke belakang.')).toBeVisible()
    await expect(detail(page).getByRole('button', { name: /Tandai Selesai|Batalkan/ })).toHaveCount(0)
  })

  test('gagal menyimpan dari kalender: galat jujur, tanpa sukses palsu, data tidak berubah', async ({ page, mock }) => {
    await day(page, /^Minggu, 1 November 2026/).click()
    mock.opts.failRest = ({ method, table }) => (method === 'DELETE' && table === 'habit_completions' ? 500 : null)
    await detail(page).getByRole('button', { name: 'Batalkan: Minum air 2 liter' }).click()
    await expect(page.getByText('Terjadi kesalahan. Silakan coba lagi.')).toBeVisible()
    expect(await page.locator('body').textContent()).not.toContain('Status selesai dibatalkan.')
    expect(mock.completions.some((c) => c.completed_date === '2026-11-01')).toBe(true)
    await expect(detail(page).getByRole('button', { name: 'Batalkan: Minum air 2 liter' })).toBeVisible()
  })

  test('galat memuat data: pesan, lalu Coba Lagi memulihkan', async ({ page, mock }) => {
    mock.opts.failRest = ({ method }) => (method === 'GET' ? 500 : null)
    await page.reload()
    await expect(page.getByRole('alert').first()).toBeVisible()
    mock.opts.failRest = undefined
    await page.getByRole('button', { name: 'Coba Lagi' }).first().click()
    await expect(monthTitle(page)).toHaveText('November 2026')
  })
})

test.describe('statistik', () => {
  test('akun tanpa kebiasaan: keadaan kosong, bukan grafik palsu', async ({ page, mock, user }) => {
    void mock; void user
    await login(page)
    await page.goto('/app/analytics')
    await expect(page.getByText('Belum ada kebiasaan.')).toBeVisible()
    await expect(page.locator('svg.recharts-surface')).toHaveCount(0)
  })

  test('kebiasaan yang baru mulai di masa depan: pesan "Belum ada data pada rentang ini.", tanpa grafik palsu', async ({ page, mock, user }) => {
    mock.addHabit(user.id, { name: 'Mulai pekan depan', start_date: '2026-11-10' })
    await login(page)
    await page.goto('/app/analytics')
    await expect(page.getByText('Belum ada data pada rentang ini.').first()).toBeVisible()
    await expect(page.locator('svg.recharts-surface')).toHaveCount(0)
  })

  test('kebiasaan yang mulai hari ini tanpa penyelesaian: grafik tampil (hari ini terjadwal, 0%), bukan keadaan kosong', async ({ page, mock, user }) => {
    mock.addHabit(user.id, { name: 'Baru mulai', start_date: TODAY })
    await login(page)
    await page.goto('/app/analytics')
    await expect(page.getByRole('region', { name: 'Ringkasan' })).toContainText('Total Penyelesaian')
    await expect(page.locator('svg.recharts-surface').first()).toBeVisible()
  })

  test.describe('dengan data', () => {
    test.beforeEach(async ({ page, mock, user }) => { seed(mock, user); await login(page); await page.goto('/app/analytics'); await expect(page.getByRole('heading', { name: 'Statistik', level: 1 })).toBeVisible() })
    test.afterEach(({ mock }) => { expect(mock.mockErrors).toEqual([]) })

    test('kartu ringkasan sesuai data tersimpan (rentetan 6, rekor 6, total 7)', async ({ page }) => {
      const summary = page.getByRole('region', { name: 'Ringkasan' })
      await expect(summary).toContainText('Rentetan Saat Ini')
      await expect(summary).toContainText('6 hari')
      await expect(summary).toContainText('Rekor Konsistensi')
      await expect(summary).toContainText('Total Penyelesaian')
      await expect(summary.getByText('7', { exact: true })).toBeVisible()
    })

    test('rentang 7/30/90 hari: pilihan berganti dan hanya satu yang aktif', async ({ page }) => {
      const group = page.getByRole('radiogroup', { name: 'Rentang waktu' })
      for (const r of ['7 hari', '90 hari', '30 hari']) {
        await group.getByRole('radio', { name: r }).click()
        await expect(group.getByRole('radio', { name: r })).toHaveAttribute('aria-checked', 'true')
        await expect(group.locator('[aria-checked="true"]')).toHaveCount(1)
      }
    })

    test('detail kebiasaan: angka benar, Tutup/Esc menutup, fokus kembali', async ({ page }) => {
      await page.getByRole('radiogroup', { name: 'Rentang waktu' }).getByRole('radio', { name: '7 hari' }).click()
      const opener = page.getByRole('button', { name: 'Lihat detail Minum air 2 liter' })
      await opener.click()
      const dlg = page.getByRole('dialog')
      await expect(dlg.getByRole('heading', { name: 'Detail Kebiasaan' })).toBeVisible()
      await expect(dlg).toContainText('Minum air 2 liter')
      await expect(dlg).toContainText('Rentetan Saat Ini')
      await expect(dlg).toContainText('6 hari')
      await expect(dlg).toContainText('Total Penyelesaian')
      const pct = (await dlg.getByText(/Persentase \(7 hari\)/).locator('xpath=following-sibling::dd').textContent())!
      console.log('PERSEN_7_HARI_MINUM', pct)
      await dlg.getByRole('button', { name: 'Tutup' }).click()
      await expect(dlg).toBeHidden()
      await expect(opener).toBeFocused()
      await opener.click()
      await page.keyboard.press('Escape')
      await expect(dlg).toBeHidden()
    })

    test('heatmap: label aksesibel menyebut jumlah hari dengan penyelesaian (6 hari)', async ({ page }) => {
      await expect(page.getByRole('img', { name: /^Heatmap aktivitas \d+ pekan terakhir, 6 hari dengan penyelesaian$/ })).toBeVisible()
    })

    test('grafik per hari dirender (Recharts) dan "Cara perhitungan" bisa dibuka', async ({ page }) => {
      await expect(page.locator('svg.recharts-surface').first()).toBeVisible()
      await page.getByText('Cara perhitungan').click()
      await expect(page.getByText('Kebiasaan yang belum dimulai tidak dihitung.')).toBeVisible()
    })
  })
})

test.describe('pengaturan', () => {
  test.beforeEach(async ({ page, mock, user }) => { seed(mock, user); await page.emulateMedia({ colorScheme: 'light' }); await login(page); await page.goto('/app/settings'); await expect(page.getByRole('heading', { name: 'Pengaturan', level: 1 })).toBeVisible() })
  test.afterEach(({ mock }) => { expect(mock.mockErrors).toEqual([]) })
  const isDark = (p: import('@playwright/test').Page) => p.evaluate(() => document.documentElement.classList.contains('dark'))
  const themeRow = (m: { settings: Record<string, unknown>[] }, uid: string) => m.settings.find((s) => s.user_id === uid)!

  test('tema Gelap: tampilan berganti, tersimpan di akun, bertahan setelah refresh walau sistem terang', async ({ page, mock, user }) => {
    await page.getByRole('radio', { name: 'Gelap' }).click()
    await expect(page.getByRole('radio', { name: 'Gelap' })).toHaveAttribute('aria-checked', 'true')
    expect(await isDark(page)).toBe(true)
    await expect.poll(() => themeRow(mock, user.id).theme).toBe('dark')
    await page.reload()
    await expect(page.getByRole('radio', { name: 'Gelap' })).toHaveAttribute('aria-checked', 'true')
    expect(await isDark(page)).toBe(true)
  })

  test('tema Terang dan Ikuti sistem (mengikuti prefers-color-scheme)', async ({ page, mock, user }) => {
    await page.getByRole('radio', { name: 'Gelap' }).click()
    await page.getByRole('radio', { name: 'Terang' }).click()
    expect(await isDark(page)).toBe(false)
    await expect.poll(() => themeRow(mock, user.id).theme).toBe('light')
    await page.getByRole('radio', { name: 'Ikuti sistem' }).click()
    await expect.poll(() => themeRow(mock, user.id).theme).toBe('system')
    await page.emulateMedia({ colorScheme: 'dark' })
    await expect.poll(() => isDark(page)).toBe(true)
    await page.emulateMedia({ colorScheme: 'light' })
    await expect.poll(() => isDark(page)).toBe(false)
  })

  test('gagal menyimpan tema: pesan jujur (berubah di perangkat, belum di akun) dan Coba Lagi', async ({ page, mock, user }) => {
    mock.opts.failRest = ({ method, table }) => (method !== 'GET' && table === 'user_settings' ? 500 : null)
    await page.getByRole('radio', { name: 'Gelap' }).click()
    await expect(page.getByText('Tema berubah di perangkat ini, tetapi belum tersimpan ke akunmu.')).toBeVisible()
    expect(themeRow(mock, user.id).theme).toBe('system')
    mock.opts.failRest = undefined
    await page.getByRole('button', { name: 'Coba Lagi' }).click()
    await expect.poll(() => themeRow(mock, user.id).theme).toBe('dark')
  })

  test('zona waktu: tanggal lokal (bukan UTC) dipakai untuk "hari ini" dan completed_date; ganti zona mengubah "hari ini"', async ({ page, mock, user }) => {
    // 17:30 UTC Selasa 3 Nov = 00:30 Rabu 4 Nov di Jakarta = 12:30 Selasa 3 Nov di New York.
    await page.clock.setFixedTime(new Date('2026-11-03T17:30:00Z'))
    await page.goto('/app')
    await expect(page.getByText('Rabu, 4 November 2026')).toBeVisible()
    await page.getByRole('button', { name: 'Tandai Selesai: Minum air 2 liter' }).click()
    await expect(page.getByText('Kerja bagus! Kebiasaan ditandai selesai.')).toBeVisible()
    expect(mock.completions.filter((c) => c.habit_id === mock.habits.find((h) => h.name === 'Minum air 2 liter')!.id && c.completed_date === '2026-11-04')).toHaveLength(1)
    expect(mock.completions.some((c) => c.completed_date === '2026-11-03' && c.completed_at && String(c.completed_at).startsWith('2026-11-03T17'))).toBe(false)
    await page.getByRole('link', { name: 'Pengaturan' }).first().click()
    await page.getByLabel('Zona waktu').selectOption('America/New_York')
    await expect(page.getByText('Perubahan berhasil disimpan.')).toBeVisible()
    expect(themeRow(mock, user.id).timezone).toBe('America/New_York')
    await page.getByRole('link', { name: 'Beranda' }).first().click()
    await expect(page.getByText('Selasa, 3 November 2026')).toBeVisible()
    await page.reload()
    await expect(page.getByText('Selasa, 3 November 2026')).toBeVisible()
  })

  test('kartu Pasang Aplikasi tampil dan tidak menjanjikan fitur yang belum ada', async ({ page }) => {
    await expect(page.getByText('Pasang Aplikasi').first()).toBeVisible()
    await expect(page.locator('body')).not.toContainText('Notifikasi push')
  })
})
