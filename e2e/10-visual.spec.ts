import { mkdirSync, writeFileSync } from 'node:fs'
import { test, expect, login, seed } from './fixtures'
import { auditPage, type PageAudit } from './page-checks'

const VIEWPORTS = [
  { name: 'mobile', width: 360, height: 740 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 800 },
]
const THEMES = ['light', 'dark'] as const
const PUBLIC = ['/login', '/signup', '/forgot-password', '/halaman-yang-tidak-ada']
const PRIVATE = ['/app', '/app/habits', '/app/calendar', '/app/analytics', '/app/settings', '/app/profile']

// Satu berkas per halaman: Playwright memulai ulang worker setelah tes gagal, jadi state modul tidak aman dipakai.
function saveAudit(key: string, audit: PageAudit) {
  mkdirSync('e2e/reports/visual', { recursive: true })
  writeFileSync(`e2e/reports/visual/${key.replace(/[|/]/g, '_')}.json`, JSON.stringify({ key, ...audit }, null, 2))
}

for (const vp of VIEWPORTS) {
  for (const theme of THEMES) {
    for (const path of [...PUBLIC, ...PRIVATE]) {
      const isPrivate = path.startsWith('/app')
      test(`${vp.name} ${theme} ${path}`, async ({ page, mock, user, consoleErrors }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height })
        await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' })
        seed(mock, user)
        if (isPrivate) { await login(page); await page.goto(path) } else { await page.goto(path) }
        await expect(page.getByRole('heading').first()).toBeVisible()
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(300) // beri waktu grafik Recharts selesai menggambar
        expect(await page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(theme === 'dark')

        const audit = await auditPage(page)
        const key = `${vp.name}|${theme}|${path}`
        saveAudit(key, audit)
        await page.screenshot({ path: `e2e/screenshots/${vp.name}-${theme}-${path.replace(/\//g, '_') || 'root'}.png`, fullPage: true })

        expect(audit.overflowX, `overflow horizontal: ${audit.overflowing.join('; ')}`).toBe(0)
        expect(audit.contrastIssues, 'kontras teks di bawah WCAG AA').toEqual([])
        expect(audit.nonTextIssues, 'batas kolom isian < 3:1 (WCAG 1.4.11)').toEqual([])
        expect(audit.unnamed, 'elemen tanpa nama aksesibel').toEqual([])
        expect(audit.smallTargets, 'target sentuh < 24px').toEqual([])
        expect(audit.htmlLang).toBe('id')
        expect(audit.h1Count, 'tepat satu h1').toBe(1)
        if (isPrivate) {
          const desktopNav = vp.width >= 768
          expect(audit.sidebarVisible, 'sidebar').toBe(desktopNav)
          expect(audit.bottomNavVisible, 'navigasi bawah').toBe(!desktopNav)
        }
        expect(consoleErrors).toEqual([])
        expect(mock.externalBlocked).toEqual([])
      })
    }
  }
}
