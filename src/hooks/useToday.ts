import { useEffect, useState } from 'react'
import { useSettings } from '@/features/settings/queries'
import { DEFAULT_TIMEZONE, hourInTimeZone, todayInTimeZone } from '@/lib/dates'

/** Zona waktu dari pengaturan akun. SettingsGate menjamin pengaturan sudah termuat sebelum halaman privat tampil. */
export function useTimeZone(): string {
  return useSettings().data?.timezone ?? DEFAULT_TIMEZONE
}

/** Tanggal dan jam pada zona waktu pengguna; diperbarui berkala sehingga ikut berganti saat lewat tengah malam. */
export function useToday() {
  const timeZone = useTimeZone()
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])
  return { today: todayInTimeZone(now, timeZone), hour: hourInTimeZone(now, timeZone), timeZone }
}
