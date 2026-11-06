import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useInstall, type Platform } from '@/pwa/InstallContext'

const STEPS: Record<Platform, string> = {
  ios: 'Buka Ritual di Safari, ketuk tombol Bagikan, lalu pilih "Tambah ke Layar Utama".',
  android: 'Buka menu ⋮ di Chrome, lalu pilih "Instal aplikasi" atau "Tambahkan ke layar utama".',
  desktop: 'Di Chrome atau Edge, klik ikon pasang di ujung kanan bilah alamat, atau buka menu ⋮ lalu pilih "Instal Ritual". Firefox di komputer belum mendukung pemasangan aplikasi web.',
}

export function InstallCard() {
  const { state, platform, install } = useInstall()
  return (
    <Card className="space-y-3">
      <div>
        <h2 className="font-medium">Pasang Aplikasi</h2>
        <p className="text-sm text-muted">Pasang Ritual agar terbuka seperti aplikasi biasa dari layar utama atau menu aplikasi.</p>
      </div>
      {state === 'installed' && <p role="status" className="text-sm">Ritual sudah terpasang di perangkat ini.</p>}
      {state === 'promptable' && <Button onClick={() => void install()}><Download size={16} aria-hidden />Pasang Aplikasi</Button>}
      {state === 'manual' && (
        <div className="space-y-2 text-sm">
          <p>Browser ini tidak menawarkan pemasangan otomatis saat ini. Caranya:</p>
          <p className="text-muted">{STEPS[platform]}</p>
        </div>
      )}
      <p className="text-xs text-muted">Ritual membutuhkan koneksi internet. Perubahan offline belum didukung.</p>
    </Card>
  )
}
