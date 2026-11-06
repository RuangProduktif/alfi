import { addDays, eachDay, startOfWeek } from '@/lib/dates'
import {
  combineRates, completionRate, currentStreak, isScheduledOn, longestStreak, totalCompletions, type RateResult,
} from '@/lib/streaks'
import type { Completion, DateString, Habit } from '@/types/habit'

export interface TodayItem { habit: Habit; done: boolean; streak: number }
export interface WeekDay { date: DateString; done: number; due: number; rate: number | null }
export interface RecentActivity { id: string; habit: Habit; completedDate: DateString; completedAt: string }

export interface DashboardSummary {
  todayItems: TodayItem[]
  progress: RateResult
  bestCurrentStreak: number
  longestStreak: number
  totalCompletions: number
  activeHabitCount: number
  week: WeekDay[]
  recent: RecentActivity[]
}

export function groupCompletions(completions: Completion[]): Map<string, DateString[]> {
  const map = new Map<string, DateString[]>()
  for (const c of completions) map.set(c.habitId, [...(map.get(c.habitId) ?? []), c.completedDate])
  return map
}

export function buildDashboardSummary(args: {
  habits: Habit[]
  completions: Completion[]
  today: DateString
  timeZone: string
}): DashboardSummary {
  const { habits, completions, today, timeZone } = args
  const byHabit = groupCompletions(completions)
  const inputFor = (habit: Habit) => ({ habit, completedDates: byHabit.get(habit.id) ?? [], today, timeZone })

  const active = habits.filter((h) => !h.archivedAt)
  const todayItems = active
    .filter((h) => isScheduledOn(h, today, timeZone))
    .map((habit) => ({
      habit,
      done: (byHabit.get(habit.id) ?? []).includes(today),
      streak: currentStreak(inputFor(habit)),
    }))

  const weekStart = startOfWeek(today)
  const week = eachDay(weekStart, addDays(weekStart, 6)).map((date) => {
    const r = combineRates(habits.map((h) => completionRate({ ...inputFor(h), from: date, to: date })))
    return { date, done: r.done, due: r.due, rate: r.rate }
  })

  const habitById = new Map(habits.map((h) => [h.id, h]))
  const recent = completions
    .flatMap((c) => {
      const habit = habitById.get(c.habitId)
      return habit ? [{ id: c.id, habit, completedDate: c.completedDate, completedAt: c.completedAt }] : []
    })
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
    .slice(0, 5)

  return {
    todayItems,
    progress: { done: todayItems.filter((i) => i.done).length, due: todayItems.length, rate: todayItems.length ? todayItems.filter((i) => i.done).length / todayItems.length : null },
    bestCurrentStreak: Math.max(0, ...active.map((h) => currentStreak(inputFor(h)))),
    longestStreak: Math.max(0, ...habits.map((h) => longestStreak(inputFor(h)))),
    totalCompletions: habits.reduce((s, h) => s + totalCompletions(inputFor(h)), 0),
    activeHabitCount: active.length,
    week,
    recent,
  }
}

export function greetingFor(hour: number): string {
  if (hour >= 4 && hour < 11) return 'Selamat pagi!'
  if (hour >= 11 && hour < 15) return 'Selamat siang!'
  if (hour >= 15 && hour < 18) return 'Selamat sore!'
  return 'Selamat malam!'
}
