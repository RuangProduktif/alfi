import { WifiOff } from 'lucide-react'
import { useOnlineStatus } from '@/pwa/useOnlineStatus'

/** Status offline yang jujur: Ritual belum punya antrean sinkronisasi, jadi perubahan tidak disimpan saat offline. */
export function OfflineNotice() {
  const online = useOnlineStatus()
  if (online) return null
  return (
    <div role="status" className="flex items-start gap-2 border-b border-border bg-surface px-4 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] text-sm">
      <WifiOff size={16} className="mt-0.5 shrink-0 text-danger" aria-hidden />
      <p>
        <span className="font-medium">Kamu sedang offline.</span>{' '}
        Ritual belum mendukung perubahan offline, jadi perubahan tidak akan tersimpan sampai kamu kembali online.
      </p>
    </div>
  )
}
