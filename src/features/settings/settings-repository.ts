import type { SupabaseClient } from '@supabase/supabase-js'
import { DEFAULT_TIMEZONE } from '@/lib/dates'
import { fail } from '@/lib/supabase/errors'
import type { Theme } from '@/lib/theme'
import type { SettingsPatch, UserSettings } from '@/types/settings'

export interface SettingsRepository {
  getSettings(): Promise<UserSettings>
  updateSettings(patch: SettingsPatch): Promise<UserSettings>
}

export const DEFAULT_SETTINGS: UserSettings = { theme: 'system', timezone: DEFAULT_TIMEZONE, locale: 'id-ID' }

interface SettingsRow { user_id: string; theme: string; timezone: string; locale: string }
export const toSettings = (r: SettingsRow): UserSettings => ({ theme: r.theme as Theme, timezone: r.timezone, locale: r.locale })

const UNIQUE_VIOLATION = '23505'

export function createSupabaseSettingsRepository(client: SupabaseClient, userId: string): SettingsRepository {
  const selectOwn = () => client.from('user_settings').select('*').eq('user_id', userId)
  return {
    async getSettings() {
      const found = await selectOwn().maybeSingle()
      if (found.error) fail(found.error)
      if (found.data) return toSettings(found.data as SettingsRow)

      // Akun yang dibuat sebelum trigger ada belum punya baris pengaturan: buat dengan nilai bawaan database.
      const created = await client.from('user_settings').insert({ user_id: userId }).select().single()
      if (!created.error) return toSettings(created.data as SettingsRow)
      if (created.error.code !== UNIQUE_VIOLATION) fail(created.error)
      const again = await selectOwn().single() // balapan: sudah dibuat oleh permintaan lain
      if (again.error) fail(again.error)
      return toSettings(again.data as SettingsRow)
    },
    async updateSettings(patch) {
      const { data, error } = await client.from('user_settings').update(patch).eq('user_id', userId).select().single()
      if (error) fail(error)
      return toSettings(data as SettingsRow)
    },
  }
}
