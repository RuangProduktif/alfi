import { z } from 'zod'
import { isValidDateString } from '@/lib/dates'
import { HABIT_ICON_NAMES } from '@/lib/habit-icons'
import { CATEGORIES } from '@/types/habit'

export const habitFormSchema = z
  .object({
    name: z.string().trim().min(1, { error: 'Nama kebiasaan wajib diisi.' }).max(60, { error: 'Nama maksimal 60 karakter.' }),
    description: z.string().trim().max(200, { error: 'Deskripsi maksimal 200 karakter.' }),
    category: z.enum(CATEGORIES, { error: 'Pilih kategori.' }),
    icon: z.enum(HABIT_ICON_NAMES as [string, ...string[]], { error: 'Pilih ikon.' }),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/, { error: 'Pilih warna.' }),
    frequency: z.enum(['daily', 'weekly_days'], { error: 'Pilih frekuensi.' }),
    scheduledDays: z.array(z.number().int().min(0).max(6)),
    startDate: z.string().refine(isValidDateString, { error: 'Tanggal mulai tidak valid.' }),
  })
  .superRefine((v, ctx) => {
    if (v.frequency === 'weekly_days' && v.scheduledDays.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['scheduledDays'], message: 'Pilih minimal satu hari.' })
    }
  })
  .transform((v) => ({
    ...v,
    description: v.description === '' ? null : v.description,
    scheduledDays: v.frequency === 'daily' ? [] : [...new Set(v.scheduledDays)].sort((a, b) => a - b),
  }))

export type HabitFormValues = z.input<typeof habitFormSchema>
