import { cn } from '@/lib/utils'

/**
 * Lapisan permukaan: kanvas (bg) → kartu (surface) → sumur (surface-2).
 * - default: panel konten, radius besar, bayangan halus.
 * - hero: satu kartu penting per halaman (progres hari ini): permukaan bernuansa sage + bayangan lebih dalam.
 * - row: baris daftar (kebiasaan), radius lebih kecil dan lebih rendah agar kartu induk tetap lebih dominan.
 */
const tones = {
  default: 'rounded-2xl border border-border bg-surface p-5 shadow-card',
  hero: 'rounded-2xl border border-accent/25 bg-accent-soft p-5 shadow-float',
  row: 'rounded-xl border border-border bg-surface p-4 shadow-card',
} as const

export type CardTone = keyof typeof tones

export function Card({ className, tone = 'default', ...props }: React.HTMLAttributes<HTMLDivElement> & { tone?: CardTone }) {
  return <div className={cn(tones[tone], className)} {...props} />
}
