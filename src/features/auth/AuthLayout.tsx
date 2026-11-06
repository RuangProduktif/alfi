import { CircleCheckBig } from 'lucide-react'
import type { ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { id } from '@/lib/i18n'

export function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <main className="grid min-h-dvh place-items-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex items-center justify-center gap-2 font-semibold">
          <span className="grid size-9 place-items-center rounded-lg bg-accent text-accent-fg"><CircleCheckBig size={20} aria-hidden /></span>
          {id.appName}
        </div>
        <Card className="space-y-5">
          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight">{title}</h1>
            {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
          </div>
          {children}
        </Card>
        {footer && <p className="text-center text-sm text-muted">{footer}</p>}
      </div>
    </main>
  )
}
