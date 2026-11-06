import { useState, type FormEvent, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { inputClass } from '@/components/ui/field'
import { Modal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { useSaveHabit } from '@/features/habits/queries'
import { useToday } from '@/hooks/useToday'
import { HABIT_COLORS, HABIT_ICONS, displayColor, inkColor, HABIT_ICON_LABELS, HABIT_ICON_NAMES } from '@/lib/habit-icons'
import { id } from '@/lib/i18n'
import { habitFormSchema, type HabitFormValues } from '@/lib/validation/habit'
import { cn } from '@/lib/utils'
import { CATEGORIES, type Habit } from '@/types/habit'

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

function Option({ selected, label, onClick, children, className }: { selected: boolean; label: string; onClick: () => void; children: ReactNode; className?: string }) {
  return (
    <button type="button" role="radio" aria-checked={selected} aria-label={label} onClick={onClick}
      className={cn('grid h-10 min-w-10 place-items-center rounded-lg border px-2 text-sm', selected ? 'border-accent bg-surface-hover' : 'border-border text-muted hover:bg-surface-hover', className)}>
      {children}
    </button>
  )
}

function Field({ label, error, htmlFor, children }: { label: string; error?: string | undefined; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">{label}</label>
      {children}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  )
}

function HabitForm({ habit, onDone }: { habit: Habit | null; onDone: () => void }) {
  const { today } = useToday()
  const toast = useToast()
  const save = useSaveHabit()
  const [values, setValues] = useState<HabitFormValues>(() =>
    habit
      ? { name: habit.name, description: habit.description ?? '', category: habit.category, icon: habit.icon, color: habit.color, frequency: habit.frequency, scheduledDays: habit.scheduledDays, startDate: habit.startDate }
      : { name: '', description: '', category: 'health', icon: 'Droplets', color: HABIT_COLORS[0].value, frequency: 'daily', scheduledDays: [], startDate: today },
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)
  const set = <K extends keyof HabitFormValues>(k: K, v: HabitFormValues[K]) => setValues((cur) => ({ ...cur, [k]: v }))

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (saving) return
    const parsed = habitFormSchema.safeParse(values)
    if (!parsed.success) {
      const next: Record<string, string> = {}
      for (const issue of parsed.error.issues) next[String(issue.path[0] ?? 'form')] ??= issue.message
      setErrors(next)
      return
    }
    setErrors({})
    setFailed(false)
    setSaving(true)
    try {
      await save.mutateAsync({ ...(habit ? { id: habit.id } : {}), input: parsed.data })
      toast({ kind: 'success', message: habit ? 'Perubahan berhasil disimpan.' : 'Kebiasaan berhasil ditambahkan.' })
      onDone()
    } catch {
      setFailed(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Field label="Nama kebiasaan" htmlFor="habit-name" error={errors.name}>
        <input id="habit-name" className={inputClass} value={values.name} aria-invalid={!!errors.name} onChange={(e) => set('name', e.target.value)} placeholder="Contoh: Minum 8 gelas air" />
      </Field>
      <Field label="Deskripsi (opsional)" htmlFor="habit-desc" error={errors.description}>
        <textarea id="habit-desc" rows={2} className={cn(inputClass, 'h-auto py-2')} value={values.description} aria-invalid={!!errors.description} onChange={(e) => set('description', e.target.value)} />
      </Field>
      <Field label="Kategori" htmlFor="habit-cat" error={errors.category}>
        <select id="habit-cat" className={inputClass} value={values.category} onChange={(e) => set('category', e.target.value as HabitFormValues['category'])}>
          {CATEGORIES.map((c) => <option key={c} value={c}>{id.categories[c]}</option>)}
        </select>
      </Field>
      <Field label="Ikon" error={errors.icon}>
        <div role="radiogroup" aria-label="Ikon" className="flex flex-wrap gap-2">
          {HABIT_ICON_NAMES.map((name) => {
            const Icon = HABIT_ICONS[name]
            return <Option key={name} selected={values.icon === name} label={HABIT_ICON_LABELS[name]} onClick={() => set('icon', name)}><Icon size={18} aria-hidden /></Option>
          })}
        </div>
      </Field>
      <Field label="Warna" error={errors.color}>
        <div role="radiogroup" aria-label="Warna" className="flex flex-wrap gap-2">
          {HABIT_COLORS.map((c) => (
            <Option key={c.value} selected={displayColor(values.color) === c.value} label={c.label} onClick={() => set('color', c.value)}>
              <span className="size-4 rounded-full" style={{ backgroundColor: inkColor(c.value) }} />
            </Option>
          ))}
        </div>
      </Field>
      <Field label="Frekuensi" error={errors.frequency}>
        <div role="radiogroup" aria-label="Frekuensi" className="grid grid-cols-2 gap-2">
          <Option selected={values.frequency === 'daily'} label="Setiap hari" onClick={() => set('frequency', 'daily')}>Setiap hari</Option>
          <Option selected={values.frequency === 'weekly_days'} label="Hari tertentu" onClick={() => set('frequency', 'weekly_days')}>Hari tertentu</Option>
        </div>
      </Field>
      {values.frequency === 'weekly_days' && (
        <Field label="Hari" error={errors.scheduledDays}>
          <div role="group" aria-label="Hari" className="flex flex-wrap gap-2">
            {DAY_ORDER.map((d) => {
              const on = values.scheduledDays.includes(d)
              return (
                <button key={d} type="button" aria-pressed={on} onClick={() => set('scheduledDays', on ? values.scheduledDays.filter((x) => x !== d) : [...values.scheduledDays, d])}
                  className={cn('h-10 min-w-11 rounded-lg border px-2 text-sm', on ? 'border-accent bg-surface-hover' : 'border-border text-muted hover:bg-surface-hover')}>
                  {id.weekdaysShort[d]}
                </button>
              )
            })}
          </div>
        </Field>
      )}
      <Field label="Tanggal mulai" htmlFor="habit-start" error={errors.startDate}>
        <input id="habit-start" type="date" className={inputClass} value={values.startDate} aria-invalid={!!errors.startDate} onChange={(e) => set('startDate', e.target.value)} />
      </Field>
      {failed && <p role="alert" className="text-sm text-danger">{id.errors.generic}</p>}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onDone} disabled={saving}>{id.actions.cancel}</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Menyimpan…' : id.actions.save}</Button>
      </div>
    </form>
  )
}

export function HabitFormDialog({ open, habit, onClose }: { open: boolean; habit: Habit | null; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title={habit ? 'Ubah Kebiasaan' : id.actions.add}>
      {open && <HabitForm habit={habit} onDone={onClose} />}
    </Modal>
  )
}
