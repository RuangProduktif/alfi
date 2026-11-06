import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, buttonClass } from '@/components/ui/button'
import { inputClass } from '@/components/ui/field'
import { FormField } from '@/components/ui/form-field'
import { useToast } from '@/components/ui/toast'
import { AuthLayout } from '@/features/auth/AuthLayout'
import { useAuth } from '@/features/auth/AuthContext'
import { mapAuthError } from '@/features/auth/auth-service'
import { fieldErrors, forgotPasswordSchema, loginSchema, resetPasswordSchema, signupSchema } from '@/lib/validation/auth'
import type { ZodType } from 'zod'

const linkClass = 'font-medium text-accent-text hover:underline'

/** Logika bersama form autentikasi: validasi, cegah submit ganda, dan tampilkan error dari layanan. */
function useAuthForm<V>(schema: ZodType<V>, initial: Record<string, string>, submit: (values: V) => Promise<void>) {
  const [values, setValues] = useState(initial)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    const parsed = schema.safeParse(values)
    if (!parsed.success) return setErrors(fieldErrors(parsed.error))
    setErrors({})
    setFormError(null)
    setBusy(true)
    try {
      await submit(parsed.data)
    } catch (err) {
      setFormError(mapAuthError(err).message)
    } finally {
      setBusy(false)
    }
  }
  const field = (name: string) => ({
    id: `f-${name}`,
    value: values[name] ?? '',
    onChange: (e: { target: { value: string } }) => setValues((v) => ({ ...v, [name]: e.target.value })),
    'aria-invalid': !!errors[name],
    'aria-describedby': errors[name] ? `f-${name}-error` : undefined,
    className: inputClass,
  })
  return { field, errors, formError, busy, onSubmit }
}

const FormError = ({ message }: { message: string | null }) =>
  message ? <p role="alert" className="rounded-lg border border-danger p-3 text-sm text-danger">{message}</p> : null

export function LoginPage() {
  const { service } = useAuth()
  const f = useAuthForm(loginSchema, { email: '', password: '' }, (v) => service.signIn(v))
  return (
    <AuthLayout title="Masuk" subtitle="Selamat datang kembali di Ritual." footer={<>Belum punya akun? <Link to="/signup" className={linkClass}>Daftar</Link></>}>
      <form onSubmit={f.onSubmit} noValidate className="space-y-4">
        <FormError message={f.formError} />
        <FormField label="Email" htmlFor="f-email" error={f.errors.email}><input type="email" autoComplete="email" {...f.field('email')} /></FormField>
        <FormField label="Kata sandi" htmlFor="f-password" error={f.errors.password}><input type="password" autoComplete="current-password" {...f.field('password')} /></FormField>
        <div className="text-right text-sm"><Link to="/forgot-password" className={linkClass}>Lupa kata sandi?</Link></div>
        <Button type="submit" className="w-full" disabled={f.busy}>{f.busy ? 'Memuat…' : 'Masuk'}</Button>
      </form>
    </AuthLayout>
  )
}

