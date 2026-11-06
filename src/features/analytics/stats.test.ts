import { achievements, buildAnalyticsSummary, dailySeries, habitPerformance, heatmap } from '@/features/analytics/stats'
import { addDays } from '@/lib/dates'
import { makeCompletion, makeHabit, TZ } from '@/test/builders'
import type { Habit } from '@/types/habit'

const today = '2026-10-31' // Sabtu
const run = (start: string, n: number) => Array.from({ length: n }, (_, i) => addDays(start, i))
const comps = (h: Habit, dates: string[]) => dates.map((d) => makeCompletion(h.id, d))
const args = (habits: Habit[], completions = [] as ReturnType<typeof comps>) => ({ habits, completions, today, timeZone: TZ })
const MWF = { frequency: 'weekly_days' as const, scheduledDays: [1, 3, 5] }

describe('buildAnalyticsSummary', () => {
  it('tanpa data: tidak ada persentase', () => {
    const s = buildAnalyticsSummary(args([]))
    expect(s.hasHabits).toBe(false)
    expect([s.week.rate, s.month.rate, s.overall.rate]).toEqual([null, null, null])
  })

  it('pekan berjalan (Senin..hari ini), bulan berjalan, dan seluruh waktu', () => {
    const h = makeHabit()
    const s = buildAnalyticsSummary(args([h], comps(h, run('2026-10-26', 6))))
    expect(s.week).toEqual({ done: 6, due: 6, rate: 1 })
    expect(s.month).toEqual({ done: 6, due: 31, rate: 6 / 31 })
    expect(s.overall).toEqual({ done: 6, due: 31, rate: 6 / 31 })
    expect(s.totalCompletions).toBe(6)
    expect(s.bestCurrentStreak).toBe(6)
  })

  it('bulan ini TIDAK ikut menghitung bulan sebelumnya (berbeda dari keseluruhan)', () => {
    const h = makeHabit({ startDate: '2026-09-01' })
    const s = buildAnalyticsSummary(args([h], comps(h, [...run('2026-09-01', 10), ...run('2026-10-26', 6)])))
    expect(s.month).toEqual({ done: 6, due: 31, rate: 6 / 31 })
    expect(s.overall).toEqual({ done: 16, due: 61, rate: 16 / 61 })
  })

  it('pekan yang melintasi pergantian bulan dihitung utuh, sedangkan bulan hanya sejak tanggal 1', () => {
    const h = makeHabit({ startDate: '2026-09-01' })
    const t = '2026-11-02' // Senin; pekan = 2 Nov saja
    const s = buildAnalyticsSummary({ habits: [h], completions: comps(h, ['2026-10-31', '2026-11-02']), today: t, timeZone: TZ })
    expect(s.week).toEqual({ done: 1, due: 1, rate: 1 })
    expect(s.month).toEqual({ done: 1, due: 2, rate: 0.5 }) // 1 & 2 Nov
  })

  it('hari terjadwal saja: 3x seminggu', () => {
    const h = makeHabit(MWF)
    const s = buildAnalyticsSummary(args([h], comps(h, ['2026-10-26', '2026-10-28'])))
    expect(s.week).toEqual({ done: 2, due: 3, rate: 2 / 3 }) // Sen, Rab, Jum
    expect(s.month.due).toBe(13) // 5 Jum + 4 Sen + 4 Rab pada Okt 2026
  })

  it('diarsipkan: hanya periode sebelum pengarsipan; rentetan saat ini tidak dihitung; rekor tetap', () => {
    const h = makeHabit({ archivedAt: '2026-10-16T03:00:00Z' })
    const s = buildAnalyticsSummary(args([h], comps(h, run('2026-10-01', 15))))
    expect(s.month).toEqual({ done: 15, due: 15, rate: 1 })
    expect([s.bestCurrentStreak, s.longestStreak, s.totalCompletions]).toEqual([0, 15, 15])
  })

  it('belum dimulai tidak dihitung sebagai kewajiban', () => {
    const s = buildAnalyticsSummary(args([makeHabit({ startDate: '2026-11-10' })]))
    expect(s.overall).toEqual({ done: 0, due: 0, rate: null })
  })

  it('penyelesaian masa depan, sebelum mulai, dan di hari tidak terjadwal tidak menggembungkan angka', () => {
    const h = makeHabit({ ...MWF, startDate: '2026-10-15' })
    const s = buildAnalyticsSummary(args([h], comps(h, ['2026-10-10', '2026-10-27', '2026-11-02', '2026-10-28'])))
    expect(s.totalCompletions).toBe(1) // hanya Rabu 28 Okt yang valid
  })
})

describe('dailySeries', () => {
  it('N hari berurutan berakhir hari ini; hari tanpa kewajiban punya rate null', () => {
    const h = makeHabit({ startDate: '2026-10-29' })
    const s = dailySeries(args([h], comps(h, ['2026-10-29', '2026-10-31'])), 7)
    expect(s).toHaveLength(7)
    expect([s[0]!.date, s[6]!.date]).toEqual(['2026-10-25', '2026-10-31'])
    expect(s.map((d) => d.rate)).toEqual([null, null, null, null, 1, 0, 1])
  })
  it('menggabungkan beberapa kebiasaan', () => {
    const a = makeHabit({ id: 'a' }); const b = makeHabit({ id: 'b' })
    const d = dailySeries(args([a, b], comps(a, ['2026-10-31'])), 1)[0]!
    expect(d).toMatchObject({ done: 1, due: 2, rate: 0.5 })
  })
})

