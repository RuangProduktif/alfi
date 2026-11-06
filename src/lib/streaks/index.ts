import { addDays, dayOfWeek, eachDay, todayInTimeZone } from '@/lib/dates'
import type { DateString, Habit } from '@/types/habit'

/**
 * Satu-satunya sumber logika jadwal, rentetan, dan persentase penyelesaian.
 *
 * Aturan:
 * - Hari "terjadwal" = sejak tanggal mulai, sebelum hari pengarsipan (zona waktu pengguna),
 *   dan (harian, atau hari-dalam-minggu termasuk jadwal).
 * - Jadwal SAAT INI berlaku untuk seluruh riwayat (riwayat perubahan jadwal tidak disimpan).
 *   Penyelesaian pada hari yang tidak terjadwal tidak dihitung, tetapi juga tidak memutus rentetan.
 * - Penyelesaian pada tanggal masa depan atau sebelum tanggal mulai diabaikan.
 * - Hari ini yang belum selesai tidak memutus rentetan saat ini (hari belum berakhir);
 *   hari terjadwal sebelum hari ini yang terlewat memutusnya.
 * - Kebiasaan diarsipkan: rentetan saat ini = 0; rekor & persentase tetap dihitung
 *   untuk periode sebelum pengarsipan agar riwayat terjaga.
 */
export interface StreakInput {
  habit: Habit
  completedDates: Iterable<DateString>
  today: DateString
  timeZone: string
}

export interface RateResult {
  done: number
  due: number
  rate: number | null
}

function archiveDate(habit: Habit, timeZone: string): DateString | null {
  return habit.archivedAt ? todayInTimeZone(new Date(habit.archivedAt), timeZone) : null
}

export function isScheduledOn(habit: Habit, date: DateString, timeZone: string): boolean {
  if (date < habit.startDate) return false
  const archived = archiveDate(habit, timeZone)
  if (archived && date >= archived) return false
  if (habit.frequency === 'daily') return true
  return habit.scheduledDays.includes(dayOfWeek(date))
}

/** Tanggal terakhir yang masih dinilai: min(hari ini, sehari sebelum pengarsipan). */
function lastEvaluatedDate({ habit, today, timeZone }: StreakInput): DateString {
  const archived = archiveDate(habit, timeZone)
  return archived && addDays(archived, -1) < today ? addDays(archived, -1) : today
}

/** Himpunan penyelesaian valid: unik, terjadwal, tidak di masa depan. */
function validCompletions(input: StreakInput): Set<DateString> {
  const out = new Set<DateString>()
  for (const d of input.completedDates) {
    if (d <= input.today && isScheduledOn(input.habit, d, input.timeZone)) out.add(d)
  }
  return out
}

export function currentStreak(input: StreakInput): number {
  const { habit, today, timeZone } = input
  if (habit.archivedAt) return 0
  const done = validCompletions(input)
  let streak = 0
  for (let d = today; d >= habit.startDate; d = addDays(d, -1)) {
    if (!isScheduledOn(habit, d, timeZone)) continue
    if (done.has(d)) streak++
    else if (d === today) continue
    else break
  }
  return streak
}

export function longestStreak(input: StreakInput): number {
  const { habit, timeZone } = input
  const done = validCompletions(input)
  const end = lastEvaluatedDate(input)
  let run = 0
  let best = 0
  for (let d = habit.startDate; d <= end; d = addDays(d, 1)) {
    if (!isScheduledOn(habit, d, timeZone)) continue
    if (done.has(d)) best = Math.max(best, ++run)
    else run = 0
  }
  return best
}

export function totalCompletions(input: StreakInput): number {
  return validCompletions(input).size
}

/** Persentase = penyelesaian valid / kewajiban terjadwal dalam [from, to] yang sudah berlangsung. */
export function completionRate(input: StreakInput & { from: DateString; to: DateString }): RateResult {
  const { habit, timeZone, from, to } = input
  const start = from > habit.startDate ? from : habit.startDate
  const last = lastEvaluatedDate(input)
  const end = to < last ? to : last
  if (start > end) return { done: 0, due: 0, rate: null }
  const done = validCompletions(input)
  let due = 0
  let count = 0
  for (const d of eachDay(start, end)) {
    if (!isScheduledOn(habit, d, timeZone)) continue
    due++
    if (done.has(d)) count++
  }
  return { done: count, due, rate: due === 0 ? null : count / due }
}

