import { groupCompletions } from '@/features/dashboard/summary'
import { monthDates, monthLeadingBlanks } from '@/lib/dates'
import { dailyTotals, dayStatus, wasActiveOn, type DayStatus } from '@/lib/streaks'
import type { Completion, DateString, Habit } from '@/types/habit'

export type DayMarker = 'full' | 'partial' | 'missed' | 'none' | 'future'

export interface CalendarDay { date: DateString; done: number; due: number; marker: DayMarker }
export interface CalendarMonth { month: string; leadingBlanks: number; days: CalendarDay[] }

interface Base { habits: Habit[]; completions: Completion[]; today: DateString; timeZone: string }

export function buildMonth(a: Base & { month: string }): CalendarMonth {
  const dates = monthDates(a.month)
  const totals = dailyTotals({
    habits: a.habits, completedByHabit: groupCompletions(a.completions), today: a.today, timeZone: a.timeZone,
    from: dates[0]!, to: dates[dates.length - 1]!,
  })
  const days = dates.map((date): CalendarDay => {
    const { done, due } = totals.get(date) ?? { done: 0, due: 0 }
    let marker: DayMarker
    if (date > a.today) marker = 'future'
    else if (due === 0) marker = 'none'
    else if (done === due) marker = 'full'
    else if (done > 0) marker = 'partial'
    else marker = date === a.today ? 'none' : 'missed' // hari ini belum bisa disebut terlewat
    return { date, done, due, marker }
  })
  return { month: a.month, leadingBlanks: monthLeadingBlanks(a.month), days }
}

export interface DayDetailItem { habit: Habit; status: DayStatus; completedAt: string | null }
export interface DayDetail { items: DayDetailItem[]; summary: { done: number; due: number } }

export function dayDetail(a: Base & { date: DateString }): DayDetail {
  const byHabit = groupCompletions(a.completions)
  const completedAtByKey = new Map(a.completions.map((c) => [`${c.habitId}|${c.completedDate}`, c.completedAt]))
  const items = a.habits
    .filter((h) => wasActiveOn(h, a.date, a.timeZone))
    .map((habit): DayDetailItem => {
      const status = dayStatus({ habit, completedDates: byHabit.get(habit.id) ?? [], today: a.today, timeZone: a.timeZone, date: a.date })
      return { habit, status, completedAt: status === 'done' ? (completedAtByKey.get(`${habit.id}|${a.date}`) ?? null) : null }
    })
    // Kebiasaan yang belum ada pada tanggal lampau disembunyikan; untuk masa depan tetap tampil sebagai "belum dimulai".
    .filter((i) => !(i.status === 'not_started' && a.date <= a.today))
  const due = items.filter((i) => i.status === 'done' || i.status === 'missed' || i.status === 'pending').length
  return { items, summary: { done: items.filter((i) => i.status === 'done').length, due } }
}
