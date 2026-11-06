import { z } from 'zod'

const email = z.string().trim().min(1, { error: 'Email wajib diisi.' }).pipe(z.email({ error: 'Format email tidak valid.' }))
const newPassword = z
  .string()
  .min(8, { error: 'Kata sandi minimal 8 karakter.' })
  .max(72, { error: 'Kata sandi maksimal 72 karakter.' })

export const loginSchema = z.object({ email, password: z.string().min(1, { error: 'Kata sandi wajib diisi.' }) })

export const signupSchema = z
  .object({
    displayName: z.string().trim().min(1, { error: 'Nama wajib diisi.' }).max(60, { error: 'Nama maksimal 60 karakter.' }),
    email,
    password: newPassword,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, { path: ['confirmPassword'], error: 'Konfirmasi kata sandi tidak sama.' })

export const forgotPasswordSchema = z.object({ email })

export const resetPasswordSchema = z
  .object({ password: newPassword, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, { path: ['confirmPassword'], error: 'Konfirmasi kata sandi tidak sama.' })

/** Mengubah hasil safeParse gagal menjadi { namaField: pesanPertama }. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) out[String(issue.path[0] ?? 'form')] ??= issue.message
  return out
}