describe('habitPerformance', () => {
  it('urut dari persentase tertinggi, menyertakan rentetan, dan membuang yang tanpa kewajiban', () => {
    const a = makeHabit({ id: 'a', name: 'A' }); const b = makeHabit({ id: 'b', name: 'B' }); const c = makeHabit({ id: 'c', name: 'C', startDate: '2026-12-01' })
    const p = habitPerformance(args([a, b, c], [...comps(a, ['2026-10-31']), ...comps(b, run('2026-10-25', 7))]), 7)
    expect(p.map((x) => x.habit.id)).toEqual(['b', 'a'])
    expect(p[0]).toMatchObject({ rate: { done: 7, due: 7, rate: 1 }, currentStreak: 7, longestStreak: 7, total: 7 })
    expect(p[1]!.rate).toEqual({ done: 1, due: 7, rate: 1 / 7 })
  })
  it('diarsipkan sebelum rentang tidak muncul', () => {
    const old = makeHabit({ archivedAt: '2026-10-10T03:00:00Z' })
    expect(habitPerformance(args([old], comps(old, run('2026-10-01', 9))), 7)).toEqual([])
  })
})

describe('heatmap', () => {
  it('bentuk minggu × 7, mulai Senin, tanggal masa depan ditandai', () => {
    const h = makeHabit()
    const weeks = heatmap(args([h], comps(h, ['2026-10-26', '2026-10-27', '2026-10-31'])), 2)
    expect(weeks).toHaveLength(2)
    expect(weeks.every((w) => w.length === 7)).toBe(true)
    expect(weeks[0]![0]!.date).toBe('2026-10-19') // Senin pekan lalu
    expect(weeks[1]![0]!.date).toBe('2026-10-26')
    expect(weeks[1]![6]).toMatchObject({ date: '2026-11-01', future: true, level: null })
  })
  it('level: null tanpa kewajiban, 0 terlewat, 1–4 menurut persentase', () => {
    const a = makeHabit({ id: 'a', startDate: '2026-10-27' }); const b = makeHabit({ id: 'b', startDate: '2026-10-27' })
    const weeks = heatmap(args([a, b], [...comps(a, ['2026-10-28', '2026-10-29', '2026-10-30']), ...comps(b, ['2026-10-29', '2026-10-30'])]), 1)
    const lv = Object.fromEntries(weeks[0]!.map((c) => [c.date, c.level]))
    expect(lv['2026-10-26']).toBeNull() // sebelum mulai
    expect(lv['2026-10-27']).toBe(0) // 0 dari 2
    expect(lv['2026-10-28']).toBe(2) // 1 dari 2 = 50%
    expect(lv['2026-10-29']).toBe(4) // 2 dari 2
    expect(lv['2026-10-31']).toBe(0) // hari ini, belum ada yang selesai
  })
})

describe('achievements', () => {
  it('kosong tanpa data', () => expect(achievements(args([]))).toEqual([]))

  it('rentetan, total penyelesaian, dan hari sempurna lengkap dengan tanggal tercapai', () => {
    const h = makeHabit({ name: 'Baca' })
    const a = achievements(args([h], comps(h, run('2026-10-01', 12))))
    const by = Object.fromEntries(a.map((x) => [x.id, x]))
    expect(by['streak-3']!.achievedOn).toBe('2026-10-03')
    expect(by['streak-7']!.achievedOn).toBe('2026-10-07')
    expect(by['streak-14']).toBeUndefined()
    expect(by['total-1']!.achievedOn).toBe('2026-10-01')
    expect(by['total-10']!.achievedOn).toBe('2026-10-10')
    expect(by['total-50']).toBeUndefined()
    expect(by['perfect-first']!.achievedOn).toBe('2026-10-01')
    expect(by['streak-7']!.description).toContain('Baca')
  })

  it('urut dari yang terbaru', () => {
    const h = makeHabit()
    const dates = achievements(args([h], comps(h, run('2026-10-01', 12)))).map((x) => x.achievedOn)
    expect(dates).toEqual([...dates].sort().reverse())
  })

  it('hari sempurna butuh SEMUA kebiasaan terjadwal selesai pada hari itu', () => {
    const a = makeHabit({ id: 'a' }); const b = makeHabit({ id: 'b' })
    const x = achievements(args([a, b], [...comps(a, ['2026-10-05', '2026-10-06']), ...comps(b, ['2026-10-06'])]))
    expect(x.find((i) => i.id === 'perfect-first')!.achievedOn).toBe('2026-10-06')
  })

  it('total penyelesaian menggabungkan semua kebiasaan, mengabaikan yang tidak valid', () => {
    const a = makeHabit({ id: 'a', startDate: '2026-10-05' }); const b = makeHabit({ id: 'b' })
    const x = achievements(args([a, b], [...comps(a, ['2026-10-01', ...run('2026-10-05', 5)]), ...comps(b, run('2026-10-01', 5))]))
    // a: 1 Okt tidak valid (sebelum mulai) -> 5 valid; b: 5 valid; total 10, ke-10 jatuh pada 9 Okt
    expect(x.find((i) => i.id === 'total-10')!.achievedOn).toBe('2026-10-09')
  })
})
