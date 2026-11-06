import { useRegisterSW } from 'virtual:pwa-register/react'
import { Button } from '@/components/ui/button'

const HOURLY = 60 * 60 * 1000

/** Versi baru tidak dipasang diam-diam: pengguna memilih kapan memuat ulang (supaya tidak kehilangan isian formulir). */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return
      // Periksa pembaruan berkala selama aplikasi terbuka; lewati saat offline.
      setInterval(() => { if (navigator.onLine) void registration.update() }, HOURLY)
    },
  })
  if (!needRefresh) return null
  return (
    <div role="status" className="fixed inset-x-0 bottom-[calc(6rem+env(safe-area-inset-bottom,0px))] z-50 flex justify-center px-4 md:bottom-6">
      <div className="flex w-full max-w-sm items-center gap-3 rounded-xl border border-border bg-surface p-3 text-sm shadow-float">
        <span className="flex-1">Versi baru Ritual tersedia.</span>
        <Button variant="ghost" onClick={() => setNeedRefresh(false)}>Nanti</Button>
        <Button onClick={() => void updateServiceWorker(true)}>Muat Ulang</Button>
      </div>
    </div>
  )
}
