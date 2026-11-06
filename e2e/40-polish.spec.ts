import { readdirSync, readFileSync } from 'node:fs'
import { test, expect, login, seed } from './fixtures'

const LONG = 'Membaca buku nonfiksi dua puluh halaman sebelum tidur setiap malam'
const NAV = 'nav[aria-label="Navigasi bawah"]'

test.describe('navigasi bawah kapsul (HP)', () => {
  test.use({ viewport: { width: 360, height: 740 } })
  test.beforeEach(async ({ page, mock, user }) => { seed(mock, user); await login(page) })

  test('mengambang: berjarak dari tepi layar, berbentuk kapsul, di atas konten', async ({ page }) => {
    const box = (await page.locator(NAV).boundingBox())!
    expect(box.x).toBeGreaterThanOrEqual(15)
    expect(box.x + box.width).toBeLessThanOrEqual(360 - 15)
    expect(740 - (box.y + box.height)).toBeGreaterThanOrEqual(11) // jarak ke tepi bawah
    const radius = await page.locator(NAV).evaluate((e) => parseFloat(getComputedStyle(e).borderTopLeftRadius))
    expect(radius).toBeGreaterThanOrEqual(box.height / 2 - 1)
    expect(await page.locator(NAV).evaluate((e) => getComputedStyle(e).position)).toBe('fixed')
  })

  test('target sentuh setiap item minimal 44px dan item aktif ditandai', async ({ page }) => {
    const links = page.locator(`${NAV} a`)
    await expect(links).toHaveCount(4)
    for (let i = 0; i < 4; i++) {
      const b = (await links.nth(i).boundingBox())!
      expect(b.height, `tinggi item ${i}`).toBeGreaterThanOrEqual(44)
      expect(b.width, `lebar item ${i}`).toBeGreaterThanOrEqual(44)
    }
    await expect(page.locator(`${NAV} a[aria-current="page"]`)).toHaveCount(1)
    await expect(page.locator(`${NAV} a[aria-current="page"]`)).toHaveText('Beranda')
  })

  test('latar kaca blur bila didukung; cadangan solid semi-transparan tersedia di CSS', async ({ page }) => {
    const s = await page.locator(NAV).evaluate((e) => { const c = getComputedStyle(e); return { filter: c.backdropFilter || c.getPropertyValue('-webkit-backdrop-filter'), bg: c.backgroundColor } })
    expect(s.filter).toContain('blur')
    expect(s.bg).toMatch(/rgba?\(|color\(/) // berwarna dengan alfa (bukan transparan penuh)
    const css = readdirSync('dist-e2e/assets').filter((f) => f.endsWith('.css')).map((f) => readFileSync(`dist-e2e/assets/${f}`, 'utf8')).join('\n')
    // Minifier mengubah rgb(... / .94) menjadi hex 8 digit (alfa < ff): cadangan solid semi-transparan.
    const fallbackAlpha = css.match(/--nav-bg:#[0-9a-f]{6}([0-9a-f]{2})/)
    expect(fallbackAlpha, 'token --nav-bg berwarna dengan alfa').not.toBeNull()
    expect(parseInt(fallbackAlpha![1]!, 16)).toBeLessThan(255)
    expect(css).toMatch(/\.bg-nav\{background-color:var\(--nav-bg\)\}|\.bg-nav\{[^}]*var\(--nav-bg\)/) // kelas dasar = cadangan
    // Kaca hanya berlaku di dalam @supports (browser tanpa backdrop-filter tetap memakai cadangan).
    expect(css).toMatch(/@supports \(\(-webkit-backdrop-filter:var\(--tw\)\) or \(backdrop-filter:var\(--tw\)\)\)\{\.supports-\\\[backdrop-filter\\\]\\:bg-nav-glass/)
    expect(css).toMatch(/safe-area-inset-bottom/)
  })

  test('safe-area inset bawah dipakai: kapsul naik dan padding halaman bertambah (iPhone, inset 34px)', async ({ page, context }) => {
    const before = (await page.locator(NAV).boundingBox())!
    const cdp = await context.newCDPSession(page)
    await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 0, left: 0, bottom: 34, right: 0 } })
    await expect.poll(async () => 740 - (await page.locator(NAV).boundingBox())!.y - (await page.locator(NAV).boundingBox())!.height).toBeGreaterThanOrEqual(12 + 34 - 1)
    const after = (await page.locator(NAV).boundingBox())!
    expect(after.y).toBeLessThan(before.y - 30)
    const pad = await page.locator('#konten').evaluate((e) => parseFloat(getComputedStyle(e).paddingBottom))
    expect(pad).toBeGreaterThanOrEqual(104 + 34 - 1)
  })

  test('konten terakhir tidak tertutup kapsul setelah menggulir ke bawah', async ({ page, mock, user }) => {
    for (let i = 0; i < 10; i++) mock.addHabit(user.id, { name: `Kebiasaan tambahan ${i + 1}` })
    await page.goto('/app/habits')
    await expect(page.getByText('Kebiasaan tambahan 10')).toBeVisible()
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    await page.waitForTimeout(200)
    const lastBottom = await page.locator('#konten li').last().evaluate((e) => e.getBoundingClientRect().bottom)
    const navTop = (await page.locator(NAV).boundingBox())!.y
    expect(lastBottom).toBeLessThanOrEqual(navTop - 8)
  })

  test('animasi baru menghormati prefers-reduced-motion', async ({ page }) => {
    const dur = (sel: string) => page.locator(sel).first().evaluate((e) => parseFloat(getComputedStyle(e).transitionDuration))
    const targets = [`${NAV} a`, '[role="progressbar"] > div'] // item navigasi dan isi progres: dua animasi yang kini ada
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    for (const t of targets) expect(await dur(t), t).toBeGreaterThan(0.1)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    for (const t of targets) expect(await dur(t), t).toBeLessThan(0.001)
  })
})

test.describe('nama kebiasaan tidak terpotong di 360 px', () => {
  test.use({ viewport: { width: 360, height: 740 } })
  /** Teks nama terlihat utuh: tidak dipotong elipsis dan tidak meluap dari wadahnya. */
  const fullyShown = (page: import('@playwright/test').Page, text: string) =>
    page.getByText(text, { exact: true }).first().evaluate((e) => {
      const c = getComputedStyle(e)
      const clipped = c.textOverflow === 'ellipsis' && e.scrollWidth > e.clientWidth
      return { clipped, overflowHidden: c.overflow === 'hidden' && e.scrollWidth > e.clientWidth, whiteSpace: c.whiteSpace }
    })

  test.beforeEach(async ({ page, mock, user }) => { seed(mock, user); await login(page) })

  test('Beranda, Kebiasaan Saya, Kalender menampilkan nama panjang utuh dan tombol tetap terjangkau', async ({ page, mock, user }) => {
    mock.addHabit(user.id, { name: LONG, category: 'learning', icon: 'BookOpen', color: '#3b82f6' })
    await page.goto('/app')
    await expect(page.getByText(LONG, { exact: true }).first()).toBeVisible()
    expect(await fullyShown(page, LONG)).toMatchObject({ clipped: false, overflowHidden: false })
    const btn = page.getByRole('button', { name: `Tandai Selesai: ${LONG}` })
    const bb = (await btn.boundingBox())!
    expect(bb.x + bb.width).toBeLessThanOrEqual(360)
    await page.goto('/app/habits')
    await expect(page.getByText(LONG, { exact: true })).toBeVisible()
    expect(await fullyShown(page, LONG)).toMatchObject({ clipped: false, overflowHidden: false })
    await page.goto('/app/calendar')
    await page.getByRole('button', { name: /^Selasa, 3 November 2026/ }).click()
    await expect(page.getByRole('button', { name: `Tandai Selesai: ${LONG}` })).toBeVisible() // ukur setelah tombol aksi ikut dirender
    await expect(page.getByText(LONG, { exact: true })).toBeVisible()
    expect(await fullyShown(page, LONG)).toMatchObject({ clipped: false, overflowHidden: false })
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0)
  })

  test('nama pendek juga utuh (regresi "Minum…")', async ({ page }) => {
    await page.goto('/app/calendar')
    await page.getByRole('button', { name: /^Selasa, 3 November 2026/ }).click()
    await expect(page.getByRole('button', { name: 'Tandai Selesai: Minum air 2 liter' })).toBeVisible() // ukur setelah tombol aksi ikut dirender
    await expect(page.getByText('Minum air 2 liter', { exact: true })).toBeVisible()
    expect(await fullyShown(page, 'Minum air 2 liter')).toMatchObject({ clipped: false, overflowHidden: false })
  })
})

