import { test, expect, login, seed, TODAY } from './fixtures'
import type { MockSupabase } from './mock-supabase'

const posts = (m: MockSupabase, table: string) => m.requests.filter((r) => r.method === 'POST' && r.url.includes(`/rest/v1/${table}`)).length

test.describe('manajemen kebiasaan', () => {
  test.beforeEach(async ({ page, mock, user }) => {
    seed(mock, user)
    await login(page)
    await page.goto('/app/habits')
    await expect(page.getByRole('heading', { name: 'Kebiasaan Saya' })).toBeVisible()
  })
  test.afterEach(({ mock }) => { expect(mock.mockErrors).toEqual([]); expect(mock.externalBlocked).toEqual([]) })

  test('tambah kebiasaan: tersimpan di DB milik pengguna, toast setelah berhasil, bertahan setelah refresh', async ({ page, mock, user }) => {
    await page.getByRole('button', { name: 'Tambah Kebiasaan' }).first().click()
    const dlg = page.getByRole('dialog')
    await expect(dlg.getByRole('heading', { name: 'Tambah Kebiasaan' })).toBeVisible()
    await dlg.getByLabel('Nama kebiasaan').fill('Baca buku 20 menit')
    await dlg.getByLabel('Kategori').selectOption('learning')
    await dlg.getByRole('button', { name: 'Simpan' }).click()
    await expect(page.getByText('Kebiasaan berhasil ditambahkan.')).toBeVisible()
    await expect(dlg).toBeHidden()
    await expect(page.getByText('Baca buku 20 menit')).toBeVisible()
    const row = mock.habits.find((h) => h.name === 'Baca buku 20 menit')!
    expect(row).toMatchObject({ user_id: user.id, category: 'learning', frequency: 'daily', start_date: TODAY, archived_at: null })
    await page.reload()
    await expect(page.getByText('Baca buku 20 menit')).toBeVisible()
  })

  test('validasi: nama kosong dan hari tertentu tanpa hari memunculkan galat dan tidak mengirim permintaan', async ({ page, mock }) => {
    await page.getByRole('button', { name: 'Tambah Kebiasaan' }).first().click()
    const dlg = page.getByRole('dialog')
    await dlg.getByRole('button', { name: 'Simpan' }).click()
    await expect(dlg.locator('.text-danger').first()).toBeVisible()
    await dlg.getByLabel('Nama kebiasaan').fill('Lari sore')
    await dlg.getByRole('radio', { name: 'Hari tertentu' }).click()
    await dlg.getByRole('button', { name: 'Simpan' }).click()
    await expect(dlg.locator('.text-danger')).toHaveCount(1)
    expect(posts(mock, 'habits')).toBe(0)
    await dlg.getByRole('button', { name: 'Sen', exact: true }).click()
    await dlg.getByRole('button', { name: 'Rab', exact: true }).click()
    await dlg.getByRole('button', { name: 'Simpan' }).click()
    await expect(page.getByText('Kebiasaan berhasil ditambahkan.')).toBeVisible()
    expect(mock.habits.find((h) => h.name === 'Lari sore')).toMatchObject({ frequency: 'weekly_days', scheduled_days: [1, 3] })
  })

  test('Batal dan Esc menutup tanpa menyimpan; fokus kembali ke tombol pembuka', async ({ page, mock }) => {
    const opener = page.getByRole('button', { name: 'Tambah Kebiasaan' }).first()
    await opener.click()
    await page.getByRole('dialog').getByLabel('Nama kebiasaan').fill('Tidak jadi')
    await page.getByRole('dialog').getByRole('button', { name: 'Batal' }).click()
    await expect(page.getByRole('dialog')).toBeHidden()
    await opener.click()
    await page.getByRole('dialog').getByLabel('Nama kebiasaan').fill('Tidak jadi 2')
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toBeHidden()
    await expect(opener).toBeFocused()
    expect(posts(mock, 'habits')).toBe(0)
    expect(mock.habits.some((h) => String(h.name).startsWith('Tidak jadi'))).toBe(false)
  })

  test('ubah kebiasaan: formulir terisi nilai lama; perubahan tersimpan dan bertahan', async ({ page, mock }) => {
    await page.getByRole('button', { name: 'Ubah Minum air 2 liter' }).click()
    const dlg = page.getByRole('dialog')
    await expect(dlg.getByRole('heading', { name: 'Ubah Kebiasaan' })).toBeVisible()
    await expect(dlg.getByLabel('Nama kebiasaan')).toHaveValue('Minum air 2 liter')
    await dlg.getByLabel('Nama kebiasaan').fill('Minum air 3 liter')
    await dlg.getByRole('button', { name: 'Simpan' }).click()
    await expect(page.getByText('Perubahan berhasil disimpan.')).toBeVisible()
    expect(mock.habits.some((h) => h.name === 'Minum air 3 liter')).toBe(true)
    expect(mock.habits.some((h) => h.name === 'Minum air 2 liter')).toBe(false)
    await page.reload()
    await expect(page.getByText('Minum air 3 liter')).toBeVisible()
  })

  test('arsipkan dan pulihkan: filter status dan kolom archived_at ikut berubah', async ({ page, mock }) => {
    await page.getByRole('button', { name: 'Arsipkan Lari pagi' }).click()
    await expect(page.getByText('Kebiasaan berhasil diarsipkan.')).toBeVisible()
    await expect(page.getByText('Lari pagi')).toBeHidden()
    expect(mock.habits.find((h) => h.name === 'Lari pagi')!.archived_at).not.toBeNull()
    await page.getByLabel('Filter status').selectOption('archived')
    await expect(page.getByText('Lari pagi')).toBeVisible()
    await page.getByRole('button', { name: 'Pulihkan Lari pagi' }).click()
    await expect(page.getByText('Kebiasaan berhasil dipulihkan.')).toBeVisible()
    expect(mock.habits.find((h) => h.name === 'Lari pagi')!.archived_at).toBeNull()
  })

  test('hapus: Batal tidak menghapus; konfirmasi menghapus kebiasaan dan riwayatnya', async ({ page, mock }) => {
    await page.getByRole('button', { name: 'Hapus Minum air 2 liter' }).click()
    const dlg = page.getByRole('dialog')
    await expect(dlg.getByText('Apakah kamu yakin ingin menghapus kebiasaan ini?')).toBeVisible()
    await expect(dlg.getByText(/riwayat penyelesaian.*ikut terhapus/)).toBeVisible()
    await dlg.getByRole('button', { name: 'Batal' }).click()
    expect(mock.habits.some((h) => h.name === 'Minum air 2 liter')).toBe(true)
    await page.getByRole('button', { name: 'Hapus Minum air 2 liter' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Hapus', exact: true }).click()
    await expect(page.getByText('Kebiasaan berhasil dihapus.')).toBeVisible()
    expect(mock.habits.some((h) => h.name === 'Minum air 2 liter')).toBe(false)
    expect(mock.habits.some((h) => h.name === 'Lari pagi')).toBe(true)
    await page.reload()
    await expect(page.getByText('Minum air 2 liter')).toBeHidden()
  })

  test('cari dan filter: hasil tersaring benar; kosong menampilkan pesan', async ({ page }) => {
    await page.getByLabel('Cari kebiasaan').fill('lari')
    await expect(page.getByText('Lari pagi')).toBeVisible()
    await expect(page.getByText('Minum air 2 liter')).toBeHidden()
    await page.getByLabel('Cari kebiasaan').fill('zzz')
    await expect(page.getByText('Tidak ada kebiasaan yang cocok dengan filter.')).toBeVisible()
    await page.getByLabel('Cari kebiasaan').fill('')
    await page.getByLabel('Filter kategori').selectOption('fitness')
    await expect(page.getByText('Lari pagi')).toBeVisible()
    await expect(page.getByText('Minum air 2 liter')).toBeHidden()
    await page.getByLabel('Filter kategori').selectOption('all')
    await page.getByLabel('Filter status').selectOption('all')
    await expect(page.getByText('Kebiasaan lama')).toBeVisible()
    await page.getByLabel('Filter status').selectOption('archived')
    await expect(page.getByText('Kebiasaan lama')).toBeVisible()
    await expect(page.getByText('Lari pagi')).toBeHidden()
  })
})

test.describe('kegagalan penyimpanan kebiasaan', () => {
  test('server gagal: galat jujur, tidak ada toast sukses, kebiasaan tidak muncul', async ({ page, mock, user }) => {
    seed(mock, user)
    await login(page)
    await page.goto('/app/habits')
    mock.opts.failRest = ({ method, table }) => (method === 'POST' && table === 'habits' ? 500 : null)
    await page.getByRole('button', { name: 'Tambah Kebiasaan' }).first().click()
    const dlg = page.getByRole('dialog')
    await dlg.getByLabel('Nama kebiasaan').fill('Gagal simpan')
    await dlg.getByRole('button', { name: 'Simpan' }).click()
    await expect(dlg.getByRole('alert')).toHaveText('Terjadi kesalahan. Silakan coba lagi.')
    // Pengecekan SEKALI JALAN: pernyataan `not`/toBeHidden Playwright mengulang sampai lolos, dan toast palsu hilang sendiri setelah 4 detik.
    expect(await page.locator('body').textContent()).not.toContain('Kebiasaan berhasil ditambahkan.')
    expect(mock.habits.some((h) => h.name === 'Gagal simpan')).toBe(false)
    mock.opts.failRest = undefined
    await dlg.getByRole('button', { name: 'Simpan' }).click()
    await expect(page.getByText('Kebiasaan berhasil ditambahkan.')).toBeVisible()
    expect(mock.habits.filter((h) => h.name === 'Gagal simpan')).toHaveLength(1)
  })

  test('klik ganda Simpan hanya mengirim satu permintaan', async ({ page, mock, user }) => {
    seed(mock, user)
    await login(page)
    await page.goto('/app/habits')
    mock.opts.restDelayMs = 600
    await page.getByRole('button', { name: 'Tambah Kebiasaan' }).first().click()
    const dlg = page.getByRole('dialog')
    await dlg.getByLabel('Nama kebiasaan').fill('Sekali saja')
    await dlg.getByRole('button', { name: 'Simpan' }).dblclick()
    await expect(page.getByText('Kebiasaan berhasil ditambahkan.')).toBeVisible()
    expect(posts(mock, 'habits')).toBe(1)
    expect(mock.habits.filter((h) => h.name === 'Sekali saja')).toHaveLength(1)
  })

  test('akun tanpa kebiasaan: keadaan kosong informatif dan tombol tambah berfungsi', async ({ page, mock, user }) => {
    void user; void mock
    await login(page)
    await page.goto('/app/habits')
    await expect(page.getByText('Belum ada kebiasaan.')).toBeVisible()
    await page.getByRole('button', { name: 'Tambah Kebiasaan' }).last().click()
    await expect(page.getByRole('dialog')).toBeVisible()
  })
})

test.describe('penyelesaian di Beranda', () => {
  test.beforeEach(async ({ page, mock, user }) => { seed(mock, user); await login(page) })
  const bar = (page: import('@playwright/test').Page) => page.getByRole('progressbar', { name: 'Progres hari ini' })

  test('tandai selesai lalu batalkan: UI, progres, rentetan, dan DB konsisten, bertahan setelah refresh', async ({ page, mock, user }) => {
    await expect(bar(page)).toHaveAttribute('aria-valuenow', '0')
    await expect(page.getByText('0 dari 1 kebiasaan')).toBeVisible()
    await page.getByRole('button', { name: 'Tandai Selesai: Minum air 2 liter' }).click()
    await expect(page.getByText('Kerja bagus! Kebiasaan ditandai selesai.')).toBeVisible()
    await expect(bar(page)).toHaveAttribute('aria-valuenow', '100')
    await expect(page.getByText('1 dari 1 kebiasaan')).toBeVisible()
    await expect(page.getByText('7 hari').first()).toBeVisible() // rentetan 6 -> 7
    const rows = mock.completions.filter((c) => c.completed_date === TODAY)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ user_id: user.id })
    await page.reload()
    await expect(bar(page)).toHaveAttribute('aria-valuenow', '100')
    await page.getByRole('button', { name: 'Batalkan: Minum air 2 liter' }).click()
    await expect(page.getByText('Status selesai dibatalkan.')).toBeVisible()
    await expect(bar(page)).toHaveAttribute('aria-valuenow', '0')
    expect(mock.completions.some((c) => c.completed_date === TODAY)).toBe(false)
    expect(mock.completions.some((c) => c.completed_date === '2026-11-02')).toBe(true) // riwayat lain utuh
  })

  test('gagal menyimpan: tidak ada sukses palsu; Coba Lagi berhasil setelah server pulih', async ({ page, mock }) => {
    mock.opts.failRest = ({ method, table }) => (method === 'POST' && table === 'habit_completions' ? 500 : null)
    await page.getByRole('button', { name: 'Tandai Selesai: Minum air 2 liter' }).click()
    await expect(page.getByText('Terjadi kesalahan. Silakan coba lagi.')).toBeVisible()
    expect(await page.locator('body').textContent()).not.toContain('Kerja bagus! Kebiasaan ditandai selesai.') // sekali jalan (lihat catatan di atas)
    await expect(bar(page)).toHaveAttribute('aria-valuenow', '0')
    expect(mock.completions.some((c) => c.completed_date === TODAY)).toBe(false)
    mock.opts.failRest = undefined
    await page.getByRole('button', { name: 'Coba Lagi' }).click()
    await expect(page.getByText('Kerja bagus! Kebiasaan ditandai selesai.')).toBeVisible()
    expect(mock.completions.filter((c) => c.completed_date === TODAY)).toHaveLength(1)
  })

  test('klik ganda cepat tidak menghasilkan penyelesaian ganda', async ({ page, mock }) => {
    mock.opts.restDelayMs = 400
    await page.getByRole('button', { name: 'Tandai Selesai: Minum air 2 liter' }).dblclick()
    await expect(bar(page)).toHaveAttribute('aria-valuenow', '100')
    await page.waitForTimeout(800)
    expect(mock.completions.filter((c) => c.completed_date === TODAY)).toHaveLength(1)
  })

  test('kebiasaan yang tidak dijadwalkan hari ini tidak muncul di daftar hari ini', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Tandai Selesai: Lari pagi/ })).toHaveCount(0) // Selasa; jadwal Sen/Rab/Jum
    await expect(page.getByText('Kebiasaan lama')).toBeHidden() // diarsipkan
  })
})
