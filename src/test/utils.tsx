import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AppProviders } from '@/app/providers'
import { AppRoutes } from '@/app/routes'
import { AppAuthError, type AuthEvent, type AuthService, type AuthUser } from '@/features/auth/auth-service'
import { createLocalRepository, type HabitRepository } from '@/features/habits/repository'
import type { DataSource } from '@/features/habits/RepositoryContext'
import { DEFAULT_SETTINGS, type SettingsRepository } from '@/features/settings/settings-repository'
import type { HabitInput } from '@/types/habit'
import type { SettingsPatch, UserSettings } from '@/types/settings'

export const sampleHabit = (over: Partial<HabitInput> = {}): HabitInput => ({
  name: 'Minum air', description: null, category: 'health', icon: 'Droplets', color: '#3b82f6',
  frequency: 'daily', scheduledDays: [], startDate: '2026-10-01', ...over,
})

export const BUDI: AuthUser = { id: 'u-budi', email: 'budi@contoh.id', displayName: 'Budi' }
export const SARI: AuthUser = { id: 'u-sari', email: 'sari@contoh.id', displayName: 'Sari' }

export function memoryStorage(): Storage {
  const m = new Map<string, string>()
  return {
    get length() { return m.size },
    clear: () => m.clear(),
    getItem: (k) => m.get(k) ?? null,
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => void m.delete(k),
    setItem: (k, v) => void m.set(k, v),
  }
}

/** Repositori pengaturan di memori; `updates` mencatat setiap patch yang disimpan. */
export function createMemorySettingsRepository(initial: Partial<UserSettings> = {}) {
  let current: UserSettings = { ...DEFAULT_SETTINGS, ...initial }
  const updates: SettingsPatch[] = []
  const repo: SettingsRepository & { updates: SettingsPatch[] } = {
    updates,
    getSettings: async () => ({ ...current }),
    updateSettings: async (patch) => { updates.push(patch); current = { ...current, ...patch }; return { ...current } },
  }
  return repo
}
export type MemorySettings = ReturnType<typeof createMemorySettingsRepository>

/** Layanan autentikasi tiruan di memori. Akun terdaftar: Budi dan Sari (kata sandi `rahasia123`). */
export function createFakeAuth(initial: AuthUser | null, opts: { requireConfirmation?: boolean } = {}) {
  let user = initial
  const listeners = new Set<(u: AuthUser | null, e: AuthEvent) => void>()
  const accounts = new Map([BUDI, SARI].map((u) => [u.email, { password: 'rahasia123', user: u }]))
  const emit = (e: AuthEvent) => listeners.forEach((cb) => cb(user, e))
  const calls = { signOut: 0, resets: [] as string[], passwords: [] as string[] }
  const service: AuthService = {
    getSession: async () => user,
    onChange: (cb) => { listeners.add(cb); return () => void listeners.delete(cb) },
    async signUp({ displayName, email }) {
      if (accounts.has(email)) throw new AppAuthError('Email sudah terdaftar. Silakan masuk.')
      const created = { id: `u-${email}`, email, displayName }
      accounts.set(email, { password: 'x', user: created })
      if (opts.requireConfirmation) return { needsEmailConfirmation: true }
      user = created
      emit('SIGNED_IN')
      return { needsEmailConfirmation: false }
    },
    async signIn({ email, password }) {
      const acc = accounts.get(email)
      if (!acc || acc.password !== password) throw new AppAuthError('Email atau kata sandi salah.')
      user = acc.user
      emit('SIGNED_IN')
    },
    async signOut() { calls.signOut++; user = null; emit('SIGNED_OUT') },
    async requestPasswordReset(email) { calls.resets.push(email) },
    async updatePassword(pw) { calls.passwords.push(pw) },
  }
  /** Sesi berpindah langsung ke akun lain tanpa SIGNED_OUT (mis. login akun lain di tab kedua). */
  const switchTo = (next: AuthUser) => { user = next; emit('SIGNED_IN') }
  return { service, calls, currentUser: () => user, switchTo }
}

interface RenderOptions {
  /** Pengguna yang sudah masuk. `null` = belum masuk. Default: Budi. */
  user?: AuthUser | null
  /** Satu repositori dipakai semua pengguna (untuk tes satu akun). */
  repository?: HabitRepository
  /** Setiap pengguna mendapat penyimpanan sendiri. */
  isolateUsers?: boolean
  /** Pengaturan awal akun (bila `isolateUsers`, berlaku untuk semua akun kecuali ada di `settingsByUser`). */
  settings?: Partial<UserSettings>
  settingsByUser?: Record<string, Partial<UserSettings>>
  /** Mengganti repositori pengaturan (mis. yang sengaja gagal). */
  settingsRepository?: SettingsRepository
  requireConfirmation?: boolean
}

export function renderApp(path = '/app', opts: RenderOptions = {}) {
  const fake = createFakeAuth(opts.user === undefined ? BUDI : opts.user, { requireConfirmation: opts.requireConfirmation ?? false })
  const perUser = new Map<string, DataSource>()
  const sharedHabits = opts.repository ?? createLocalRepository(localStorage)
  const sharedSettings = createMemorySettingsRepository(opts.settings)
  const createRepository = (userId: string): DataSource => {
    if (!opts.isolateUsers) return { habits: sharedHabits, settings: opts.settingsRepository ?? sharedSettings }
    if (!perUser.has(userId)) {
      perUser.set(userId, {
        habits: createLocalRepository(memoryStorage(), userId),
        settings: opts.settingsRepository ?? createMemorySettingsRepository({ ...opts.settings, ...opts.settingsByUser?.[userId] }),
      })
    }
    return perUser.get(userId)!
  }
  const view = render(
    <AppProviders auth={fake.service} createRepository={createRepository}>
      <MemoryRouter initialEntries={[path]}><AppRoutes /></MemoryRouter>
    </AppProviders>,
  )
  return { ...view, repository: sharedHabits, settings: sharedSettings, auth: fake }
}
