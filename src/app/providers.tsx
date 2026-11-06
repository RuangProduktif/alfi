import type { ReactNode } from 'react'
import { ToastProvider } from '@/components/ui/toast'
import { AuthProvider } from '@/features/auth/AuthContext'
import type { AuthService } from '@/features/auth/auth-service'
import { RepositoryFactoryProvider, type RepositoryFactory } from '@/features/habits/RepositoryContext'
import { ThemeProvider } from '@/lib/theme'
import { InstallProvider } from '@/pwa/InstallContext'
import { OfflineNotice } from '@/pwa/OfflineNotice'
import { UpdatePrompt } from '@/pwa/UpdatePrompt'

export function AppProviders({ auth, createRepository, children }: { auth: AuthService; createRepository: RepositoryFactory; children: ReactNode }) {
  return (
    <ThemeProvider>
      <InstallProvider>
        <ToastProvider>
          <AuthProvider service={auth}>
            <RepositoryFactoryProvider value={createRepository}>
              <OfflineNotice />
              {children}
              <UpdatePrompt />
            </RepositoryFactoryProvider>
          </AuthProvider>
        </ToastProvider>
      </InstallProvider>
    </ThemeProvider>
  )
}
