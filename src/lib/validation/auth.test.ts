import { fieldErrors, forgotPasswordSchema, loginSchema, resetPasswordSchema, signupSchema } from '@/lib/validation/auth'

const errs = (schema: { safeParse: (v: unknown) => { success: boolean; error?: never } | { success: false; error: import('zod').ZodError } }, v: unknown) => {
  const r = schema.safeParse(v)
  return r.success ? {} : fieldErrors((r as { error: import('zod').ZodError }).error)
}
const okSignup = { displayName: 'Budi', email: 'budi@contoh.id', password: 'rahasia123', confirmPassword: 'rahasia123' }

describe('validasi autentikasi', () => {
  it('login: email dan kata sandi wajib, format email dicek', () => {
    expect(errs(loginSchema, { email: '', password: '' })).toEqual({ email: 'Email wajib diisi.', password: 'Kata sandi wajib diisi.' })
    expect(errs(loginSchema, { email: 'bukan-email', password: 'x' })).toEqual({ email: 'Format email tidak valid.' })
    expect(errs(loginSchema, { email: ' a@b.id ', password: 'x' })).toEqual({})
  })
  it('signup: data valid lolos', () => expect(errs(signupSchema, okSignup)).toEqual({}))
  it('signup: nama, panjang kata sandi, dan konfirmasi', () => {
    expect(errs(signupSchema, { ...okSignup, displayName: '  ' }).displayName).toBe('Nama wajib diisi.')
    expect(errs(signupSchema, { ...okSignup, password: 'pendek', confirmPassword: 'pendek' }).password).toBe('Kata sandi minimal 8 karakter.')
    expect(errs(signupSchema, { ...okSignup, password: 'a'.repeat(73), confirmPassword: 'a'.repeat(73) }).password).toBe('Kata sandi maksimal 72 karakter.')
    expect(errs(signupSchema, { ...okSignup, confirmPassword: 'beda12345' }).confirmPassword).toBe('Konfirmasi kata sandi tidak sama.')
  })
  it('lupa kata sandi dan reset', () => {
    expect(errs(forgotPasswordSchema, { email: 'x' }).email).toBe('Format email tidak valid.')
    expect(errs(resetPasswordSchema, { password: 'rahasia123', confirmPassword: 'lain' }).confirmPassword).toBe('Konfirmasi kata sandi tidak sama.')
  })
})
