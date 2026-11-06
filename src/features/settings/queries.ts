import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSettingsRepository } from '@/features/habits/RepositoryContext'
import type { SettingsPatch, UserSettings } from '@/types/settings'

const KEY = ['settings']

export function useSettings() {
  const repo = useSettingsRepository()
  return useQuery({ queryKey: KEY, queryFn: () => repo.getSettings() })
}

export function useUpdateSettings() {
  const repo = useSettingsRepository()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (patch: SettingsPatch) => repo.updateSettings(patch),
    // Memakai baris yang dikembalikan server sebagai sumber kebenaran, bukan tebakan lokal.
    onSuccess: (saved: UserSettings) => qc.setQueryData(KEY, saved),
  })
}
