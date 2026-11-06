import { BookOpen, Brain, Dumbbell, Heart, ListChecks, Tag, Wallet, type LucideIcon } from 'lucide-react'
import type { Category } from '@/types/habit'

/**
 * Identitas visual tiap kategori: ikon + warna aksen. Warna berasal dari token `--cat-*` di src/index.css
 * (tidak ada hijau/sage dan tidak ada ungu, agar tidak tertukar dengan warna aksi utama).
 * Nama kelas ditulis utuh (bukan dirakit) supaya Tailwind menemukannya saat build.
 */
export const CATEGORY_STYLE: Record<Category, { icon: LucideIcon; text: string; soft: string }> = {
  health: { icon: Heart, text: 'text-cat-health', soft: 'bg-cat-health/14' },
  fitness: { icon: Dumbbell, text: 'text-cat-fitness', soft: 'bg-cat-fitness/14' },
  learning: { icon: BookOpen, text: 'text-cat-learning', soft: 'bg-cat-learning/14' },
  productivity: { icon: ListChecks, text: 'text-cat-productivity', soft: 'bg-cat-productivity/14' },
  finance: { icon: Wallet, text: 'text-cat-finance', soft: 'bg-cat-finance/14' },
  mindfulness: { icon: Brain, text: 'text-cat-mindfulness', soft: 'bg-cat-mindfulness/14' },
  other: { icon: Tag, text: 'text-cat-other', soft: 'bg-cat-other/14' },
}
