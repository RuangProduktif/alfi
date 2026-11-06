import {
  BACKFILL_DAYS, canEditDate, completionRate, dailyResults, dayStatus, streakReachedOn, wasActiveOn,
} from '@/lib/streaks'
import { addDays } from '@/lib/dates'
import { makeHabit, TZ } from '@/test/builders'

const run = (start: string, n: number) => Array.from({ length: n }, (_, i) => addDays(start, i))
const MWF = { frequency: 'weekly_days' as const, scheduledDays: [1, 3, 5] }

describe('dayStatus', () => {
  const base = { today: '2026-10-31', timeZone: TZ }
  const st = (habit = makeHabit({ startDate: '2026-10-10' }), date: string, done: string[] = ['2026-10-30', '2026-10-31']) =>
    dayStatus({ ...base, habit, completedDates: done, date })

  it('selesai / terlewat / belum dimulai', () => {
    expect(st(undefined, '2026-10-30')).toBe('done')
    expect(st(undefined, '2026-10-29')).toBe('missed')
    expect(st(undefined, '2026-10-09')).toBe('not_started')
  })
  it('hari ini belum selesai = pending (bukan terlewat)', () => expect(st(undefined, '2026-10-31', [])).toBe('pending'))
  it('tanggal masa depan terjadwal = future', () => expect(st(undefined, '2026-11-02')).toBe('future'))
  it('hari tidak terjadwal = not_scheduled, baik lampau maupun masa depan', () => {
    const h = makeHabit({ startDate: '2026-10-01', ...MWF })
    expect(st(h, '2026-10-27', [])).toBe('not_scheduled') // Selasa
    expect(st(h, '2026-11-03', [])).toBe('not_scheduled') // Selasa depan
    expect(st(h, '2026-11-02', [])).toBe('future') // Senin depan
  })
  it('penyelesaian di hari tidak terjadwal diabaikan (tetap not_scheduled)', () =>
    expect(st(makeHabit({ startDate: '2026-10-01', ...MWF }), '2026-10-27', ['2026-10-27'])).toBe('not_scheduled'))
  it('belum dimulai berlaku juga untuk masa depan sebelum tanggal mulai', () =>
    expect(st(makeHabit({ startDate: '2026-11-10' }), '2026-11-05', [])).toBe('not_started'))
  it('diarsipkan: sebelum hari pengarsipan tetap dinilai, sesudahnya not_scheduled', () => {
    const h = makeHabit({ archivedAt: '2026-10-20T03:00:00Z' }) // 20 Okt 10:00 WIB
    expect(st(h, '2026-10-19', [])).toBe('missed')
    expect(st(h, '2026-10-20', [])).toBe('not_scheduled')
    expect(st(h, '2026-11-02', [])).toBe('not_scheduled')
  })
})

describe('wasActiveOn', () => {
  it('false pada hari pengarsipan dan sesudahnya (zona waktu pengguna)', () => {
    const h = makeHabit({ archivedAt: '2026-10-20T03:00:00Z' })
    expect(wasActiveOn(h, '2026-10-19', TZ)).toBe(true)
    expect(wasActiveOn(h, '2026-10-20', TZ)).toBe(false)
    expect(wasActiveOn(makeHabit(), '2030-01-01', TZ)).toBe(true)
  })
})

