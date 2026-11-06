import { addDays } from '@/lib/dates'
import {
  completionRate, currentStreak, isScheduledOn, longestStreak, totalCompletions,
} from '@/lib/streaks'
import type { Habit } from '@/types/habit'

const TZ = 'Asia/Jakarta'

function makeHabit(over: Partial<Habit> = {}): Habit {
  return {
    id: 'h1', userId: 'u1', name: 'Minum air', description: null, category: 'health',
    icon: 'Droplets', color: '#3b82f6', frequency: 'daily', scheduledDays: [],
    startDate: '2025-01-01', archivedAt: null,
    createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z',
    ...over,
  }
}
const run = (start: string, n: number) => Array.from({ length: n }, (_, i) => addDays(start, i))
const input = (habit: Habit, completedDates: string[], today: string) => ({ habit, completedDates, today, timeZone: TZ })

describe('isScheduledOn', () => {
  it('harian: setiap hari sejak tanggal mulai', () => {
    const h = makeHabit({ startDate: '2026-10-10' })
    expect(isScheduledOn(h, '2026-10-09', TZ)).toBe(false)
    expect(isScheduledOn(h, '2026-10-10', TZ)).toBe(true)
  })
  it('hari tertentu: hanya hari terpilih', () => {
    const h = makeHabit({ frequency: 'weekly_days', scheduledDays: [1, 3, 5] })
    expect(isScheduledOn(h, '2026-10-26', TZ)).toBe(true) // Senin
    expect(isScheduledOn(h, '2026-10-27', TZ)).toBe(false) // Selasa
  })
  it('diarsipkan: hari pengarsipan (zona waktu pengguna) dan sesudahnya tidak dijadwalkan', () => {
    const h = makeHabit({ archivedAt: '2026-10-31T18:00:00Z' })
    expect(isScheduledOn(h, '2026-10-31', 'Asia/Jakarta')).toBe(true) // di Jakarta diarsipkan 1 Nov 01:00
    expect(isScheduledOn(h, '2026-11-01', 'Asia/Jakarta')).toBe(false)
    expect(isScheduledOn(h, '2026-10-31', 'America/Los_Angeles')).toBe(false) // di LA diarsipkan 31 Okt
    expect(isScheduledOn(h, '2026-10-30', 'America/Los_Angeles')).toBe(true)
  })
})

describe('currentStreak', () => {
  it('data kosong = 0', () => expect(currentStreak(input(makeHabit(), [], '2026-10-31'))).toBe(0))

  it('harian: 3 hari berturut-turut termasuk hari ini', () =>
    expect(currentStreak(input(makeHabit(), run('2026-10-29', 3), '2026-10-31'))).toBe(3))

  it('hari ini belum selesai tidak memutus rentetan', () =>
    expect(currentStreak(input(makeHabit(), run('2026-10-29', 2), '2026-10-31'))).toBe(2))

  it('kemarin terlewat dan hari ini selesai = 1', () =>
    expect(currentStreak(input(makeHabit(), ['2026-10-29', '2026-10-31'], '2026-10-31'))).toBe(1))

  it('kemarin terlewat dan hari ini belum selesai = 0', () =>
    expect(currentStreak(input(makeHabit(), ['2026-10-29'], '2026-10-31'))).toBe(0))

  it('melewati pergantian bulan', () =>
    expect(currentStreak(input(makeHabit(), run('2026-10-30', 4), '2026-11-02'))).toBe(4))

  it('melewati pergantian tahun', () =>
    expect(currentStreak(input(makeHabit(), run('2025-12-30', 3), '2026-01-01'))).toBe(3))

  it('melewati 29 Februari tahun kabisat', () =>
    expect(currentStreak(input(makeHabit({ startDate: '2024-01-01' }), run('2024-02-28', 3), '2024-03-01'))).toBe(3))

  it('3x seminggu: hari tidak dijadwalkan tidak memutus rentetan', () => {
    const h = makeHabit({ frequency: 'weekly_days', scheduledDays: [1, 3, 5] })
    // Sen 26, Rab 28, Jum 30 selesai; hari ini Sabtu 31 (tidak dijadwalkan)
    expect(currentStreak(input(h, ['2026-10-26', '2026-10-28', '2026-10-30'], '2026-10-31'))).toBe(3)
  })

  it('3x seminggu: melewatkan hari terjadwal memutus rentetan', () => {
    const h = makeHabit({ frequency: 'weekly_days', scheduledDays: [1, 3, 5] })
    expect(currentStreak(input(h, ['2026-10-26', '2026-10-30'], '2026-10-31'))).toBe(1) // Rabu 28 terlewat
  })

  it('3x seminggu: lintas pergantian minggu', () => {
    const h = makeHabit({ frequency: 'weekly_days', scheduledDays: [1, 3, 5] })
    const done = ['2026-10-23', '2026-10-26', '2026-10-28'] // Jum, Sen, Rab
    expect(currentStreak(input(h, done, '2026-10-29'))).toBe(3)
  })

  it('tanggal masa depan diabaikan', () =>
    expect(currentStreak(input(makeHabit(), ['2026-11-05', '2026-11-06'], '2026-10-31'))).toBe(0))

  it('selesai sebelum tanggal mulai diabaikan', () =>
    expect(currentStreak(input(makeHabit({ startDate: '2026-10-30' }), ['2026-10-28', '2026-10-29'], '2026-10-31'))).toBe(0))

  it('belum dimulai = 0', () =>
    expect(currentStreak(input(makeHabit({ startDate: '2026-11-10' }), ['2026-11-10'], '2026-10-31'))).toBe(0))

  it('data ganda untuk tanggal sama dihitung sekali', () =>
    expect(currentStreak(input(makeHabit(), ['2026-10-31', '2026-10-31', '2026-10-30'], '2026-10-31'))).toBe(2))

  it('kebiasaan diarsipkan = 0', () =>
    expect(currentStreak(input(makeHabit({ archivedAt: '2026-10-31T01:00:00Z' }), run('2026-10-28', 3), '2026-10-31'))).toBe(0))

  it('perubahan jadwal: jadwal saat ini berlaku untuk seluruh riwayat', () => {
    // Dulu harian, kini Sen/Rab/Jum. Penyelesaian di hari lain (Sel/Kam) tidak dihitung dan tidak memutus.
    const h = makeHabit({ frequency: 'weekly_days', scheduledDays: [1, 3, 5] })
    expect(currentStreak(input(h, run('2026-10-26', 5), '2026-10-30'))).toBe(3)
  })
})

