import type { Completion, Habit } from '@/types/habit'

export const TZ = 'Asia/Jakarta'

export function makeHabit(over: Partial<Habit> = {}): Habit {
  return {
    id: 'h1', userId: 'u1', name: 'Minum air', description: null, category: 'health', icon: 'Droplets',
    color: '#3b82f6', frequency: 'daily', scheduledDays: [], startDate: '2026-10-01', archivedAt: null,
    createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z', ...over,
  }
}

export const makeCompletion = (habitId: string, completedDate: string, completedAt = `${completedDate}T01:00:00Z`): Completion => ({
  id: `${habitId}-${completedDate}`, habitId, userId: 'u1', completedDate, completedAt, createdAt: completedAt,
})
