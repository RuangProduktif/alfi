import { addMonths, daysInMonth, formatMonthLong, formatTime, monthDates, monthLeadingBlanks, monthOf } from '@/lib/dates'

describe('bulan', () => {
  it('monthOf', () => expect(monthOf('2026-10-31')).toBe('2026-10'))
  it('addMonths melewati pergantian tahun', () => {
    expect(addMonths('2026-12', 1)).toBe('2027-01')
    expect(addMonths('2026-01', -1)).toBe('2025-12')
    expect(addMonths('2026-10', 14)).toBe('2027-12')
    expect(addMonths('2026-03', -15)).toBe('2024-12')
  })
  it('daysInMonth termasuk tahun kabisat', () => {
    expect(daysInMonth('2026-02')).toBe(28)
    expect(daysInMonth('2028-02')).toBe(29)
    expect(daysInMonth('2026-10')).toBe(31)
    expect(daysInMonth('2026-11')).toBe(30)
  })
  it('monthDates', () => {
    const d = monthDates('2026-11')
    expect(d).toHaveLength(30)
    expect([d[0], d[29]]).toEqual(['2026-11-01', '2026-11-30'])
  })
  it('monthLeadingBlanks: kolom pertama = Senin', () => {
    expect(monthLeadingBlanks('2026-06')).toBe(0) // 1 Jun 2026 = Senin
    expect(monthLeadingBlanks('2026-10')).toBe(3) // 1 Okt 2026 = Kamis
    expect(monthLeadingBlanks('2026-11')).toBe(6) // 1 Nov 2026 = Minggu
  })
  it('formatMonthLong dalam Bahasa Indonesia', () => {
    expect(formatMonthLong('2026-10')).toBe('Oktober 2026')
    expect(formatMonthLong('2027-01')).toBe('Januari 2027')
  })
})

describe('formatTime', () => {
  it('memakai zona waktu pengguna', () => {
    expect(formatTime('2026-10-31T01:15:00Z', 'Asia/Jakarta')).toBe('08.15')
    expect(formatTime('2026-10-31T01:15:00Z', 'America/Los_Angeles')).toBe('18.15')
  })
})
