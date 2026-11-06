import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { AuthService, AuthUser } from '@/features/auth/auth-service'

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

interface AuthContextValue {
  status: AuthStatus
  user: AuthUser | null
  service: AuthService
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ service, children }: { service: AuthService; children: ReactNode }) {
  const [state, setState] = useState<{ status: AuthStatus; user: AuthUser | null }>({ status: 'loading', user: null })

  useEffect(() => {
    let active = true
    const apply = (user: AuthUser | null) => active && setState({ status: user ? 'authenticated' : 'unauthenticated', user })
    const unsubscribe = service.onChange((user) => apply(user))
    service.getSession().then(apply, () => apply(null))
    return () => {
      active = false
      unsubscribe()
    }
  }, [service])

  const value = useMemo(() => ({ ...state, service }), [state, service])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth harus dipakai di dalam AuthProvider')
  return ctx
}
