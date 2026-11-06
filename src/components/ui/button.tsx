import { cn } from '@/lib/utils'

const base =
  'inline-flex items-center justify-center gap-2 rounded-lg px-3.5 h-10 text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none'
const variants = {
  primary: 'bg-accent text-accent-fg hover:bg-accent-hover',
  secondary: 'bg-surface text-fg border border-border hover:bg-surface-hover',
  ghost: 'text-muted hover:bg-surface-hover hover:text-fg',
  danger: 'bg-danger text-danger-fg hover:bg-danger-hover',
} as const

export type ButtonVariant = keyof typeof variants

export function buttonClass(variant: ButtonVariant = 'primary', className?: string) {
  return cn(base, variants[variant], className)
}

export function Button({
  variant = 'primary',
  className,
  type = 'button',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button type={type} className={buttonClass(variant, className)} {...props} />
}
