import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

export const isSupabaseConfigured = Boolean(url && key)

let client: SupabaseClient | null = null

/** Hanya memakai publishable (anon) key. Service-role key tidak boleh pernah ada di frontend. */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null
  client ??= createClient(url!, key!, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  return client
}
