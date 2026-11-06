import { AppAuthError, GENERIC_AUTH_ERROR, NETWORK_AUTH_ERROR, mapAuthError, toAuthUser } from '@/features/auth/auth-service'
import type { User } from '@supabase/supabase-js'

describe('mapAuthError', () => {
  it.each([
    [{ code: 'invalid_credentials' }, 'Email atau kata sandi salah.'],
    [{ code: 'user_already_exists' }, 'Email sudah terdaftar. Silakan masuk.'],
    [{ code: 'email_not_confirmed' }, 'Email belum diverifikasi. Periksa kotak masuk kamu.'],
    [{ code: 'over_request_rate_limit' }, 'Terlalu banyak percobaan. Coba lagi beberapa saat.'],
    [{ status: 429 }, 'Terlalu banyak percobaan. Coba lagi beberapa saat.'],
    [{ name: 'AuthRetryableFetchError', message: 'x' }, NETWORK_AUTH_ERROR],
    [new TypeError('Failed to fetch'), NETWORK_AUTH_ERROR],
    [{ code: 'sesuatu_tak_dikenal', message: 'English internal message' }, GENERIC_AUTH_ERROR],
    [null, GENERIC_AUTH_ERROR],
  ])('%j -> pesan Indonesia', (input, expected) => expect(mapAuthError(input).message).toBe(expected))

  it('tidak pernah membocorkan pesan mentah berbahasa Inggris', () =>
    expect(mapAuthError({ message: 'Database error saving new user' }).message).toBe(GENERIC_AUTH_ERROR))
  it('error aplikasi dibiarkan apa adanya', () => {
    const e = new AppAuthError('halo')
    expect(mapAuthError(e)).toBe(e)
  })
})

describe('toAuthUser', () => {
  it('membaca nama tampilan dari metadata', () =>
    expect(toAuthUser({ id: 'u1', email: 'a@b.id', user_metadata: { display_name: 'Budi' } } as unknown as User)).toEqual({ id: 'u1', email: 'a@b.id', displayName: 'Budi' }))
  it('aman bila metadata kosong', () =>
    expect(toAuthUser({ id: 'u1', email: undefined, user_metadata: {} } as unknown as User)).toEqual({ id: 'u1', email: '', displayName: '' }))
})
