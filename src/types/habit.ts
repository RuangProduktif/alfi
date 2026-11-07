export const CATEGORIES = ['health', 'fitness', 'learning', 'productivity', 'finance', 'mindfulness', 'other'] as const
export type Category = (typeof CATEGORIES)[number]

export type Frequency = 'daily' | 'weekly_days'

/** Tanggal kalender 'YYYY-MM-DD' (bukan timestamp). */
export type DateString = string

export interface Habit {
  id: string
  userId: string
  name: string
  description: string | null
  category: Category
  icon: string
  color: string
  frequency: Frequency
  /** Hari dalam seminggu, 0 = Minggu ... 6 = Sabtu. Hanya dipakai bila frequency = 'weekly_days'. */
  scheduledDays: number[]
  startDate: DateString
  archivedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface Completion {
  id: string
  habitId: string
  userId: string
  completedDate: DateString
  completedAt: string
  createdAt: string
}

/** Data yang dikirim dari form (sudah tervalidasi) untuk membuat/mengubah kebiasaan. */
export interface HabitInput {
  name: string
  description: string | null
  category: Category
  icon: string
  color: string
  frequency: Frequency
  scheduledDays: number[]
  startDate: DateString
}
