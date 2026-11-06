import { useEffect, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useSettings } from '@/features/settings/queries'
import { id } from '@/lib/i18n'
import { useTheme, type Theme } from '@/lib/theme'
import { useOnlineStatus } from '@/pwa/useOnlineStatus'

/** Akun adalah sumber kebenaran tema: saat pengaturan akun dimuat, tema perangkat mengikutinya. */
function ThemeSync({ theme, children }: { theme: Theme; children: ReactNode }) {
  const { setTheme } = useTheme()
  useEffect(() => { setTheme(theme) }, [theme, setTheme])
  return children
}

/**
 * Menahan halaman privat sampai pengaturan akun termuat. Tanpa ini, "hari ini" akan dihitung dengan zona waktu
 * bawaan lalu berubah, dan penyelesaian bisa tercatat pada tanggal yang salah. Bila gagal dimuat, TIDAK ada
 * pemulihan diam-diam ke zona waktu bawaan; pengguna diminta mencoba lagi.
 */
export function SettingsGate({ children }: { children: ReactNode }) {
  const settings = useSettings()
  const online = useOnlineStatus()
  if (settings.data) return <ThemeSync theme={settings.data.theme}>{children}</ThemeSync>
  if (settings.isError) {
    return (
      <main className="grid min-h-dvh place-items-center p-4">
        <Card className="max-w-sm space-y-3">
          <p role="alert">
            {online ? `Pengaturan akun tidak dapat dimuat. ${id.errors.generic}` : 'Kamu sedang offline, jadi pengaturan akun belum bisa dimuat. Sambungkan ke internet lalu coba lagi.'}
          </p>
          <Button variant="secondary" disabled={settings.isFetching} onClick={() => void settings.refetch()}>{id.actions.retry}</Button>
        </Card>
      </main>
    )
  }
  return <main className="grid min-h-dvh place-items-center p-6 text-muted">{id.errors.loading}</main>
}