describe('longestStreak', () => {
  it('data kosong = 0', () => expect(longestStreak(input(makeHabit(), [], '2026-10-31'))).toBe(0))

  it('mengambil rangkaian terpanjang dari seluruh riwayat', () => {
    const done = [...run('2026-09-01', 3), ...run('2026-09-10', 5), ...run('2026-10-01', 2)]
    expect(longestStreak(input(makeHabit(), done, '2026-10-31'))).toBe(5)
  })

  it('rekor tetap tersimpan walau rentetan saat ini sudah putus', () => {
    const h = makeHabit()
    const done = run('2026-10-01', 7)
    expect(currentStreak(input(h, done, '2026-10-31'))).toBe(0)
    expect(longestStreak(input(h, done, '2026-10-31'))).toBe(7)
  })

  it('hari tidak dijadwalkan tidak memutus rekor', () => {
    const h = makeHabit({ frequency: 'weekly_days', scheduledDays: [1, 3, 5] })
    const done = ['2026-10-05', '2026-10-07', '2026-10-09', '2026-10-12', '2026-10-14'] // Sen,Rab,Jum,Sen,Rab
    expect(longestStreak(input(h, done, '2026-10-31'))).toBe(5)
  })

  it('kebiasaan diarsipkan: rekor dihitung sampai sebelum hari pengarsipan', () => {
    const h = makeHabit({ archivedAt: '2026-10-10T05:00:00Z' })
    expect(longestStreak(input(h, run('2026-10-01', 15), '2026-10-31'))).toBe(9) // 1–9 Okt
  })

  it('tanggal masa depan diabaikan', () =>
    expect(longestStreak(input(makeHabit(), run('2026-10-30', 5), '2026-10-31'))).toBe(2))
})

describe('totalCompletions', () => {
  it('hanya menghitung penyelesaian valid, tanpa duplikat', () => {
    const h = makeHabit({ startDate: '2026-10-10' })
    const done = ['2026-10-09', '2026-10-10', '2026-10-10', '2026-10-11', '2026-11-05']
    expect(totalCompletions(input(h, done, '2026-10-31'))).toBe(2)
  })
  it('perubahan jadwal: penyelesaian di hari tidak terjadwal tidak dihitung', () => {
    const h = makeHabit({ frequency: 'weekly_days', scheduledDays: [1] })
    expect(totalCompletions(input(h, run('2026-10-26', 7), '2026-10-31'))).toBe(1)
  })
})

describe('completionRate', () => {
  const rate = (h: Habit, done: string[], from: string, to: string, today: string) =>
    completionRate({ ...input(h, done, today), from, to })

  it('tanpa kewajiban = rate null', () =>
    expect(rate(makeHabit({ startDate: '2026-12-01' }), [], '2026-10-26', '2026-11-01', '2026-10-31')).toEqual({ done: 0, due: 0, rate: null }))

  it('harian satu minggu penuh', () =>
    expect(rate(makeHabit(), run('2026-10-26', 4), '2026-10-26', '2026-11-01', '2026-11-01')).toEqual({ done: 4, due: 7, rate: 4 / 7 }))

  it('hari masa depan tidak dihitung sebagai kewajiban', () =>
    expect(rate(makeHabit(), run('2026-10-26', 4), '2026-10-26', '2026-11-01', '2026-10-31')).toEqual({ done: 4, due: 6, rate: 4 / 6 }))

  it('sebelum tanggal mulai tidak dihitung', () =>
    expect(rate(makeHabit({ startDate: '2026-10-29' }), ['2026-10-29'], '2026-10-26', '2026-11-01', '2026-11-01')).toEqual({ done: 1, due: 4, rate: 1 / 4 }))

  it('hanya hari terjadwal', () => {
    const h = makeHabit({ frequency: 'weekly_days', scheduledDays: [1, 3, 5] })
    expect(rate(h, ['2026-10-26', '2026-10-28'], '2026-10-26', '2026-11-01', '2026-11-01')).toEqual({ done: 2, due: 3, rate: 2 / 3 })
  })

  it('diarsipkan: riwayat sebelum pengarsipan tetap dihitung', () => {
    const h = makeHabit({ archivedAt: '2026-10-29T03:00:00Z' })
    expect(rate(h, run('2026-10-26', 3), '2026-10-26', '2026-11-01', '2026-11-01')).toEqual({ done: 3, due: 3, rate: 1 })
  })
})
