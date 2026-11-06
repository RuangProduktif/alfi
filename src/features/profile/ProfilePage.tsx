import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/features/auth/AuthContext'
import { useSignOut } from '@/features/auth/useSignOut'
import { id } from '@/lib/i18n'

export function ProfilePage() {
  const { user } = useAuth()
  const signOut = useSignOut()
  return (
    <div className="space-y-6">
      <h1 className="text-[1.75rem] font-bold leading-tight tracking-tight">{id.nav.profile}</h1>
      <Card className="space-y-4">
        <dl className="space-y-3 text-sm">
          <div><dt className="text-muted">Nama</dt><dd className="font-medium">{user?.displayName || '—'}</dd></div>
          <div><dt className="text-muted">Email</dt><dd className="font-medium">{user?.email}</dd></div>
        </dl>
        <Button variant="secondary" onClick={() => void signOut()}><LogOut size={16} aria-hidden />Keluar</Button>
      </Card>
    </div>
  )
}
