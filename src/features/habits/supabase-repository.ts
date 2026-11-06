import type { SupabaseClient } from '@supabase/supabase-js'
import { fail } from '@/lib/supabase/errors'
import type { HabitRepository } from '@/features/habits/repository'
import type { Category, Completion, Frequency, Habit, HabitInput } from '@/types/habit'

interface HabitRow {
  id: string; user_id: string; name: string; description: string | null; category: string; icon: string; color: string
  frequency: string; scheduled_days: number[]; start_date: string; archived_at: string | null; created_at: string; updated_at: string
}
interface CompletionRow { id: string; habit_id: string; user_id: string; completed_date: string; completed_at: string; created_at: string }

export const toHabit = (r: HabitRow): Habit => ({
  id: r.id, userId: r.user_id, name: r.name, description: r.description, category: r.category as Category, icon: r.icon, color: r.color,
  frequency: r.frequency as Frequency, scheduledDays: r.scheduled_days ?? [], startDate: r.start_date, archivedAt: r.archived_at,
  createdAt: r.created_at, updatedAt: r.updated_at,
})
export const toCompletion = (r: CompletionRow): Completion => ({
  id: r.id, habitId: r.habit_id, userId: r.user_id, completedDate: r.completed_date, completedAt: r.completed_at, createdAt: r.created_at,
})
const toRow = (i: HabitInput) => ({
  name: i.name, description: i.description, category: i.category, icon: i.icon, color: i.color, frequency: i.frequency,
  scheduled_days: i.scheduledDays, start_date: i.startDate,
})

/** PostgREST membatasi respons (default 1000 baris), jadi penyelesaian diambil per halaman. */
export const PAGE_SIZE = 1000
const UNIQUE_VIOLATION = '23505'

export function createSupabaseRepository(client: SupabaseClient, userId: string): HabitRepository {
  return {
    async listHabits() {
      const { data, error } = await client.from('habits').select('*').order('created_at').order('id')
      if (error) fail(error)
      return (data as HabitRow[]).map(toHabit)
    },
    async createHabit(input) {
      const { data, error } = await client.from('habits').insert({ ...toRow(input), user_id: userId }).select().single()
      if (error) fail(error)
      return toHabit(data as HabitRow)
    },
    async updateHabit(id, input) {
      const { data, error } = await client.from('habits').update(toRow(input)).eq('id', id).select().single()
      if (error) fail(error)
      return toHabit(data as HabitRow)
    },
    async setArchived(id, archived) {
      const { data, error } = await client.from('habits').update({ archived_at: archived ? new Date().toISOString() : null }).eq('id', id).select().single()
      if (error) fail(error)
      return toHabit(data as HabitRow)
    },
    async deleteHabit(id) {
      // Penyelesaian ikut terhapus oleh ON DELETE CASCADE.
      const { error } = await client.from('habits').delete().eq('id', id)
      if (error) fail(error)
    },
    async listCompletions() {
      const out: Completion[] = []
      for (let from = 0; ; from += PAGE_SIZE) {
        const { data, error } = await client
          .from('habit_completions').select('*').order('completed_date').order('id').range(from, from + PAGE_SIZE - 1)
        if (error) fail(error)
        const rows = data as CompletionRow[]
        out.push(...rows.map(toCompletion))
        if (rows.length < PAGE_SIZE) return out
      }
    },
    async completeHabit(habitId, date) {
      const inserted = await client.from('habit_completions').insert({ habit_id: habitId, user_id: userId, completed_date: date }).select().single()
      if (!inserted.error) return toCompletion(inserted.data as CompletionRow)
      if (inserted.error.code !== UNIQUE_VIOLATION) fail(inserted.error)
      // Sudah ada untuk tanggal itu: perilaku idempoten, kembalikan yang ada.
      const existing = await client.from('habit_completions').select('*').eq('habit_id', habitId).eq('completed_date', date).single()
      if (existing.error) fail(existing.error)
      return toCompletion(existing.data as CompletionRow)
    },
    async uncompleteHabit(habitId, date) {
      const { error } = await client.from('habit_completions').delete().eq('habit_id', habitId).eq('completed_date', date)
      if (error) fail(error)
    },
  }
}
