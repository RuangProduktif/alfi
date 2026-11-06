import { DEFAULT_TIMEZONE } from '@/lib/dates'
import { TIMEZONE_OPTIONS } from '@/lib/timezones'

describe('TIMEZONE_OPTIONS', () => {
  it('nilai unik dan Asia/Jakarta (bawaan) ada di urutan pertama', () => {
    const values = TIMEZONE_OPTIONS.map((o) => o.value)
    expect(new Set(values).size).toBe(values.length)
    expect(values[0]).toBe(DEFAULT_TIMEZONE)
  })
  it.each(TIMEZONE_OPTIONS.map((o) => o.value))('%s dikenali Intl', (tz) => {
    expect(() => new Intl.DateTimeFormat('id-ID', { timeZone: tz })).not.toThrow()
  })
})
