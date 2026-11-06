import { groupCompletions } from '@/features/dashboard/summary'
import { addDays, eachDay, monthOf, startOfWeek } from '@/lib/dates'
import {
  combineRates, completionRate, currentStreak, dailyResults, dailyTotals, longestStreak, streakReachedOn, totalCompletions,
  type RateResult,
} from '@/lib/streaks'
import type { Completion, DateString, Habit } from '@/types/habit'

/**
 * Definisi persentase (satu-satunya, dipakai di seluruh halaman Statistik):
 *   penyelesaian valid ÷ kewajiban terjadwal yang sudah berlangsung sampai hari ini.
 * - Kebiasaan diarsipkan: hanya periode sebelum hari pengarsipan yang dihitung.
 * - Kebiasaan belum dimulai: tidak dihitung.
 * - Jadwal saat ini berlaku untuk seluruh riwayat.
 */
export interface AnalyticsInput {
  habits: Habit[]
  completions: Completion[]
  today: DateString
  timeZone: string
}

export interface AnalyticsSummary {
  hasHabits: boolean
  week: RateResult
  month: RateResult
  overall: RateResult
  bestCurrentStreak: number
  longestStreak: number
  totalCompletions: number
}

const habitInput = (a: AnalyticsInput, byHabit: Map<string, DateString[]>) => (habit: Habit) => ({
  habit, completedDates: byHabit.get(habit.id) ?? [], today: a.today, timeZone: a.timeZone,
})

export function buildAnalyticsSummary(a: AnalyticsInput): AnalyticsSummary {
  const byHabit = groupCompletions(a.completions)
  const inputFor = habitInput(a, byHabit)
  const rate = (from: DateString) => combineRates(a.habits.map((h) => completionRate({ ...inputFor(h), from, to: a.today })))
  return {
    hasHabits: a.habits.length > 0,
    week: rate(startOfWeek(a.today)),
    month: rate(`${monthOf(a.today)}-01`),
    overall: rate('1970-01-01'),
    bestCurrentStreak: Math.max(0, ...a.habits.filter((h) => !h.archivedAt).map((h) => currentStreak(inputFor(h)))),
    longestStreak: Math.max(0, ...a.habits.map((h) => longestStreak(inputFor(h)))),
    totalCompletions: a.habits.reduce((s, h) => s + totalCompletions(inputFor(h)), 0),
  }
}

export interface DayPoint { date: DateString; done: number; due: number; rate: number | null }

/** `days` hari berurutan yang berakhir hari ini. */
export function dailySeries(a: AnalyticsInput, days: number): DayPoint[] {
  const from = addDays(a.today, -(days - 1))
  const totals = dailyTotals({ habits: a.habits, completedByHabit: groupCompletions(a.completions), today: a.today, timeZone: a.timeZone, from, to: a.today })
  return eachDay(from, a.today).map((date) => {
    const t = totals.get(date) ?? { done: 0, due: 0 }
    return { date, done: t.done, due: t.due, rate: t.due === 0 ? null : t.done / t.due }
  })
}

export interface HabitPerformance {
  habit: Habit
  rate: RateResult
  currentStreak: number
  longestStreak: number
  total: number
}

/** Performa tiap kebiasaan dalam `days` hari terakhir; kebiasaan tanpa kewajiban pada rentang itu tidak ditampilkan. */
export function habitPerformance(a: AnalyticsInput, days: number): HabitPerformance[] {
  const byHabit = groupCompletions(a.completions)
  const inputFor = habitInput(a, byHabit)
  const from = addDays(a.today, -(days - 1))
  return a.habits
    .map((habit) => ({
      habit,
      rate: completionRate({ ...inputFor(habit), from, to: a.today }),
      currentStreak: currentStreak(inputFor(habit)),
      longestStreak: longestStreak(inputFor(habit)),
      total: totalCompletions(inputFor(habit)),
    }))
    .filter((p) => p.rate.due > 0)
    .sort((x, y) => (y.rate.rate ?? 0) - (x.rate.rate ?? 0) || x.habit.name.localeCompare(y.habit.name, 'id'))
}

export interface HeatCell {
  date: DateString
  /** null = tidak ada kewajiban atau belum tiba; 0 = ada kewajiban tetapi tak ada yang selesai; 1–4 menurut persentase. */
  level: 0 | 1 | 2 | 3 | 4 | null
  done: number
  due: number
  future: boolean
}

/** `weeks` kolom (pekan, Senin–Minggu) yang berakhir pada pekan berjalan. */
export function heatmap(a: AnalyticsInput, weeks: number): HeatCell[][] {
  const weekStart = startOfWeek(a.today)
  const first = addDays(weekStart, -(weeks - 1) * 7)
  const totals = dailyTotals({ habits: a.habits, completedByHabit: groupCompletions(a.completions), today: a.today, timeZone: a.timeZone, from: first, to: a.today })
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d): HeatCell => {
      const date = addDays(first, w * 7 + d)
      const future = date > a.today
      const t = totals.get(date) ?? { done: 0, due: 0 }
      let level: HeatCell['level'] = null
      if (!future && t.due > 0) {
        const r = t.done / t.due
        level = t.done === 0 ? 0 : r <= 0.25 ? 1 : r <= 0.5 ? 2 : r <= 0.75 ? 3 : 4
      }
      return { date, level, done: t.done, due: t.due, future }
    }),
  )
}

export interface Achievement { id: string; title: string; description: string; achievedOn: DateString }

const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100]
const TOTAL_MILESTONES = [1, 10, 50, 100, 500]

/** Pencapaian yang sudah diraih beserta tanggalnya, terbaru dulu. Dihitung dari data tersimpan, bukan disimpan terpisah. */
export function achievements(a: AnalyticsInput): Achievement[] {
  if (a.habits.length === 0) return []
  const byHabit = groupCompletions(a.completions)
  const inputFor = habitInput(a, byHabit)
  const out: Achievement[] = []

  for (const n of STREAK_MILESTONES) {
    let best: { date: DateString; habit: Habit } | null = null
    for (const habit of a.habits) {
      const date = streakReachedOn(inputFor(habit), n)
      if (date && (!best || date < best.date)) best = { date, habit }
    }
    if (best) out.push({ id: `streak-${n}`, title: `Rentetan ${n} Hari`, description: `${best.habit.name}: ${n} hari berturut-turut`, achievedOn: best.date })
  }

  const from = a.habits.reduce((m, h) => (h.startDate < m ? h.startDate : m), a.habits[0]!.startDate)
  const validDates = a.habits
    .flatMap((h) => dailyResults({ ...inputFor(h), from, to: a.today }).filter((r) => r.done).map((r) => r.date))
    .sort()
  for (const n of TOTAL_MILESTONES) {
    const date = validDates[n - 1]
    if (date) out.push({ id: `total-${n}`, title: n === 1 ? 'Penyelesaian Pertama' : `${n} Penyelesaian`, description: `Total ${n} penyelesaian`, achievedOn: date })
  }

  const totals = dailyTotals({ habits: a.habits, completedByHabit: byHabit, today: a.today, timeZone: a.timeZone, from, to: a.today })
  const perfect = [...totals.entries()].filter(([, t]) => t.due > 0 && t.done === t.due).map(([d]) => d).sort()[0]
  if (perfect) out.push({ id: 'perfect-first', title: 'Hari Sempurna Pertama', description: 'Semua kebiasaan terjadwal selesai dalam satu hari.', achievedOn: perfect })

  return out.sort((x, y) => y.achievedOn.localeCompare(x.achievedOn) || x.id.localeCompare(y.id))
}
