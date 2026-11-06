import { test, expect, login, seed } from './fixtures'

test('harness: login ke backend tiruan lalu Beranda tampil dengan data awal', async ({ page, mock, user, consoleErrors }) => {
  seed(mock, user)
  await login(page)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByText('Minum air 2 liter').first()).toBeVisible()
  await page.screenshot({ path: 'e2e/screenshots/smoke.png' })
  console.log('console errors:', JSON.stringify(consoleErrors), 'external blocked:', JSON.stringify(mock.externalBlocked))
})
