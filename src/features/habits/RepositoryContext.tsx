import { createContext, useContext, type ReactNode } from 'react'
import type { HabitRepository } from '@/features/habits/repository'
import type { SettingsRepository } from '@/features/settings/settings-repository'

const RepositoryContext = createContext<HabitRepository | null>(null)
const SettingsRepositoryContext = createContext<SettingsRepository | null>(null)

/** Seluruh akses data milik satu pengguna. */
export interface DataSource {
  habits: HabitRepository
  settings: SettingsRepository
}

export function RepositoryProvider({ source, children }: { source: DataSource; children: ReactNode }) {
  return (
    <RepositoryContext.Provider value={source.habits}>
      <SettingsRepositoryContext.Provider value={source.settings}>{children}</SettingsRepositoryContext.Provider>
    </RepositoryContext.Provider>
  )
}

export function useRepository(): HabitRepository {
  const repo = useContext(RepositoryContext)
  if (!repo) throw new Error('useRepository harus dipakai di dalam RepositoryProvider')
  return repo
}

export function useSettingsRepository(): SettingsRepository {
  const repo = useContext(SettingsRepositoryContext)
  if (!repo) throw new Error('useSettingsRepository harus dipakai di dalam RepositoryProvider')
  return repo
}

/** Pabrik sumber data per pengguna; dipakai penjaga route saat sesi tersedia. */
export type RepositoryFactory = (userId: string) => DataSource
const FactoryContext = createContext<RepositoryFactory | null>(null)
export const RepositoryFactoryProvider = FactoryContext.Provider

export function useRepositoryFactory(): RepositoryFactory {
  const f = useContext(FactoryContext)
  if (!f) throw new Error('useRepositoryFactory harus dipakai di dalam AppProviders')
  return f
}
