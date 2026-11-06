import { Check, Flame, Plus, Trophy, Undo2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { buildDashboardSummary, greetingFor } from '@/features/dashboard/summary'
import { WeeklyChart } from '@/features/dashboard/WeeklyChart'
import { HabitFormDialog } from '@/features/habits/HabitFormDialog'
import { useHabitData, useToggleCompletion } from '@/features/habits/queries'
import { useToday } from '@/hooks/useToday'
import { formatDateLong, formatDateShort } from '@/lib/dates'
import { CategoryBadge } from '@/components/ui/category-badge'
import { iconFor, inkColor, tintColor } from '@/lib/habit-icons'
import { id } from '@/lib/i18n'

export function DashboardPage() {
  const { habits, completions, isLoading, isError, refetch } = useHabitData()
  const { today, hour, timeZone } = useToday()
  const toast = useToast()
  const toggle = useToggleCompletion()
  const [adding, setAdding] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)

  const summary = useMemo(() => buildDashboardSummary({ habits, completions, today, timeZone }), [habits, completions, today, timeZone])
  const { progress } = summary
  const percent = progress.rate === null ? 0 : Math.round(progress.rate * 100)

  async function setDone(habitId: string, complete: boolean) {
    if (pendingId) return
    setPendingId(habitId)
    try {
      await toggle.mutateAsync({ habitId, date: today, complete })
      toast({ kind: 'success', message: complete ? 'Kerja bagus! Kebiasaan ditandai selesai.' : 'Status selesai dibatalkan.' })
    } catch {
      toast({ kind: 'error', message: id.errors.generic, action: { label: id.actions.retry, onClick: () => void setDone(habitId, complete) } })
    } finally {
      setPendingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[1.75rem] font-bold leading-tight tracking-tight">{greetingFor(hour)}</h1>
          <p className="text-sm text-muted">{formatDateLong(today)}</p>
          <p className="text-sm text-muted">Sudah berapa jauh progresmu hari ini?</p>
        </div>
        <Button onClick={() => setAdding(true)}><Plus size={16} aria-hidden />{id.actions.add}</Button>
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
          <p className="text-sm text-muted">Tambahkan kebiasaan pertamamu untuk mulai melacak progres.</p>
        </Card>
      )}

      {!isLoading && !isError && habits.length > 0 && (
        <>
          <div className="grid gap-4 md:grid-cols-[1.25fr_1fr_1fr]">
            <Card tone="hero" className="space-y-3">
              <h2 className="text-sm font-semibold text-fg-2">Progres Hari Ini</h2>
              {progress.due === 0 ? (
                <p className="text-sm">Tidak ada kebiasaan terjadwal hari ini.</p>
              ) : (
                <>
                  <p className="text-5xl font-extrabold tracking-tight tabular-nums text-accent-text">{percent}%</p>
                  <div role="progressbar" aria-label="Progres hari ini" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} className="h-2.5 overflow-hidden rounded-full bg-surface/80 ring-1 ring-inset ring-border">
                    <div className="h-full rounded-full bg-success transition-[width] duration-500" style={{ width: `${percent}%` }} />
                  </div>
                  <p className="text-sm text-muted">{progress.done} dari {progress.due} kebiasaan</p>
                </>
              )}
            </Card>
            <Card className="space-y-2">
              <h2 className="text-sm font-semibold text-fg-2">Rentetan</h2>
              <p className="flex items-center gap-2"><Flame size={18} className="text-accent-text" aria-hidden /><span className="text-lg font-bold tabular-nums">{summary.bestCurrentStreak} hari</span><span className="text-sm text-muted">Rentetan Saat Ini</span></p>
              <p className="flex items-center gap-2"><Trophy size={18} className="text-accent-text" aria-hidden /><span className="text-lg font-bold tabular-nums">{summary.longestStreak} hari</span><span className="text-sm text-muted">Rekor Konsistensi</span></p>
            </Card>
            <Card className="space-y-2">
              <h2 className="text-sm font-semibold text-fg-2">Pencapaian</h2>
              <p><span className="text-lg font-bold tabular-nums">{summary.totalCompletions}</span> <span className="text-sm text-muted">total penyelesaian</span></p>
              <p><span className="text-lg font-bold tabular-nums">{summary.activeHabitCount}</span> <span className="text-sm text-muted">kebiasaan aktif</span></p>
            </Card>
          </div>

          <section aria-labelledby="today-title" className="space-y-3">
            <h2 id="today-title" className="text-lg font-bold tracking-tight">Kebiasaan Hari Ini</h2>
            {summary.todayItems.length === 0 ? (
              <p className="text-sm text-muted">Tidak ada kebiasaan terjadwal hari ini.</p>
            ) : (
              <ul className="space-y-2">
                {summary.todayItems.map(({ habit, done }) => {
                  const Icon = iconFor(habit.icon)
                  return (
                    <li key={habit.id}>
                      <Card tone="row" className="flex flex-wrap items-center gap-x-4 gap-y-3">
                        <span className="grid size-11 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: tintColor(habit.color), color: inkColor(habit.color) }}><Icon size={20} aria-hidden /></span>
                        <div className="min-w-0 flex-1 basis-40">
                          <p className={done ? 'break-words font-semibold text-muted line-through' : 'break-words font-semibold'}>{habit.name}</p>
                          <p className="flex min-w-0 items-center gap-1.5 text-sm text-muted"><CategoryBadge category={habit.category} className="shrink-0" />{habit.description ? <span className="truncate">· {habit.description}</span> : null}</p>
                        </div>
                        <Button
                          variant={done ? 'secondary' : 'primary'}
                          disabled={pendingId !== null}
                          aria-label={`${done ? id.actions.undoComplete : id.actions.markComplete}: ${habit.name}`}
                          onClick={() => void setDone(habit.id, !done)}
                        >
                          {done ? <><Undo2 size={16} aria-hidden />{id.actions.completed}</> : <><Check size={16} aria-hidden />{id.actions.markComplete}</>}
                        </Button>
                      </Card>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="space-y-3">
              <h2 className="text-lg font-bold tracking-tight">Progres Mingguan</h2>
              <WeeklyChart week={summary.week} />
            </Card>
            <Card className="space-y-3">
              <h2 className="text-lg font-bold tracking-tight">Aktivitas Terbaru</h2>
              {summary.recent.length === 0 ? (
                <p className="text-sm text-muted">Belum ada aktivitas.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {summary.recent.map((r) => (
                    <li key={r.id} className="flex justify-between gap-3">
                      <span className="min-w-0 break-words">{r.habit.name}</span>
                      <span className="shrink-0 text-muted">{formatDateShort(r.completedDate)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}

      <HabitFormDialog open={adding} habit={null} onClose={() => setAdding(false)} />
    </div>
  )
}
