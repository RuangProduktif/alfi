import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRepository } from '@/features/habits/RepositoryContext'
import { useToday } from '@/hooks/useToday'
import { BACKFILL_DAYS, canEditDate } from '@/lib/streaks'
import type { DateString, HabitInput } from '@/types/habit'

export function useHabitData() {
  const repo = useRepository()
  const habits = useQuery({ queryKey: ['habits'], queryFn: () => repo.listHabits() })
  const completions = useQuery({ queryKey: ['completions'], queryFn: () => repo.listCompletions() })
  return {
    habits: habits.data ?? [],
    completions: completions.data ?? [],
    isLoading: habits.isLoading || completions.isLoading,
    isError: habits.isError || completions.isError,
    refetch: () => { void habits.refetch(); void completions.refetch() },
  }
}

function useRefreshAfter() {
  const qc = useQueryClient()
  return () => Promise.all([qc.invalidateQueries({ queryKey: ['habits'] }), qc.invalidateQueries({ queryKey: ['completions'] })])
}

export function useSaveHabit() {
  const repo = useRepository()
  const refresh = useRefreshAfter()
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: HabitInput }) => (id ? repo.updateHabit(id, input) : repo.createHabit(input)),
    onSuccess: refresh,
  })
}

export function useSetArchived() {
  const repo = useRepository()
  const refresh = useRefreshAfter()
  return useMutation({ mutationFn: ({ id, archived }: { id: string; archived: boolean }) => repo.setArchived(id, archived), onSuccess: refresh })
}

export function useDeleteHabit() {
  const repo = useRepository()
  const refresh = useRefreshAfter()
  return useMutation({ mutationFn: (id: string) => repo.deleteHabit(id), onSuccess: refresh })
}

export function useToggleCompletion() {
  const repo = useRepository()
  const refresh = useRefreshAfter()
  const { today } = useToday()
  return useMutation({
    mutationFn: async ({ habitId, date, complete }: { habitId: string; date: DateString; complete: boolean }) => {
      const check = canEditDate(date, today)
      if (!check.allowed) {
        throw new Error(check.reason === 'future' ? 'Tidak dapat menandai tanggal yang belum tiba.' : `Perubahan hanya dapat dilakukan hingga ${BACKFILL_DAYS} hari ke belakang.`)
      }
      if (complete) await repo.completeHabit(habitId, date)
      else await repo.uncompleteHabit(habitId, date)
    },
    onSuccess: refresh,
  })
}
