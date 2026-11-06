import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { RepositoryProvider, useRepositoryFactory } from '@/features/habits/RepositoryContext'
import { SettingsGate } from '@/features/settings/SettingsGate'
import { id } from '@/lib/i18n'

function FullPageMessage({ children }: { children: ReactNode }) {
  return <main className="grid min-h-dvh place-items-center p-6 text-muted">{children}</main>
}

/** Hanya menerima tujuan internal di dalam /app agar tidak bisa dipakai untuk redirect ke tempat lain. */
export const safeRedirect = (from: unknown): string => (typeof from === 'string' && from.startsWith('/app') ? from : '/app')

/** Cache query dan repositori dibuat ulang untuk setiap pengguna (key = user.id), sehingga data tidak tercampur antar akun. */
function UserScope({ userId, children }: { userId: string; children: ReactNode }) {
  const createRepository = useRepositoryFactory()
  const [source] = useState(() => createRepository(userId))
  const [client] = useState(() => new QueryClient({
    // networkMode 'always': tanpa ini TanStack Query menjeda permintaan saat offline (tombol macet "menyimpan", lalu terkirim sendiri
    // saat online). docs/PWA.md menjanjikan sebaliknya: tanpa antrean offline, perubahan gagal jujur dan tidak disimpan.
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false, networkMode: 'always' }, mutations: { networkMode: 'always' } },
  }))
  return (
    <QueryClientProvider client={client}>
      <RepositoryProvider source={source}>
        <SettingsGate>{children}</SettingsGate>
      </RepositoryProvider>
    </QueryClientProvider>
  )
}

export function RequireAuth() {
  const { status, user } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <FullPageMessage>{id.errors.loading}</FullPageMessage>
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  return (
    <UserScope key={user.id} userId={user.id}>
      <Outlet />
    </UserScope>
  )
}

export function GuestRoute() {
  const { status, user } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <FullPageMessage>{id.errors.loading}</FullPageMessage>
  if (user) return <Navigate to={safeRedirect((location.state as { from?: unknown } | null)?.from)} replace />
  return <Outlet />
}

export function RootRedirect() {
  const { status, user } = useAuth()
  if (status === 'loading') return <FullPageMessage>{id.errors.loading}</FullPageMessage>
  return <Navigate to={user ? '/app' : '/login'} replace />
}
