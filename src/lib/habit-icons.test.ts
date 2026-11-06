import { describe, expect, it } from 'vitest'
import { HABIT_COLORS, displayColor, inkColor, tintColor } from '@/lib/habit-icons'

describe('warna kebiasaan', () => {
  it('palet tidak memuat nilai lama (violet) dan setiap nilai valid untuk constraint database', () => {
    for (const c of HABIT_COLORS) expect(c.value).toMatch(/^#[0-9a-f]{6}$/i)
    expect(HABIT_COLORS.map((c) => c.value.toLowerCase())).not.toContain('#7c5cfc')
    expect(HABIT_COLORS.map((c) => c.label)).not.toContain('Violet')
    expect(new Set(HABIT_COLORS.map((c) => c.value)).size).toBe(HABIT_COLORS.length)
  })

  it('nilai lama di database hanya dipetakan saat tampil; nilai lain tidak berubah', () => {
    expect(displayColor('#7c5cfc')).toBe('#3b82f6')
    expect(displayColor('#7C5CFC')).toBe('#3b82f6')
    for (const c of HABIT_COLORS) expect(displayColor(c.value)).toBe(c.value)
  })

  it('tinta dan tint dicampur dengan token tema (bukan hex mentah) supaya mengikuti Terang/Gelap', () => {
    expect(inkColor('#f59e0b')).toBe('color-mix(in srgb, #f59e0b 68%, var(--fg))')
    expect(tintColor('#f59e0b')).toBe('color-mix(in srgb, #f59e0b 16%, var(--surface))')
    expect(inkColor('#7c5cfc')).toContain('#3b82f6') // nilai lama dipetakan
  })
})
