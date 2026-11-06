import {
  Apple, BookOpen, Brain, Coffee, Droplets, Dumbbell, Footprints, Heart, Moon, PenLine, Target, Wallet,
  type LucideIcon,
} from 'lucide-react'

export const HABIT_ICONS = {
  Droplets, Dumbbell, BookOpen, Brain, Wallet, Moon, Apple, Footprints, PenLine, Target, Heart, Coffee,
} satisfies Record<string, LucideIcon>

export type HabitIconName = keyof typeof HABIT_ICONS
export const HABIT_ICON_NAMES = Object.keys(HABIT_ICONS) as HabitIconName[]
export const iconFor = (name: string): LucideIcon => (HABIT_ICONS as Record<string, LucideIcon>)[name] ?? Target

/**
 * Palet warna kebiasaan. Ini DATA (nilai hex disimpan di kolom habits.color), bukan token antarmuka, jadi nilainya tidak bisa
 * mengikuti tema. Agar tetap terbaca di Terang dan Gelap, tampilan tidak memakai hex mentah: lihat inkColor/tintColor.
 */
export const HABIT_COLORS = [
  { value: '#3b82f6', label: 'Biru' },
  { value: '#10b981', label: 'Hijau' },
  { value: '#f59e0b', label: 'Kuning' },
  { value: '#ef4444', label: 'Merah' },
  { value: '#ec4899', label: 'Merah muda' },
  { value: '#f97316', label: 'Jingga' },
] as const

/** Nilai lama yang sudah tidak ada di palet. Hanya dipetakan saat TAMPIL; data di database tidak diubah. */
const RETIRED_COLORS: Record<string, string> = { '#7c5cfc': '#3b82f6' }
export const displayColor = (hex: string): string => RETIRED_COLORS[hex.toLowerCase()] ?? hex

/** Bagian warna kebiasaan pada "tinta" ikon dan "tint" latar. Harus sama dengan INK/TINT di scripts/check-contrast.mjs. */
export const INK_PERCENT = 68
export const TINT_PERCENT = 16
/** Ikon/swatch: warna kebiasaan dicampur dengan warna teks tema, sehingga selalu cukup kontras di Terang maupun Gelap. */
export const inkColor = (hex: string): string => `color-mix(in srgb, ${displayColor(hex)} ${INK_PERCENT}%, var(--fg))`
/** Latar ubin ikon: warna kebiasaan tipis di atas permukaan kartu. */
export const tintColor = (hex: string): string => `color-mix(in srgb, ${displayColor(hex)} ${TINT_PERCENT}%, var(--surface))`

export const HABIT_ICON_LABELS: Record<HabitIconName, string> = {
  Droplets: 'Air', Dumbbell: 'Angkat beban', BookOpen: 'Buku', Brain: 'Pikiran', Wallet: 'Dompet', Moon: 'Tidur',
  Apple: 'Makanan sehat', Footprints: 'Jalan kaki', PenLine: 'Menulis', Target: 'Target', Heart: 'Hati', Coffee: 'Kopi',
}
