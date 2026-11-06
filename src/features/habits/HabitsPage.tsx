import { Archive, ArchiveRestore, Flame, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { inputClass } from '@/components/ui/field'
import { useToast } from '@/components/ui/toast'
import { groupCompletions } from '@/features/dashboard/summary'
import { DeleteHabitDialog } from '@/features/habits/DeleteHabitDialog'
import { HabitFormDialog } from '@/features/habits/HabitFormDialog'
import { useHabitData, useSetArchived } from '@/features/habits/queries'
import { useToday } from '@/hooks/useToday'
import { CategoryBadge } from '@/components/ui/category-badge'
import { iconFor, inkColor, tintColor } from '@/lib/habit-icons'
import { id } from '@/lib/i18n'
import { currentStreak } from '@/lib/streaks'
import { CATEGORIES, type Category, type Habit } from '@/types/habit'

type StatusFilter = 'active' | 'archived' | 'all'
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

const scheduleText = (h: Habit) =>
  h.frequency === 'daily' ? 'Setiap hari' : DAY_ORDER.filter((d) => h.scheduledDays.includes(d)).map((d) => id.weekdaysShort[d]).join(', ')

export function HabitsPage() {
  const { habits, completions, isLoading, isError, refetch } = useHabitData()
  const { today, timeZone } = useToday()
  const toast = useToast()
  const setArchived = useSetArchived()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<'all' | Category>('all')
  const [status, setStatus] = useState<StatusFilter>('active')
  const [formFor, setFormFor] = useState<Habit | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Habit | null>(null)

  const byHabit = useMemo(() => groupCompletions(completions), [completions])
  const visible = habits.filter((h) => {
    if (status === 'active' && h.archivedAt) return false
    if (status === 'archived' && !h.archivedAt) return false
    if (category !== 'all' && h.category !== category) return false
    const q = search.trim().toLowerCase()
    return !q || h.name.toLowerCase().includes(q) || (h.description ?? '').toLowerCase().includes(q)
  })

  async function toggleArchive(h: Habit) {
    const archived = !h.archivedAt
    try {
      await setArchived.mutateAsync({ id: h.id, archived })
      toast({ kind: 'success', message: archived ? 'Kebiasaan berhasil diarsipkan.' : 'Kebiasaan berhasil dipulihkan.' })
    } catch {
      toast({ kind: 'error', message: id.errors.generic, action: { label: id.actions.retry, onClick: () => void toggleArchive(h) } })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[1.75rem] font-bold leading-tight tracking-tight">{id.nav.habits}</h1>
        <Button onClick={() => setFormFor('new')}><Plus size={16} aria-hidden />{id.actions.add}</Button>
      </div>

      {isLoading && <p className="text-muted">{id.errors.loading}</p>}
      {isError && (
        <Card className="space-y-3">
          <p role="alert">{id.errors.generic}</p>
          <Button variant="secondary" onClick={refetch}>{id.actions.retry}</Button>
        </Card>
      )}

      {!isLoading && !isError && habits.length === 0 && (
        <Card className="space-y-3 text-center">
          <p className="font-medium">Belum ada kebiasaan.</p>
          <p className="text-sm text-muted">Mulai dengan satu kebiasaan kecil yang ingin kamu pertahankan.</p>
          <div><Button onClick={() => setFormFor('new')}><Plus size={16} aria-hidden />{id.actions.add}</Button></div>
        </Card>
      )}

      {!isLoading && !isError && habits.length > 0 && (
        <>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
            <div className="relative">
              <Search size={16} aria-hidden className="pointer-events-none absolute left-3 top-3 text-muted" />
              <input type="search" aria-label="Cari kebiasaan" placeholder="Cari kebiasaan" className={`${inputClass} pl-9`} value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select aria-label="Filter kategori" className={inputClass} value={category} onChange={(e) => setCategory(e.target.value as 'all' | Category)}>
              <option value="all">Semua kategori</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{id.categories[c]}</option>)}
            </select>
            <select aria-label="Filter status" className={inputClass} value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)}>
              <option value="active">Aktif</option>
              <option value="archived">Diarsipkan</option>
              <option value="all">Semua status</option>
            </select>
          </div>

          {visible.length === 0 ? (
            <p className="text-center text-muted">Tidak ada kebiasaan yang cocok dengan filter.</p>
          ) : (
            <ul className="space-y-3">
              {visible.map((h) => {
                const Icon = iconFor(h.icon)
                const streak = currentStreak({ habit: h, completedDates: byHabit.get(h.id) ?? [], today, timeZone })
                return (
                  <li key={h.id}>
                    <Card tone="row" className="flex flex-wrap items-center gap-4">
                      <span className="grid size-11 place-items-center rounded-xl" style={{ backgroundColor: tintColor(h.color), color: inkColor(h.color) }}>
                        <Icon size={20} aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1 basis-40">
                        <p className="break-words font-semibold">{h.name}</p>
                        <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-muted">
                          <CategoryBadge category={h.category} />
                          <span>· {scheduleText(h)}{h.archivedAt ? ' · Diarsipkan' : ''}</span>
                        </p>
                      </div>
                      {!h.archivedAt && (
                        <span className="flex items-center gap-1 text-sm text-muted" title="Rentetan Saat Ini">
                          <Flame size={16} aria-hidden />{streak} hari
                        </span>
                      )}
                      <div className="flex gap-1">
                        <Button variant="ghost" aria-label={`${id.actions.edit} ${h.name}`} onClick={() => setFormFor(h)}><Pencil size={16} aria-hidden /></Button>
                        <Button variant="ghost" aria-label={`${h.archivedAt ? id.actions.restore : id.actions.archive} ${h.name}`} onClick={() => void toggleArchive(h)}>
                          {h.archivedAt ? <ArchiveRestore size={16} aria-hidden /> : <Archive size={16} aria-hidden />}
                        </Button>
                        <Button variant="ghost" aria-label={`${id.actions.delete} ${h.name}`} onClick={() => setDeleting(h)}><Trash2 size={16} aria-hidden /></Button>
                      </div>
                    </Card>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}

      <HabitFormDialog open={formFor !== null} habit={formFor === 'new' ? null : formFor} onClose={() => setFormFor(null)} />
      <DeleteHabitDialog habit={deleting} onClose={() => setDeleting(null)} />
    </div>
  )
}
