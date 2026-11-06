import { Card } from '@/components/ui/card'
import { inputClass } from '@/components/ui/field'
import { useToast } from '@/components/ui/toast'
import { useSettings, useUpdateSettings } from '@/features/settings/queries'
import { ThemeSwitcher } from '@/features/settings/ThemeSwitcher'
import { id } from '@/lib/i18n'
import type { Theme } from '@/lib/theme'
import { TIMEZONE_OPTIONS } from '@/lib/timezones'
import { InstallCard } from '@/pwa/InstallCard'

export function SettingsPage() {
  const { data } = useSettings()
  const update = useUpdateSettings()
  const toast = useToast()
  const timezone = data?.timezone ?? ''
  const knownZone = TIMEZONE_OPTIONS.some((o) => o.value === timezone)

  async function saveTheme(theme: Theme): Promise<void> {
    try {
      await update.mutateAsync({ theme })
    } catch {
      // Tema sudah berubah di perangkat ini; beri tahu jujur bahwa belum tersimpan ke akun.
      toast({ kind: 'error', message: 'Tema berubah di perangkat ini, tetapi belum tersimpan ke akunmu.', action: { label: id.actions.retry, onClick: () => void saveTheme(theme) } })
    }
  }

  async function saveTimezone(next: string): Promise<void> {
    try {
      await update.mutateAsync({ timezone: next })
      toast({ kind: 'success', message: 'Perubahan berhasil disimpan.' })
    } catch {
      toast({ kind: 'error', message: id.errors.generic, action: { label: id.actions.retry, onClick: () => void saveTimezone(next) } })
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-[1.75rem] font-bold leading-tight tracking-tight">{id.nav.settings}</h1>
      <Card className="space-y-4">
        <div>
          <h2 className="font-medium">{id.theme.title}</h2>
          <p className="text-sm text-muted">{id.theme.description} Pilihan ini tersimpan di akunmu.</p>
        </div>
        <ThemeSwitcher onChange={(t) => void saveTheme(t)} />
      </Card>
      <Card className="space-y-4">
        <div>
          <h2 className="font-medium"><label htmlFor="timezone">Zona waktu</label></h2>
          <p className="text-sm text-muted">
            Menentukan kapan hari berganti untuk "hari ini", rentetan, dan kalender. Tanggal penyelesaian yang sudah tersimpan tidak berubah.
          </p>
        </div>
        <select id="timezone" className={inputClass} value={timezone} disabled={update.isPending} onChange={(e) => void saveTimezone(e.target.value)}>
          {!knownZone && timezone && <option value={timezone}>{timezone}</option>}
          {TIMEZONE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </Card>
      <InstallCard />
    </div>
  )
}
