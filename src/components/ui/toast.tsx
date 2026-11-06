import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { CircleAlert, CircleCheck, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ToastInput {
  kind: 'success' | 'error'
  message: string
  action?: { label: string; onClick: () => void }
}
interface ToastItem extends ToastInput { id: number }

const ToastContext = createContext<((t: ToastInput) => void) | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => setItems((cur) => cur.filter((t) => t.id !== id)), [])
  const toast = useCallback(
    (t: ToastInput) => {
      const id = nextId.current++
      setItems((cur) => [...cur.slice(-2), { ...t, id }])
      setTimeout(() => dismiss(id), t.kind === 'error' ? 8000 : 4000)
    },
    [dismiss],
  )
  const value = useMemo(() => toast, [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(6rem+env(safe-area-inset-bottom,0px))] z-50 flex flex-col items-center gap-2 px-4 md:bottom-6">
        {items.map((t) => (
          <div
            key={t.id}
            role={t.kind === 'error' ? 'alert' : 'status'}
            className={cn(
              'pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-xl border bg-surface p-3 text-sm shadow-float',
              t.kind === 'error' ? 'border-danger' : 'border-border',
            )}
          >
            {t.kind === 'error' ? <CircleAlert size={18} className="shrink-0 text-danger" aria-hidden /> : <CircleCheck size={18} className="shrink-0 text-success" aria-hidden />}
            <span className="flex-1">{t.message}</span>
            {t.action && (
              <button type="button" className="font-medium text-accent-text" onClick={() => { t.action?.onClick(); dismiss(t.id) }}>
                {t.action.label}
              </button>
            )}
            <button type="button" aria-label="Tutup" className="text-muted" onClick={() => dismiss(t.id)}><X size={16} aria-hidden /></button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast harus dipakai di dalam ToastProvider')
  return ctx
}