export function SignupPage() {
  const { service } = useAuth()
  const [confirmEmail, setConfirmEmail] = useState<string | null>(null)
  const f = useAuthForm(signupSchema, { displayName: '', email: '', password: '', confirmPassword: '' }, async (v) => {
    const r = await service.signUp({ displayName: v.displayName, email: v.email, password: v.password })
    if (r.needsEmailConfirmation) setConfirmEmail(v.email)
  })
  if (confirmEmail) {
    return (
      <AuthLayout title="Periksa email kamu">
        <p role="status" className="text-sm">Kami telah mengirim tautan verifikasi ke <strong>{confirmEmail}</strong>. Buka tautan tersebut, lalu masuk.</p>
        <Link to="/login" className={buttonClass('primary', 'w-full')}>Ke halaman masuk</Link>
      </AuthLayout>
    )
  }
  return (
    <AuthLayout title="Daftar" subtitle="Buat akun untuk mulai membangun kebiasaan." footer={<>Sudah punya akun? <Link to="/login" className={linkClass}>Masuk</Link></>}>
      <form onSubmit={f.onSubmit} noValidate className="space-y-4">
        <FormError message={f.formError} />
        <FormField label="Nama" htmlFor="f-displayName" error={f.errors.displayName}><input autoComplete="name" {...f.field('displayName')} /></FormField>
        <FormField label="Email" htmlFor="f-email" error={f.errors.email}><input type="email" autoComplete="email" {...f.field('email')} /></FormField>
        <FormField label="Kata sandi" htmlFor="f-password" error={f.errors.password}><input type="password" autoComplete="new-password" {...f.field('password')} /></FormField>
        <FormField label="Konfirmasi kata sandi" htmlFor="f-confirmPassword" error={f.errors.confirmPassword}><input type="password" autoComplete="new-password" {...f.field('confirmPassword')} /></FormField>
        <Button type="submit" className="w-full" disabled={f.busy}>{f.busy ? 'Memuat…' : 'Daftar'}</Button>
      </form>
    </AuthLayout>
  )
}

export function ForgotPasswordPage() {
  const { service } = useAuth()
  const [sent, setSent] = useState(false)
  const f = useAuthForm(forgotPasswordSchema, { email: '' }, async (v) => {
    await service.requestPasswordReset(v.email)
    setSent(true)
  })
  return (
    <AuthLayout title="Lupa Kata Sandi" subtitle="Masukkan email akunmu untuk menerima tautan pemulihan." footer={<Link to="/login" className={linkClass}>Kembali ke halaman masuk</Link>}>
      {sent ? (
        // Pesan sengaja sama untuk email terdaftar maupun tidak, agar keberadaan akun tidak bocor.
        <p role="status" className="text-sm">Jika email tersebut terdaftar, tautan pemulihan kata sandi telah dikirim. Periksa kotak masuk kamu.</p>
      ) : (
        <form onSubmit={f.onSubmit} noValidate className="space-y-4">
          <FormError message={f.formError} />
          <FormField label="Email" htmlFor="f-email" error={f.errors.email}><input type="email" autoComplete="email" {...f.field('email')} /></FormField>
          <Button type="submit" className="w-full" disabled={f.busy}>{f.busy ? 'Memuat…' : 'Kirim Tautan Pemulihan'}</Button>
        </form>
      )}
    </AuthLayout>
  )
}

export function ResetPasswordPage() {
  const { status, user, service } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const f = useAuthForm(resetPasswordSchema, { password: '', confirmPassword: '' }, async (v) => {
    await service.updatePassword(v.password)
    toast({ kind: 'success', message: 'Kata sandi berhasil diperbarui.' })
    navigate('/app', { replace: true })
  })
  if (status === 'loading') return <AuthLayout title="Atur Kata Sandi Baru"><p className="text-sm text-muted">Memuat…</p></AuthLayout>
  if (!user) {
    return (
      <AuthLayout title="Tautan tidak valid">
        <p role="alert" className="text-sm">Tautan pemulihan tidak valid atau sudah kedaluwarsa.</p>
        <Link to="/forgot-password" className={buttonClass('primary', 'w-full')}>Minta tautan baru</Link>
      </AuthLayout>
    )
  }
  return (
    <AuthLayout title="Atur Kata Sandi Baru">
      <form onSubmit={f.onSubmit} noValidate className="space-y-4">
        <FormError message={f.formError} />
        <FormField label="Kata sandi baru" htmlFor="f-password" error={f.errors.password}><input type="password" autoComplete="new-password" {...f.field('password')} /></FormField>
        <FormField label="Konfirmasi kata sandi" htmlFor="f-confirmPassword" error={f.errors.confirmPassword}><input type="password" autoComplete="new-password" {...f.field('confirmPassword')} /></FormField>
        <Button type="submit" className="w-full" disabled={f.busy}>{f.busy ? 'Memuat…' : 'Simpan'}</Button>
      </form>
    </AuthLayout>
  )
}
