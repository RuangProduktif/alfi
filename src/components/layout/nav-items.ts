import { BarChart3, CalendarDays, Home, ListChecks, type LucideIcon } from 'lucide-react'
import { id } from '@/lib/i18n'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

export const primaryNav: NavItem[] = [
  { to: '/app', label: id.nav.home, icon: Home, end: true },
  { to: '/app/habits', label: id.nav.habits, icon: ListChecks },
  { to: '/app/calendar', label: id.nav.calendar, icon: CalendarDays },
  { to: '/app/analytics', label: id.nav.analytics, icon: BarChart3 },
]
