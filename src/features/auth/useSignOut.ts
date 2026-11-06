import { useCallback } from 'react'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/features/auth/AuthContext'
import { mapAuthError } from '@/features/auth/auth-service'
import { id } from '@/lib/i18n'

export function useSignOut() {
  const { service } = useAuth()
  const toast = useToast()
  return useCallback(
    async function attempt(): Promise<void> {
      try {
        await service.signOut()
      } catch (err) {
        toast({ kind: 'error', message: mapAuthError(err).message, action: { label: id.actions.retry, onClick: () => void attempt() } })
      }
    },
    [service, toast],
  )
}
