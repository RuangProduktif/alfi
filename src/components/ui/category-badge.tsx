import { CATEGORY_STYLE } from '@/lib/category-style'
import { id } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import type { Category } from '@/types/habit'

/** Label kategori dengan ikon dan warna aksen kategori. Teksnya sama persis dengan label sebelumnya. */
export function CategoryBadge({ category, className }: { category: Category; className?: string }) {
  const { icon: Icon, text, soft } = CATEGORY_STYLE[category]
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold', soft, text, className)}>
      <Icon size={13} aria-hidden />
      {id.categories[category]}
    </span>
  )
}
