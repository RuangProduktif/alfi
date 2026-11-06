import { appendFileSync, readFileSync, writeFileSync } from 'node:fs'
import type { BrowserContext, Page } from '@playwright/test'
import type { MockSupabase } from './mock-supabase'
import { test, expect, login, seed } from './fixtures'

// Di berkas ini service worker DIIZINKAN (di berkas lain diblokir agar page.route/context.route bekerja apa adanya).
test.use({ serviceWorkers: 'allow', mockServer: true })

// Koneksi putus sungguhan: `context.setOffline` saja tidak menghentikan permintaan yang dikirim service worker (terbukti di uji ini),
// jadi server mock juga dimatikan agar API benar-benar tidak terjangkau.
const goOffline = async (context: BrowserContext, mock: MockSupabase) => { await mock.close(); await context.setOffline(true) }
const goOnline = async (context: BrowserContext, mock: MockSupabase) => { await context.setOffline(false); await mock.listen() }
const swReady = (page: Page) => page.evaluate(async () => { await navigator.serviceWorker.ready; return true })
const controlled = (page: Page) => page.evaluate(() => !!navigator.serviceWorker.controller)
const cachedUrls = (page: Page) => page.evaluate(async () => {
  const out: string[] = []
  for (const name of await caches.keys()) for (const req of await (await caches.open(name)).keys()) out.push(req.url)
  return out
})
/** Registrasi pertama belum mengendalikan halaman; muat ulang sekali supaya SW aktif dan mengendalikan. */
async function activate(page: Page, path = '/login') {
  await page.goto(path)
  await swReady(page)
  await page.reload()
  await expect.poll(() => controlled(page)).toBe(true)
}

