import {
  addDays, dayOfWeek, diffDays, eachDay, formatDateLong, isValidDateString, startOfWeek, todayInTimeZone,
} from '@/lib/dates'

describe('addDays', () => {
  it('melewati pergantian bulan', () => expect(addDays('2026-10-31', 1)).toBe('2026-11-01'))
  it('melewati pergantian tahun', () => expect(addDays('2025-12-31', 1)).toBe('2026-01-01'))
  it('mundur melewati pergantian tahun', () => expect(addDays('2026-01-01', -1)).toBe('2025-12-31'))
  it('menangani tahun kabisat', () => {
    expect(addDays('2024-02-28', 2)).toBe('2024-03-01')
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01')
  })
})

describe('diffDays', () => {
  it('menghitung selisih hari', () => expect(diffDays('2026-11-02', '2026-10-30')).toBe(3))
  it('negatif jika mundur', () => expect(diffDays('2026-10-30', '2026-11-02')).toBe(-3))
  it('tidak terpengaruh pergantian DST', () => expect(diffDays('2026-03-30', '2026-03-28')).toBe(2))
})

describe('dayOfWeek', () => {
  it('0 = Minggu, 6 = Sabtu', () => {
    expect(dayOfWeek('2026-11-01')).toBe(0)
    expect(dayOfWeek('2026-10-31')).toBe(6)
    expect(dayOfWeek('2026-10-26')).toBe(1)
  })
})

describe('startOfWeek (Senin)', () => {
  it('Sabtu -> Senin sebelumnya', () => expect(startOfWeek('2026-10-31')).toBe('2026-10-26'))
  it('Senin -> dirinya sendiri', () => expect(startOfWeek('2026-10-26')).toBe('2026-10-26'))
  it('Minggu -> Senin sebelumnya', () => expect(startOfWeek('2026-11-01')).toBe('2026-10-26'))
})

describe('eachDay', () => {
  it('inklusif', () => expect(eachDay('2026-10-30', '2026-11-01')).toEqual(['2026-10-30', '2026-10-31', '2026-11-01']))
  it('kosong jika dari > sampai', () => expect(eachDay('2026-11-02', '2026-11-01')).toEqual([]))
})

describe('isValidDateString', () => {
  it('menerima tanggal valid', () => expect(isValidDateString('2024-02-29')).toBe(true))
  it('menolak tanggal tidak ada', () => {
    expect(isValidDateString('2026-02-30')).toBe(false)
    expect(isValidDateString('2026-13-01')).toBe(false)
  })
  it('menolak format salah', () => {
    expect(isValidDateString('2026-1-1')).toBe(false)
    expect(isValidDateString('31/10/2026')).toBe(false)
  })
})

describe('todayInTimeZone', () => {
  const instant = new Date('2026-10-31T17:30:00Z')
  it('Asia/Jakarta (UTC+7) sudah masuk hari berikutnya', () =>
    expect(todayInTimeZone(instant, 'Asia/Jakarta')).toBe('2026-11-01'))
  it('Asia/Jayapura (UTC+9)', () => expect(todayInTimeZone(instant, 'Asia/Jayapura')).toBe('2026-11-01'))
  it('America/Los_Angeles masih hari yang sama', () =>
    expect(todayInTimeZone(instant, 'America/Los_Angeles')).toBe('2026-10-31'))
})

describe('formatDateLong', () => {
  it('format Indonesia tanpa pergeseran tanggal', () =>
    expect(formatDateLong('2026-10-31')).toBe('Sabtu, 31 Oktober 2026'))
})
