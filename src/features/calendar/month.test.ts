import { buildMonth, dayDetail } from '@/features/calendar/month'
import { makeCompletion, makeHabit, TZ } from '@/test/builders'
import type { Habit } from '@/types/habit'

const today = '2026-10-31'
const comps = (h: Habit, dates: string[]) => dates.map((d) => makeCompletion(h.id, d))
const month = (habits: Habit[], completions = [] as ReturnType<typeof comps>, m = '2026-10') => buildMonth({ habits, completions, month: m, today, timeZone: TZ })

describe('buildMonth', () => {
  it('Okt 2026: 31 hari, 3 sel kosong di depan (Kamis)', () => {
    const m = month([])
    expect(m.days).toHaveLength(31)
    expect(m.leadingBlanks).toBe(3)
  })
  it('Feb 2028 punya 29 hari (kabisat)', () => expect(month([], [], '2028-02').days).toHaveLength(29))

  it('penanda: full / partial / missed / none / future', () => {
    const a = makeHabit({ id: 'a' }); const b = makeHabit({ id: 'b' })
    const m = month([a, b], [...comps(a, ['2026-10-20', '2026-10-21', '2026-10-31']), ...comps(b, ['2026-10-20'])])
    const mk = Object.fromEntries(m.days.map((d) => [d.date, d.marker]))
    expect(mk['2026-10-20']).toBe('full')
    expect(mk['2026-10-21']).toBe('partial')
    expect(mk['2026-10-22']).toBe('missed')
    expect(mk['2026-10-31']).toBe('partial') // hari ini: 1 dari 2
    expect(mk['2026-10-01']).toBe('missed')
  })
  it('hari ini tanpa penyelesaian = none (belum bisa disebut terlewat); masa depan = future', () => {
    const m = month([makeHabit()])
    expect(m.days.find((d) => d.date === today)!.marker).toBe('none')
    expect(month([makeHabit()], [], '2026-11').days[0]!.marker).toBe('future')
  })
  it('tanpa kewajiban = none; jumlah done/due tersedia', () => {
    const h = makeHabit({ frequency: 'weekly_days', scheduledDays: [1] })
    const d = month([h], comps(h, ['2026-10-26'])).days
    expect(d.find((x) => x.date === '2026-10-27')).toMatchObject({ marker: 'none', due: 0 })
    expect(d.find((x) => x.date === '2026-10-26')).toMatchObject({ marker: 'full', done: 1, due: 1 })
  })
  it('tanpa kebiasaan: tidak ada data palsu', () => expect(month([]).days.every((d) => d.due === 0 && d.done === 0)).toBe(true))
})

describe('dayDetail', () => {
  const detail = (habits: Habit[], completions: ReturnType<typeof comps>, date: string) =>
    dayDetail({ habits, completions, date, today, timeZone: TZ })

  it('status per kebiasaan, ringkasan, dan jam penyelesaian', () => {
    const a = makeHabit({ id: 'a', name: 'A' }); const b = makeHabit({ id: 'b', name: 'B' })
    const d = detail([a, b], [makeCompletion('a', '2026-10-20', '2026-10-20T01:15:00Z')], '2026-10-20')
    expect(d.summary).toEqual({ done: 1, due: 2 })
    expect(d.items.map((i) => [i.habit.id, i.status])).toEqual([['a', 'done'], ['b', 'missed']])
    expect(d.items[0]!.completedAt).toBe('2026-10-20T01:15:00Z')
    expect(d.items[1]!.completedAt).toBeNull()
  })
  it('kebiasaan diarsipkan sebelum tanggal itu tidak ikut daftar; yang aktif pada tanggal itu ikut', () => {
    const old = makeHabit({ id: 'old', archivedAt: '2026-10-10T03:00:00Z' })
    expect(detail([old], [], '2026-10-12').items).toEqual([])
    expect(detail([old], [], '2026-10-05').items.map((i) => i.status)).toEqual(['missed'])
  })
  it('kebiasaan yang belum ada pada tanggal lampau disembunyikan, tetapi tampil untuk tanggal masa depan', () => {
    const later = makeHabit({ startDate: '2026-11-10' })
    expect(detail([later], [], '2026-10-05').items).toEqual([])
    expect(detail([later], [], '2026-11-05').items.map((i) => i.status)).toEqual(['not_started'])
  })
  it('hari tidak terjadwal ditampilkan sebagai not_scheduled dan tidak dihitung dalam ringkasan', () => {
    const h = makeHabit({ frequency: 'weekly_days', scheduledDays: [1] })
    const d = detail([h], [], '2026-10-27') // Selasa
    expect(d.items.map((i) => i.status)).toEqual(['not_scheduled'])
    expect(d.summary).toEqual({ done: 0, due: 0 })
  })
  it('tanggal masa depan: future dan tidak dihitung dalam ringkasan', () => {
    const d = detail([makeHabit()], [], '2026-11-02')
    expect(d.items.map((i) => i.status)).toEqual(['future'])
    expect(d.summary).toEqual({ done: 0, due: 0 })
  })
})