export function combineRates(results: RateResult[]): RateResult {
  const done = results.reduce((s, r) => s + r.done, 0)
  const due = results.reduce((s, r) => s + r.due, 0)
  return { done, due, rate: due === 0 ? null : done / due }
}

// ---------------------------------------------------------------------------
// Kalender, statistik, dan aturan batas mundur
// ---------------------------------------------------------------------------

/** Kebiasaan masih aktif pada tanggal itu (belum diarsipkan pada atau sebelum tanggal tersebut). */
export function wasActiveOn(habit: Habit, date: DateString, timeZone: string): boolean {
  const archived = archiveDate(habit, timeZone)
  return !archived || date < archived
}

export type DayStatus = 'done' | 'missed' | 'pending' | 'not_scheduled' | 'future' | 'not_started'

export function dayStatus(input: StreakInput & { date: DateString }): DayStatus {
  const { habit, date, today, timeZone } = input
  if (date < habit.startDate) return 'not_started'
  if (!isScheduledOn(habit, date, timeZone)) return 'not_scheduled'
  if (date > today) return 'future'
  if (validCompletions(input).has(date)) return 'done'
  return date === today ? 'pending' : 'missed'
}

/** Hari terjadwal yang sudah berlangsung dalam [from, to], beserta status selesai. Hari tidak terjadwal tidak muncul. */
export function dailyResults(input: StreakInput & { from: DateString; to: DateString }): { date: DateString; done: boolean }[] {
  const { habit, timeZone, from, to } = input
  const start = from > habit.startDate ? from : habit.startDate
  const last = lastEvaluatedDate(input)
  const end = to < last ? to : last
  if (start > end) return []
  const done = validCompletions(input)
  return eachDay(start, end).filter((d) => isScheduledOn(habit, d, timeZone)).map((date) => ({ date, done: done.has(date) }))
}

/** Total selesai/kewajiban per tanggal untuk banyak kebiasaan sekaligus (satu pass per kebiasaan). */
export function dailyTotals(args: {
  habits: Habit[]
  completedByHabit: Map<string, DateString[]>
  today: DateString
  timeZone: string
  from: DateString
  to: DateString
}): Map<DateString, { done: number; due: number }> {
  const out = new Map<DateString, { done: number; due: number }>()
  for (const habit of args.habits) {
    const input = { habit, completedDates: args.completedByHabit.get(habit.id) ?? [], today: args.today, timeZone: args.timeZone }
    for (const r of dailyResults({ ...input, from: args.from, to: args.to })) {
      const entry = out.get(r.date) ?? { done: 0, due: 0 }
      entry.due++
      if (r.done) entry.done++
      out.set(r.date, entry)
    }
  }
  return out
}

/** Tanggal pertama saat rentetan mencapai n hari (untuk riwayat pencapaian); null bila tak pernah tercapai. */
export function streakReachedOn(input: StreakInput, n: number): DateString | null {
  if (n < 1) return null
  const { habit, timeZone } = input
  const done = validCompletions(input)
  const end = lastEvaluatedDate(input)
  let run = 0
  for (let d = habit.startDate; d <= end; d = addDays(d, 1)) {
    if (!isScheduledOn(habit, d, timeZone)) continue
    run = done.has(d) ? run + 1 : 0
    if (run === n) return d
  }
  return null
}

/** Penyelesaian boleh diubah mulai hari ini sampai sekian hari ke belakang; tidak untuk masa depan. */
export const BACKFILL_DAYS = 30

export type EditCheck = { allowed: true } | { allowed: false; reason: 'future' | 'too_old' }

export function canEditDate(date: DateString, today: DateString): EditCheck {
  if (date > today) return { allowed: false, reason: 'future' }
  if (date < addDays(today, -BACKFILL_DAYS)) return { allowed: false, reason: 'too_old' }
  return { allowed: true }
}