test('tidak ada sisa ungu di CSS hasil build, manifest, dan meta theme-color', async ({ page }) => {
  const css = readdirSync('dist-e2e/assets').filter((f) => f.endsWith('.css')).map((f) => readFileSync(`dist-e2e/assets/${f}`, 'utf8')).join('\n').toLowerCase()
  for (const old of ['#6b46e5', '#7050f5', '#a78bfa', '#7c5cfc', 'violet']) expect(css, old).not.toContain(old)
  await page.goto('/login')
  const manifest = JSON.parse(readFileSync('dist-e2e/manifest.webmanifest', 'utf8')) as { theme_color: string; background_color: string }
  expect(manifest.theme_color.toLowerCase()).toBe('#3f6b4e')
  expect(manifest.background_color.toLowerCase()).toBe('#e8ede7')
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#3f6b4e')
})

test.describe('penanda kalender dan heatmap memakai token baru', () => {
  test.beforeEach(async ({ page, mock, user }) => { seed(mock, user); await login(page) })

  test('"Sebagian selesai" = cincin kosong, "Semua selesai" = bulatan penuh (dibedakan bentuk, bukan hanya warna)', async ({ page }) => {
    await page.goto('/app/calendar')
    await page.getByRole('button', { name: 'Bulan sebelumnya' }).click()
    const marker = (name: RegExp) => page.getByRole('button', { name }).locator('span[aria-hidden]').last()
    const style = (loc: import('@playwright/test').Locator) => loc.evaluate((e) => { const c = getComputedStyle(e); return { bg: c.backgroundColor, border: parseFloat(c.borderTopWidth), w: e.getBoundingClientRect().width } })
    const partial = await style(marker(/^Jumat, 30 Oktober 2026, 1 dari 2 selesai/)) // Minum selesai, Lari (Jum) belum
    const full = await style(marker(/^Kamis, 29 Oktober 2026, 1 dari 1 selesai/))
    expect(partial.border).toBeGreaterThanOrEqual(2)
    expect(partial.bg).toMatch(/rgba\(0, 0, 0, 0\)|transparent/)
    expect(full.border).toBe(0)
    expect(full.bg).not.toMatch(/rgba\(0, 0, 0, 0\)/)
    expect(partial.w).toBeGreaterThanOrEqual(8)
    // legenda memakai bentuk yang sama
    const legend = page.getByText('Sebagian selesai').locator('span').first()
    expect(await legend.evaluate((e) => parseFloat(getComputedStyle(e).borderTopWidth))).toBeGreaterThanOrEqual(2)
  })

  test('sel heatmap hanya memakai warna token --heat-0..4 dan menampilkan lebih dari satu tingkat', async ({ page }) => {
    await page.goto('/app/analytics')
    const grid = page.getByRole('img', { name: /^Heatmap aktivitas/ })
    await expect(grid).toBeVisible()
    const { used, allowed } = await page.evaluate(() => {
      const probe = (n: number) => { const d = document.createElement('div'); d.style.background = `var(--heat-${n})`; document.body.appendChild(d); const c = getComputedStyle(d).backgroundColor; d.remove(); return c }
      const allowed = [0, 1, 2, 3, 4].map(probe)
      const cells = [...document.querySelectorAll('[data-level]')].filter((e) => e.getAttribute('data-level') !== 'none')
      return { used: [...new Set(cells.map((e) => getComputedStyle(e).backgroundColor).filter((c) => c !== 'rgba(0, 0, 0, 0)'))], allowed }
    })
    expect(used.length).toBeGreaterThanOrEqual(2)
    for (const c of used) expect(allowed, c).toContain(c)
  })
})
