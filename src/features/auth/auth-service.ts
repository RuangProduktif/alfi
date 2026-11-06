import type { SupabaseClient, User } from '@supabase/supabase-js'

export interface AuthUser { id: string; email: string; displayName: string }
export type AuthEvent = 'SIGNED_IN' | 'SIGNED_OUT' | 'PASSWORD_RECOVERY' | 'OTHER'

/** Error dengan pesan yang sudah berbahasa Indonesia dan aman ditampilkan. */
export class AppAuthError extends Error {}

export interface AuthService {
  getSession(): Promise<AuthUser | null>
  onChange(cb: (user: AuthUser | null, event: AuthEvent) => void): () => void
  signUp(input: { displayName: string; email: string; password: string }): Promise<{ needsEmailConfirmation: boolean }>
  signIn(input: { email: string; password: string }): Promise<void>
  signOut(): Promise<void>
  requestPasswordReset(email: string): Promise<void>
  updatePassword(password: string): Promise<void>
}

const MESSAGES: Record<string, string> = {
  invalid_credentials: 'Email atau kata sandi salah.',
  user_already_exists: 'Email sudah terdaftar. Silakan masuk.',
  email_exists: 'Email sudah terdaftar. Silakan masuk.',
  email_not_confirmed: 'Email belum diverifikasi. Periksa kotak masuk kamu.',
  weak_password: 'Kata sandi terlalu lemah. Gunakan kombinasi yang lebih panjang.',
  same_password: 'Kata sandi baru harus berbeda dari yang lama.',
  over_request_rate_limit: 'Terlalu banyak percobaan. Coba lagi beberapa saat.',
  over_email_send_rate_limit: 'Terlalu banyak email terkirim. Coba lagi beberapa saat.',
  signup_disabled: 'Pendaftaran sedang dinonaktifkan.',
  session_expired: 'Sesi berakhir. Silakan masuk kembali.',
  session_not_found: 'Sesi tidak ditemukan. Silakan masuk kembali.',
}
export const GENERIC_AUTH_ERROR = 'Terjadi kesalahan. Silakan coba lagi.'
export const NETWORK_AUTH_ERROR = 'Tidak dapat terhubung. Periksa koneksi internet kamu.'

export function mapAuthError(err: unknown): AppAuthError {
  if (err instanceof AppAuthError) return err
  const e = err as { code?: string; message?: string; status?: number; name?: string } | null
  if (e?.code && MESSAGES[e.code]) return new AppAuthError(MESSAGES[e.code])
  if (e?.status === 429) return new AppAuthError(MESSAGES.over_request_rate_limit!)
  if (e?.name === 'AuthRetryableFetchError' || e?.status === 0 || /fetch|network/i.test(e?.message ?? '')) return new AppAuthError(NETWORK_AUTH_ERROR)
  return new AppAuthError(GENERIC_AUTH_ERROR)
}

export function toAuthUser(user: User): AuthUser {
  const name = user.user_metadata?.display_name
  return { id: user.id, email: user.email ?? '', displayName: typeof name === 'string' ? name : '' }
}

export function createSupabaseAuthService(client: SupabaseClient): AuthService {
  const origin = () => window.location.origin
  const unwrap = <T extends { error: unknown }>(r: T): T => {
    if (r.error) throw mapAuthError(r.error)
    return r
  }
  return {
    async getSession() {
      const { data, error } = await client.auth.getSession()
      if (error) throw mapAuthError(error)
      return data.session ? toAuthUser(data.session.user) : null
    },
    onChange(cb) {
      const { data } = client.auth.onAuthStateChange((event, session) => {
        const kind: AuthEvent = event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'PASSWORD_RECOVERY' ? event : 'OTHER'
        cb(session ? toAuthUser(session.user) : null, kind)
      })
      return () => data.subscription.unsubscribe()
    },
    async signUp({ displayName, email, password }) {
      try {
        const { data } = unwrap(
          await client.auth.signUp({ email, password, options: { data: { display_name: displayName }, emailRedirectTo: `${origin()}/login` } }),
        )
        // Dengan verifikasi email aktif, email yang sudah terdaftar tidak menghasilkan error; identities kosong.
        if (data.user && data.user.identities?.length === 0) throw new AppAuthError(MESSAGES.user_already_exists!)
        return { needsEmailConfirmation: !data.session }
      } catch (e) {
        throw mapAuthError(e)
      }
    },
    async signIn({ email, password }) {
      try { unwrap(await client.auth.signInWithPassword({ email, password })) } catch (e) { throw mapAuthError(e) }
    },
    async signOut() {
      try { unwrap(await client.auth.signOut()) } catch (e) { throw mapAuthError(e) }
    },
    async requestPasswordReset(email) {
      try { unwrap(await client.auth.resetPasswordForEmail(email, { redirectTo: `${origin()}/reset-password` })) } catch (e) { throw mapAuthError(e) }
    },
    async updatePassword(password) {
      try { unwrap(await client.auth.updateUser({ password })) } catch (e) { throw mapAuthError(e) }
    },
  }
}
