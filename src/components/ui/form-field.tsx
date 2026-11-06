import type { ReactNode } from 'react'

export function FormField({ label, htmlFor, error, children }: { label: string; htmlFor: string; error?: string | undefined; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">{label}</label>
      {children}
      {error && <p id={`${htmlFor}-error`} className="text-sm text-danger">{error}</p>}
    </div>
  )
}
