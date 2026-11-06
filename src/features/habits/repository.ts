import { isValidDateString } from '@/lib/dates'
import type { Completion, DateString, Habit, HabitInput } from '@/types/habit'

/**
 * Batas akses data. Implementasi lokal di bawah dipakai sebelum Supabase dikonfigurasi;
 * implementasi Supabase (Fase 4–5) memakai antarmuka yang sama.
 */
export interface HabitRepository {
  listHabits(): Promise<Habit[]>
  createHabit(input: HabitInput): Promise<Habit>
  updateHabit(id: string, input: HabitInput): Promise<Habit>
  setArchived(id: string, archived: boolean): Promise<Habit>
  /** Menghapus permanen kebiasaan beserta seluruh riwayat penyelesaiannya. */
  deleteHabit(id: string): Promise<void>
  listCompletions(): Promise<Completion[]>
  /** Idempoten: satu kebiasaan hanya punya satu penyelesaian per tanggal. */
  completeHabit(habitId: string, date: DateString): Promise<Completion>
  uncompleteHabit(habitId: string, date: DateString): Promise<void>
}

const HABITS_KEY = 'ritual:habits'
const COMPLETIONS_KEY = 'ritual:completions'

function read<T>(storage: Storage, key: string): T[] {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(key) ?? '[]')
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}
const write = (storage: Storage, key: string, value: unknown) => storage.setItem(key, JSON.stringify(value))

export function createLocalRepository(
  storage: Storage,
  userId = 'local-user',
  now: () => Date = () => new Date(),
): HabitRepository {
  const habits = () => read<Habit>(storage, HABITS_KEY)
  const completions = () => read<Completion>(storage, COMPLETIONS_KEY)

  function mutateHabit(id: string, change: (h: Habit) => Habit): Habit {
    const all = habits()
    const idx = all.findIndex((h) => h.id === id)
    const current = all[idx]
    if (!current) throw new Error('Kebiasaan tidak ditemukan.')
    const next = { ...change(current), updatedAt: now().toISOString() }
    all[idx] = next
    write(storage, HABITS_KEY, all)
    return next
  }

  return {
    async listHabits() {
      return habits()
    },
    async createHabit(input) {
      const ts = now().toISOString()
      const habit: Habit = { ...input, id: crypto.randomUUID(), userId, archivedAt: null, createdAt: ts, updatedAt: ts }
      write(storage, HABITS_KEY, [...habits(), habit])
      return habit
    },
    async updateHabit(id, input) {
      return mutateHabit(id, (h) => ({ ...h, ...input }))
    },
    async setArchived(id, archived) {
      return mutateHabit(id, (h) => ({ ...h, archivedAt: archived ? now().toISOString() : null }))
    },
    async deleteHabit(id) {
      write(storage, HABITS_KEY, habits().filter((h) => h.id !== id))
      write(storage, COMPLETIONS_KEY, completions().filter((c) => c.habitId !== id))
    },
    async listCompletions() {
      return completions()
    },
    async completeHabit(habitId, date) {
      if (!isValidDateString(date)) throw new Error('Tanggal tidak valid.')
      if (!habits().some((h) => h.id === habitId)) throw new Error('Kebiasaan tidak ditemukan.')
      const all = completions()
      const existing = all.find((c) => c.habitId === habitId && c.completedDate === date)
      if (existing) return existing
      const ts = now().toISOString()
      const completion: Completion = {
        id: crypto.randomUUID(), habitId, userId, completedDate: date, completedAt: ts, createdAt: ts,
      }
      write(storage, COMPLETIONS_KEY, [...all, completion])
      return completion
    },
    async uncompleteHabit(habitId, date) {
      write(storage, COMPLETIONS_KEY, completions().filter((c) => !(c.habitId === habitId && c.completedDate === date)))
    },
  }
}
