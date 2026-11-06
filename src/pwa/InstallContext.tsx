import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type Platform = 'ios' | 'android' | 'desktop'
export type InstallState = 'installed' | 'promptable' | 'manual'

export function detectPlatform(ua = navigator.userAgent, maxTouchPoints = navigator.maxTouchPoints): Platform {
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && maxTouchPoints > 1)) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'desktop'
}

export function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

interface InstallValue {
  state: InstallState
  platform: Platform
  install: () => Promise<'accepted' | 'dismissed' | null>
}

const InstallContext = createContext<InstallValue | null>(null)

/**
 * Dipasang di akar aplikasi: `beforeinstallprompt` biasanya terpicu sekali, tak lama setelah halaman dimuat,
 * jauh sebelum pengguna membuka Pengaturan. Tanpa penangkap di akar, peristiwanya terlewat.
 */
export function InstallProvider({ children }: { children: ReactNode }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(isStandalone)

  useEffect(() => {
    const onPrompt = (e: Event) => { e.preventDefault(); setDeferred(e as BeforeInstallPromptEvent) }
    const onInstalled = () => { setInstalled(true); setDeferred(null) }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const install = useCallback(async () => {
    if (!deferred) return null
    await deferred.prompt()
    const { outcome } = await deferred.userChoice
    setDeferred(null) // peristiwa hanya boleh dipakai sekali
    if (outcome === 'accepted') setInstalled(true)
    return outcome
  }, [deferred])

  const value = useMemo<InstallValue>(
    () => ({ state: installed ? 'installed' : deferred ? 'promptable' : 'manual', platform: detectPlatform(), install }),
    [installed, deferred, install],
  )
  return <InstallContext.Provider value={value}>{children}</InstallContext.Provider>
}

export function useInstall(): InstallValue {
  const ctx = useContext(InstallContext)
  if (!ctx) throw new Error('useInstall harus dipakai di dalam InstallProvider')
  return ctx
}
