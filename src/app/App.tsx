import { useState } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { AppProviders } from '@/app/providers'
import { AppRoutes } from '@/app/routes'
import { SetupNeeded } from '@/app/SetupNeeded'
import { createSupabaseAuthService } from '@/features/auth/auth-service'
import { createSupabaseRepository } from '@/features/habits/supabase-repository'
import { createSupabaseSettingsRepository } from '@/features/settings/settings-repository'
import { getSupabase } from '@/lib/supabase/client'

export function App() {
  const [client] = useState(getSupabase)
  const [auth] = useState(() => (client ? createSupabaseAuthService(client) : null))
  if (!client || !auth) return <SetupNeeded />
  return (
    <AppProviders auth={auth} createRepository={(userId) => ({ habits: createSupabaseRepository(client, userId), settings: createSupabaseSettingsRepository(client, userId) })}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProviders>
  )
}