test.describe('PWA di Chromium (build produksi)', () => {
  test('manifest tertaut dan lengkap; semua ikon bisa diunduh sebagai PNG', async ({ page }) => {
    await page.goto('/login')
    const href = await page.locator('link[rel="manifest"]').getAttribute('href')
    expect(href).toBeTruthy()
    const res = await page.request.get(href!)
    expect(res.status()).toBe(200)
    const m = (await res.json()) as { name: string; short_name: string; start_url: string; display: string; lang: string; scope: string; theme_color: string; icons: { src: string; sizes: string; purpose: string }[] }
    expect(m).toMatchObject({ name: 'Ritual', short_name: 'Ritual', start_url: '/app', display: 'standalone', lang: 'id', scope: '/' })
    expect(m.icons.some((i) => i.sizes === '192x192')).toBe(true)
    expect(m.icons.some((i) => i.sizes === '512x512' && i.purpose === 'any')).toBe(true)
    expect(m.icons.some((i) => i.purpose === 'maskable')).toBe(true)
    for (const icon of m.icons) {
      const r = await page.request.get(icon.src)
      expect(r.status(), icon.src).toBe(200)
      expect(r.headers()['content-type']).toContain('image/png')
    }
    await expect(page.locator('meta[name="theme-color"]').first()).toHaveAttribute('content', /#/)
  })

  test('service worker terdaftar, aktif, dan mengendalikan halaman; app shell masuk precache', async ({ page }) => {
    await activate(page)
    const urls = await cachedUrls(page)
    expect(urls.some((u) => /\/index\.html(\?|$)/.test(u))).toBe(true)
    expect(urls.some((u) => /\/assets\/.*\.js/.test(u))).toBe(true)
    expect(urls.some((u) => /\/assets\/.*\.css/.test(u))).toBe(true)
    const reg = await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); return { scope: r?.scope, active: r?.active?.state } })
    expect(reg).toEqual({ scope: 'http://127.0.0.1:4173/', active: 'activated' })
  })

  test('offline: app shell tetap terbuka dari cache pada /login dan pada tautan dalam (/app/habits → login)', async ({ page, context }) => {
    await activate(page)
    await context.setOffline(true)
    await page.reload()
    await expect(page.getByRole('heading', { name: /Masuk/ }).first()).toBeVisible()
    await page.goto('/app/habits')
    await expect(page).toHaveURL(/\/login$/) // belum masuk → proteksi route, tetapi aplikasi tetap berjalan tanpa jaringan
    await expect(page.getByRole('heading', { name: /Masuk/ }).first()).toBeVisible()
    await context.setOffline(false)
  })

  test.describe('setelah masuk', () => {
    test.beforeEach(async ({ page, mock, user }) => { seed(mock, user); await activate(page); await login(page); await page.goto('/app/habits'); await expect(page.getByText('Minum air 2 liter')).toBeVisible() })

    test('tidak ada data privat (Supabase Auth/REST) yang masuk Cache Storage', async ({ page }) => {
      for (const p of ['/app', '/app/calendar', '/app/analytics', '/app/settings', '/app/profile']) { await page.goto(p); await page.waitForLoadState('networkidle') }
      const urls = await cachedUrls(page)
      expect(urls.length).toBeGreaterThan(0)
      expect(urls.filter((u) => /supabase|\/rest\/v1|\/auth\/v1/.test(u))).toEqual([])
    })

    test('offline: banner jujur muncul dan hilang saat online kembali', async ({ page, context, mock }) => {
      await goOffline(context, mock)
      await expect(page.getByText('Kamu sedang offline.')).toBeVisible()
      await expect(page.getByText(/Ritual belum mendukung perubahan offline/)).toBeVisible()
      await goOnline(context, mock)
      await expect(page.getByText('Kamu sedang offline.')).toBeHidden()
    })

    test('offline: perubahan gagal jujur (tidak macet, tidak terkirim diam-diam), lalu Coba Lagi berhasil saat online', async ({ page, context, mock }) => {
      await page.goto('/app')
      const mark = page.getByRole('button', { name: 'Tandai Selesai: Minum air 2 liter' })
      await expect(mark).toBeVisible()
      await goOffline(context, mock)
      await mark.click()
      await expect(page.getByText('Terjadi kesalahan. Silakan coba lagi.')).toBeVisible()
      await expect(mark).toBeEnabled() // tidak macet dalam keadaan "menyimpan"
      expect(await page.locator('body').textContent()).not.toContain('Kerja bagus! Kebiasaan ditandai selesai.')
      await goOnline(context, mock)
      await page.waitForTimeout(1500)
      expect(mock.completions.some((c) => c.completed_date === '2026-11-03')).toBe(false) // tidak terkirim sendiri saat online kembali
      expect(await page.locator('body').textContent()).not.toContain('Kerja bagus! Kebiasaan ditandai selesai.')
      await page.getByRole('button', { name: 'Coba Lagi' }).click()
      await expect(page.getByText('Kerja bagus! Kebiasaan ditandai selesai.')).toBeVisible()
      expect(mock.completions.filter((c) => c.completed_date === '2026-11-03')).toHaveLength(1)
    })

    test('muat ulang tanpa koneksi setelah masuk: aplikasi terbuka, galat dengan Coba Lagi (bukan "Memuat…" tanpa akhir, bukan data basi)', async ({ page, context, mock }) => {
      await goOffline(context, mock)
      await page.reload()
      await expect(page.getByText('Kamu sedang offline.')).toBeVisible()
      // supabase-js mencoba ulang beberapa kali sebelum menyerah, jadi galat muncul setelah ±10 detik (bukan "Memuat…" selamanya).
      await expect(page.getByRole('button', { name: 'Coba Lagi' }).first()).toBeVisible({ timeout: 25_000 })
      await expect(page.getByText('Minum air 2 liter')).toHaveCount(0)
      await goOnline(context, mock)
      await page.getByRole('button', { name: 'Coba Lagi' }).first().click()
      await expect(page.getByText('Minum air 2 liter')).toBeVisible()
    })
  })

  test('versi baru: banner muncul, "Nanti" menutup, "Muat Ulang" mengaktifkan versi baru dan memuat ulang', async ({ page }) => {
    await activate(page)
    await expect(page.getByText('Versi baru Ritual tersedia.')).toHaveCount(0)
    const swPath = 'dist-e2e/sw.js'
    const original = readFileSync(swPath, 'utf8')
    try {
      appendFileSync(swPath, `\n// e2e: simulasi rilis baru ${Date.now()}\n`)
      await page.evaluate(() => { (window as unknown as { __marker: string }).__marker = 'halaman-lama' })
      await page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration())!.update() })
      await expect(page.getByText('Versi baru Ritual tersedia.')).toBeVisible({ timeout: 15_000 })
      await page.getByRole('button', { name: 'Nanti' }).click()
      await expect(page.getByText('Versi baru Ritual tersedia.')).toBeHidden()
      // Muncul lagi setelah pemeriksaan berikutnya? Tidak diuji (interval 1 jam). Muat ulang halaman memunculkannya karena SW baru masih menunggu.
      await page.reload()
      await expect(page.getByText('Versi baru Ritual tersedia.')).toBeVisible({ timeout: 15_000 })
      await page.evaluate(() => { (window as unknown as { __marker: string }).__marker = 'halaman-lama' })
      await page.getByRole('button', { name: 'Muat Ulang' }).click()
      // Selama navigasi, konteks halaman hancur sesaat; anggap itu "sedang memuat ulang".
      await expect.poll(() => page.evaluate(() => (window as unknown as { __marker?: string }).__marker ?? 'dimuat-ulang').catch(() => 'sedang-memuat'), { timeout: 15_000 }).toBe('dimuat-ulang')
      await expect(page.getByText('Versi baru Ritual tersedia.')).toHaveCount(0)
      await expect.poll(() => controlled(page)).toBe(true)
    } finally {
      writeFileSync(swPath, original)
    }
  })
})
