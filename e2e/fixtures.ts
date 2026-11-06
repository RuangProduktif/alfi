import { test as base, expect, type Page } from '@playwright/test'
import { MockSupabase, type MockOptions, type MockUser } from './mock-supabase'

/** Waktu tetap: Selasa, 3 November 2026 10:00 WIB (03:00 UTC). */
export const NOW = new Date('2026-11-03T03:00:00Z')
export const TODAY = '2026-11-03'
export const EMAIL = 'uji@ritual.test'
export const PASSWORD = 'Rahasia123!'

interface Fixtures {
  /** true: mock berjalan sebagai server HTTP sungguhan (dipakai uji PWA karena service worker). */
  mockServer: boolean
  mock: MockSupabase
  user: MockUser
  consoleErrors: string[]
}

export const test = base.extend<Fixtures & { mockOptions: MockOptions }>({
  mockOptions: [{}, { option: true }],
  mockServer: [false, { option: true }],
  mock: async ({ context, mockOptions, mockServer }, provide) => {
    const m = new MockSupabase(mockOptions)
    if (mockServer) await m.serve(context)
    else await m.install(context)
    await provide(m)
    await m.close()
  },
  user: async ({ mock }, provide) => { await provide(mock.addUser(EMAIL, PASSWORD, 'Dewi')) },
  consoleErrors: async ({ page }, provide) => {
    const errors: string[] = []
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
    await provide(errors)
  },
  page: async ({ page }, provide) => {
    await page.clock.setFixedTime(NOW)
    await provide(page)
  },
})
export { expect }

export async function login(page: Page, email = EMAIL, password = PASSWORD) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Kata sandi').fill(password)
  await page.getByRole('button', { name: 'Masuk' }).click()
  await page.waitForURL('**/app')
}

/** Data awal: 3 kebiasaan (harian, 3x seminggu, satu diarsipkan) + riwayat beberapa hari. */
export function seed(mock: MockSupabase, user: MockUser) {
  const minum = mock.addHabit(user.id, { name: 'Minum air 2 liter', category: 'health', icon: 'Droplets', start_date: '2026-10-01' })
  const lari = mock.addHabit(user.id, { name: 'Lari pagi', category: 'fitness', icon: 'Dumbbell', frequency: 'weekly_days', scheduled_days: [1, 3, 5], start_date: '2026-10-01' })
  const lama = mock.addHabit(user.id, { name: 'Kebiasaan lama', category: 'other', start_date: '2026-10-01', archived_at: '2026-10-20T00:00:00Z' })
  for (const d of ['2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02']) mock.addCompletion(user.id, minum.id as string, d)
  mock.addCompletion(user.id, lari.id as string, '2026-11-02')
  return { minum, lari, lama }
}