describe('dailyResults', () => {
  const input = (habit = makeHabit(), done: string[] = [], today = '2026-10-31') => ({ habit, completedDates: done, today, timeZone: TZ })

  it('hanya hari terjadwal dalam rentang yang sudah berlangsung', () => {
    const h = makeHabit({ ...MWF })
    expect(dailyResults({ ...input(h, ['2026-10-26', '2026-10-28']), from: '2026-10-26', to: '2026-11-01' })).toEqual([
      { date: '2026-10-26', done: true }, { date: '2026-10-28', done: true }, { date: '2026-10-30', done: false },
    ])
  })
  it('kosong bila rentang di luar masa aktif', () =>
    expect(dailyResults({ ...input(makeHabit({ startDate: '2026-12-01' })), from: '2026-10-01', to: '2026-10-31' })).toEqual([]))

  it.each([
    ['harian', makeHabit(), run('2026-10-20', 8), '2026-10-01', '2026-10-31'],
    ['3x seminggu', makeHabit({ ...MWF }), ['2026-10-26', '2026-10-28', '2026-10-27'], '2026-10-19', '2026-11-05'],
    ['diarsipkan', makeHabit({ archivedAt: '2026-10-15T03:00:00Z' }), run('2026-10-05', 12), '2026-10-01', '2026-10-31'],
  ])('konsisten dengan completionRate: %s', (_n, habit, done, from, to) => {
    const i = input(habit, done)
    const days = dailyResults({ ...i, from, to })
    const r = completionRate({ ...i, from, to })
    expect({ done: days.filter((d) => d.done).length, due: days.length }).toEqual({ done: r.done, due: r.due })
  })
})

describe('streakReachedOn', () => {
  const at = (habit: ReturnType<typeof makeHabit>, done: string[], n: number) =>
    streakReachedOn({ habit, completedDates: done, today: '2026-10-31', timeZone: TZ }, n)

  it('tanggal pertama rentetan mencapai n', () => expect(at(makeHabit(), run('2026-10-01', 10), 7)).toBe('2026-10-07'))
  it('null bila tidak pernah tercapai', () => expect(at(makeHabit(), run('2026-10-01', 10), 11)).toBeNull())
  it('hari tidak terjadwal tidak memutus', () =>
    expect(at(makeHabit({ ...MWF }), ['2026-10-05', '2026-10-07', '2026-10-09', '2026-10-12', '2026-10-14'], 5)).toBe('2026-10-14'))
  it('rentetan yang putus lalu mulai lagi dihitung dari awal', () =>
    expect(at(makeHabit(), [...run('2026-10-01', 3), ...run('2026-10-05', 6)], 5)).toBe('2026-10-09'))
  it('mengambil kemunculan pertama, bukan terakhir', () =>
    expect(at(makeHabit(), [...run('2026-10-01', 3), ...run('2026-10-10', 3)], 3)).toBe('2026-10-03'))
  it('tanggal masa depan diabaikan', () => expect(at(makeHabit(), run('2026-10-30', 5), 3)).toBeNull())
  it('diarsipkan: hanya yang tercapai sebelum pengarsipan', () => {
    const h = makeHabit({ archivedAt: '2026-10-06T03:00:00Z' }) // aktif sampai 5 Okt
    expect(at(h, run('2026-10-01', 10), 5)).toBe('2026-10-05')
    expect(at(h, run('2026-10-01', 10), 6)).toBeNull()
  })
})

describe('batas mundur penyelesaian', () => {
  it('BACKFILL_DAYS = 30', () => expect(BACKFILL_DAYS).toBe(30))
  it('hari ini dan 30 hari ke belakang boleh; 31 hari ke belakang tidak', () => {
    expect(canEditDate('2026-10-31', '2026-10-31')).toEqual({ allowed: true })
    expect(canEditDate('2026-10-01', '2026-10-31')).toEqual({ allowed: true })
    expect(canEditDate('2026-09-30', '2026-10-31')).toEqual({ allowed: false, reason: 'too_old' })
  })
  it('masa depan ditolak', () => expect(canEditDate('2026-11-01', '2026-10-31')).toEqual({ allowed: false, reason: 'future' }))
  it('benar melewati batas bulan dan tahun', () => {
    expect(canEditDate('2026-01-30', '2026-03-01').allowed).toBe(true)
    expect(canEditDate('2026-01-29', '2026-03-01').allowed).toBe(false)
    expect(canEditDate('2025-12-02', '2026-01-01').allowed).toBe(true)
    expect(canEditDate('2025-12-01', '2026-01-01').allowed).toBe(false)
  })
})
