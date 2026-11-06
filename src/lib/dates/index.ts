import type { DateString } from '@/types/habit'

/**
 * Semua tanggal kalender direpresentasikan sebagai string 'YYYY-MM-DD' dan dihitung
 * dengan aritmetika UTC, sehingga tidak bergeser karena zona waktu atau DST.
 * Timestamp hanya dipakai untuk menentukan "hari ini" pada zona waktu pengguna.
 */
export const DEFAULT_TIMEZONE = 'Asia/Jakarta'
const MS_PER_DAY = 86_400_000
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/

export function isValidDateString(value: string): boolean {
  const m = DATE_RE.exec(value)
  if (!m) return false
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const dt = new Date(Date.UTC(y, mo - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d
}

function toMs(date: DateString): number {
  const m = DATE_RE.exec(date)
  if (!m || !isValidDateString(date)) throw new Error(`Tanggal tidak valid: ${date}`)
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

const fromMs = (ms: number): DateString => new Date(ms).toISOString().slice(0, 10)

export const addDays = (date: DateString, n: number): DateString => fromMs(toMs(date) + n * MS_PER_DAY)

/** a - b dalam hari. */
export const diffDays = (a: DateString, b: DateString): number => Math.round((toMs(a) - toMs(b)) / MS_PER_DAY)

/** 0 = Minggu ... 6 = Sabtu. */
export const dayOfWeek = (date: DateString): number => new Date(toMs(date)).getUTCDay()

/** Awal pekan = Senin (konvensi Indonesia). */
export const startOfWeek = (date: DateString): DateString => addDays(date, -((dayOfWeek(date) + 6) % 7))

/** Daftar tanggal inklusif; kosong jika from > to. */
export function eachDay(from: DateString, to: DateString): DateString[] {
  const out: DateString[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d)
  return out
}

function partsInTimeZone(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
  }).formatToParts(instant)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  return { date: `${get('year')}-${get('month')}-${get('day')}`, hour: Number(get('hour')) }
}

/** Tanggal kalender pada zona waktu tertentu untuk sebuah instan waktu. */
export const todayInTimeZone = (instant: Date, timeZone: string): DateString => partsInTimeZone(instant, timeZone).date
export const hourInTimeZone = (instant: Date, timeZone: string): number => partsInTimeZone(instant, timeZone).hour

const longFmt = new Intl.DateTimeFormat('id-ID', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
})
export const formatDateLong = (date: DateString): string => longFmt.format(new Date(toMs(date)))

const shortFmt = new Intl.DateTimeFormat('id-ID', { weekday: 'short', timeZone: 'UTC' })
export const formatWeekdayShort = (date: DateString): string => shortFmt.format(new Date(toMs(date)))

const shortDateFmt = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
export const formatDateShort = (date: DateString): string => shortDateFmt.format(new Date(toMs(date)))

// ---- Bulan (format 'YYYY-MM') ----
const parseMonth = (month: string): [number, number] => {
  const m = /^(\d{4})-(\d{2})$/.exec(month)
  const y = Number(m?.[1]); const mo = Number(m?.[2])
  if (!m || mo < 1 || mo > 12) throw new Error(`Bulan tidak valid: ${month}`)
  return [y, mo]
}
const pad = (n: number, len = 2) => String(n).padStart(len, '0')

export const monthOf = (date: DateString): string => date.slice(0, 7)

export function addMonths(month: string, n: number): string {
  const [y, mo] = parseMonth(month)
  const idx = y * 12 + (mo - 1) + n
  return `${pad(Math.floor(idx / 12), 4)}-${pad((idx % 12) + 1)}`
}

export function daysInMonth(month: string): number {
  const [y, mo] = parseMonth(month)
  return new Date(Date.UTC(y, mo, 0)).getUTCDate()
}

export const monthDates = (month: string): DateString[] =>
  Array.from({ length: daysInMonth(month) }, (_, i) => `${month}-${pad(i + 1)}`)

/** Jumlah sel kosong sebelum tanggal 1 bila kolom pertama = Senin. */
export const monthLeadingBlanks = (month: string): number => (dayOfWeek(`${month}-01`) + 6) % 7

const monthFmt = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric', timeZone: 'UTC' })
export const formatMonthLong = (month: string): string => {
  const [y, mo] = parseMonth(month)
  return monthFmt.format(new Date(Date.UTC(y, mo - 1, 1)))
}

/** Jam:menit pada zona waktu pengguna, mis. "08.15". */
export function formatTime(instant: string | Date, timeZone: string): string {
  return new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone }).format(new Date(instant))
}
