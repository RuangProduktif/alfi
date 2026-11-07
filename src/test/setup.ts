import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'

// jsdom tidak menyediakan matchMedia; default: sistem berada di mode terang.
export const mediaState = { dark: false, standalone: false, listeners: new Set<() => void>() }

// <dialog>.showModal belum tersedia di jsdom.
if (typeof HTMLDialogElement !== 'undefined') {
  HTMLDialogElement.prototype.showModal = function showModal() { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close = function close() {
    if (!this.hasAttribute('open')) return
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
}

beforeEach(() => {
  if (typeof window === 'undefined') return // tes lingkungan node (mis. supabase/tests)
  // Jumat/Sabtu tetap: 31 Okt 2026 12:00 WIB. Hanya Date yang dipalsukan agar timer & userEvent tetap normal.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-31T05:00:00Z'))
  mediaState.dark = false
  mediaState.standalone = false
  mediaState.listeners.clear()
  localStorage.clear()
  document.documentElement.classList.remove('dark')
  vi.stubGlobal('matchMedia', (query: string) => ({
    get matches() { return query.includes('display-mode: standalone') ? mediaState.standalone : mediaState.dark },
    media: query,
    addEventListener: (_: string, cb: () => void) => mediaState.listeners.add(cb),
    removeEventListener: (_: string, cb: () => void) => mediaState.listeners.delete(cb),
  }))
})

afterEach(() => {
  if (typeof window === 'undefined') return
  vi.unstubAllGlobals()
  vi.useRealTimers()
})
