import type { Theme } from '@/lib/theme'

export interface UserSettings {
  theme: Theme
  timezone: string
  locale: string
}

/** Yang boleh diubah pengguna. Locale tetap id-ID. */
export type SettingsPatch = Partial<Pick<UserSettings, 'theme' | 'timezone'>>
