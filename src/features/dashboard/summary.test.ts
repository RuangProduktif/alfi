import { buildDashboardSummary, greetingFor } from '@/features/dashboard/summary'
import type { Completion, Habit } from '@/types/habit'

const TZ = 'Asia/Jakarta'
const today = '2026-10-31' // Sabtu

const habit = (id: string, over: Partial<Habit> = {}): Habit => ({
  id, userId: 'u', name: id, description: null, category: 'health', icon: 'Droplets', color: '#3b82f6',
  frequency: 'daily', scheduledDays: [], startDate: '2026-10-01', archivedAt: null,
  createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z', ...over,
})
const comp = (habitId: string, completedDate: string, completedAt = `${completedDate}T01:00:00Z`): Completion => ({
  id: `${habitId}-${completedDate}`, habitId, userId: 'u', completedDate, completedAt, createdAt: completedAt,
})
const summarize = (habits: Habit[], completions: Completion[]) => buildDashboardSummary({ habits, completions, today, timeZone: TZ })

describe('buildDashboardSummary', () => {
  it('tanpa data: semua nol dan tidak ada kewajiban', () => {
    const s = summarize([], [])
    expect(s.progress).toEqual({ done: 0, due: 0, rate: null })
    expect(s.todayItems).toEqual([])
    expect(s.week.every((d) => d.rate === null)).toBe(true)
    expect(s.bestCurrentStreak).toBe(0)
  })

  it('progres hari ini: 1 dari 2 kebiasaan terjadwal', () => {
    const s = summarize([habit('a'), habit('b')], [comp('a', today)])
    expect(s.progress).toEqual({ done: 1, due: 2, rate: 0.5 })
  })

  it('kebiasaan yang tidak terjadwal hari ini (Sabtu) dan yang diarsipkan tidak masuk daftar', () => {
    const s = summarize(
      [habit('a'), habit('weekday', { frequency: 'weekly_days', scheduledDays: [1, 2] }), habit('old', { archivedAt: '2026-10-20T00:00:00Z' })],
      [],
    )
    expect(s.todayItems.map((i) => i.habit.id)).toEqual(['a'])
    expect(s.activeHabitCount).toBe(2)
  })

  it('pekan berjalan Senin–Minggu; hari mendatang tidak punya persentase', () => {
    const s = summarize([habit('a')], [comp('a', '2026-10-26'), comp('a', '2026-10-27'), comp('a', today)])
    expect(s.week.map((d) => d.date)).toEqual(['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01'])
    expect(s.week.map((d) => d.rate)).toEqual([1, 1, 0, 0, 0, 1, null])
  })

  it('rentetan terbaik, rekor, dan total', () => {
    const s = summarize([habit('a')], ['2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13', '2026-10-30', today].map((d) => comp('a', d)))
    expect(s.bestCurrentStreak).toBe(2)
    expect(s.longestStreak).toBe(4)
    expect(s.totalCompletions).toBe(6)
  })

  it('aktivitas terbaru: maksimal 5, terbaru dulu, abaikan kebiasaan yang sudah tidak ada', () => {
    const cs = ['2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25'].map((d) => comp('a', d))
    const s = summarize([habit('a')], [...cs, comp('hilang', '2026-10-30')])
    expect(s.recent.map((r) => r.completedDate)).toEqual(['2026-10-25', '2026-10-24', '2026-10-23', '2026-10-22', '2026-10-21'])
  })
})

describe('greetingFor', () => {
  it.each([[3, 'malam'], [4, 'pagi'], [10, 'pagi'], [11, 'siang'], [14, 'siang'], [15, 'sore'], [17, 'sore'], [18, 'malam'], [23, 'malam']])(
    'jam %i -> %s', (h, w) => expect(greetingFor(h)).toBe(`Selamat ${w}!`))
})
