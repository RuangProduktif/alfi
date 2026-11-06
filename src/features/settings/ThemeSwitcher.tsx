import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react'
import { id } from '@/lib/i18n'
import { useTheme, type Theme } from '@/lib/theme'
import { cn } from '@/lib/utils'

const options: { value: Theme; label: string; icon: LucideIcon }[] = [
  { value: 'light', label: id.theme.light, icon: Sun },
  { value: 'dark', label: id.theme.dark, icon: Moon },
  { value: 'system', label: id.theme.system, icon: Monitor },
]

export function ThemeSwitcher({ onChange }: { onChange?: (theme: Theme) => void }) {
  const { theme, setTheme } = useTheme()
  return (
    <div role="radiogroup" aria-label={id.theme.title} className="grid grid-cols-3 gap-2">
      {options.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          onClick={() => { setTheme(value); onChange?.(value) }}
          className={cn(
            'flex h-11 items-center justify-center gap-2 rounded-lg border text-sm font-medium transition-colors',
            theme === value ? 'border-accent bg-surface-hover text-fg' : 'border-border text-muted hover:bg-surface-hover',
          )}
        >
          <Icon size={16} aria-hidden />{label}
        </button>
      ))}
    </div>
  )
}
