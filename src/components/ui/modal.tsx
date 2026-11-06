import { useEffect, useId, useRef, type ReactNode } from 'react'

/** Dialog modal memakai elemen <dialog> native: focus trap, tombol Esc, dan inert background gratis. */
export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-border bg-surface p-0 text-fg shadow-float backdrop:bg-black/50"
    >
      {open && (
        <div className="max-h-[85dvh] overflow-y-auto p-5">
          <h2 id={titleId} className="mb-4 text-lg font-semibold">{title}</h2>
          {children}
        </div>
      )}
    </dialog>
  )
}
