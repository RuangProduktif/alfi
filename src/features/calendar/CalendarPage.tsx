import { Check, ChevronLeft, ChevronRight, CircleDashed, Minus, Undo2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, buttonClass } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { buildMonth, dayDetail, type DayMarker } from '@/features/calendar/month'
import { useHabitData, useToggleCompletion } from '@/features/habits/queries'
import { useToday } from '@/hooks/useToday'
import { addMonths, formatDateLong, formatMonthLong, formatTime, monthOf } from '@/lib/dates'
import { iconFor, inkColor, tintColor } from '@/lib/habit-icons'
import { id } from '@/lib/i18n'
import { BACKFILL_DAYS, canEditDate, type DayStatus } from '@/lib/streaks'
import { cn } from '@/lib/utils'

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]
const STATUS_LABEL: Record<DayStatus, string> = {
  done: 'Selesai', missed: 'Belum selesai', pending: 'Belum selesai', not_scheduled: 'Tidak dijadwalkan', future: 'Belum tiba', not_started: 'Belum dimulai',
}
// Sebagian = cincin kosong, Semua = bulatan penuh: dibedakan lewat bentuk, bukan hanya warna (keduanya hijau).
const MARKER_CLASS: Record<DayMarker, string> = { full: 'bg-success', partial: 'border-2 border-success', missed: 'bg-muted', none: '', future: '' }

export function CalendarPage() {
  const { habits, completions, isLoading, isError, refetch } = useHabitData()
  const { today, timeZone } = useToday()
  const toast = useToast()
  const toggle = useToggleCompletion()
  const [month, setMonth] = useState(() => monthOf(today))
  const [selected, setSelected] = useState(today)
  const [pendingId, setPendingId] = useState<string | null>(null)

  const cal = useMemo(() => buildMonth({ habits, completions, month, today, timeZone }), [habits, completions, month, today, timeZone])
  const detail = useMemo(() => dayDetail({ habits, completions, date: selected, today, timeZone }), [habits, completions, selected, today, timeZone])
  const edit = canEditDate(selected, today)

  function goToMonth(next: string) {
    setMonth(next)
    setSelected(next === monthOf(today) ? today : `${next}-01`)
  }

  async function setDone(habitId: string, complete: boolean): Promise<void> {
    if (pendingId) return
    setPendingId(habitId)
    try {
      await toggle.mutateAsync({ habitId, date: selected, complete })
      toast({ kind: 'success', message: complete ? 'Kerja bagus! Kebiasaan ditandai selesai.' : 'Status selesai dibatalkan.' })
    } catch {
      toast({ kind: 'error', message: id.errors.generic, action: { label: id.actions.retry, onClick: () => void setDone(habitId, complete) } })
    } finally {
      setPendingId(null)
    }
  }

  const dayLabel = (date: string, done: number, due: number, marker: DayMarker) => {
    const base = formatDateLong(date)
    if (marker === 'future') return `${base}, belum tiba`
    return due > 0 ? `${base}, ${done} dari ${due} selesai` : `${base}, tidak ada kebiasaan terjadwal`
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[1.75rem] font-bold leading-tight tracking-tight">{id.nav.calendar}</h1>
        <Button variant="secondary" onClick={() => { setMonth(monthOf(today)); setSelected(today) }}>Hari Ini</Button>
      </div>

      {isLoading && <p className="text-muted">{id.errors.loading}</p>}
      {isError && (
        <Card className="space-y-3">
          <p role="alert">{id.errors.generic}</p>
          <Button variant="secondary" onClick={refetch}>{id.actions.retry}</Button>
        </Card>
      )}

      {!isLoading && !isError && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <Button variant="ghost" aria-label="Bulan sebelumnya" onClick={() => goToMonth(addMonths(month, -1))}><ChevronLeft size={18} aria-hidden /></Button>
              <h2 className="font-semibold" aria-live="polite">{formatMonthLong(month)}</h2>
              <Button variant="ghost" aria-label="Bulan berikutnya" onClick={() => goToMonth(addMonths(month, 1))}><ChevronRight size={18} aria-hidden /></Button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted" aria-hidden>
              {WEEK_ORDER.map((d) => <div key={d}>{id.weekdaysShort[d]}</div>)}
            </div>
            <div role="group" aria-label={formatMonthLong(month)} className="grid grid-cols-7 gap-1">
              {Array.from({ length: cal.leadingBlanks }, (_, i) => <div key={`blank-${i}`} aria-hidden />)}
              {cal.days.map((d) => (
                <button
                  key={d.date}
                  type="button"
                  aria-label={dayLabel(d.date, d.done, d.due, d.marker)}
                  aria-pressed={d.date === selected}
                  aria-current={d.date === today ? 'date' : undefined}
                  onClick={() => setSelected(d.date)}
                  className={cn(
                    'relative flex h-12 flex-col items-center justify-center gap-1 rounded-lg border text-sm transition-colors',
                    d.date === selected ? 'border-accent bg-surface-hover' : 'border-transparent hover:bg-surface-hover',
                    d.date === today && 'font-semibold text-accent-text',
                    d.marker === 'future' && 'text-muted',
                  )}
                >
                  <span aria-hidden>{Number(d.date.slice(8))}</span>
                  <span aria-hidden className={cn('size-2 rounded-full', MARKER_CLASS[d.marker])} />
                </button>
              ))}
            </div>

            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted" aria-label="Keterangan penanda">
              <li className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-success" aria-hidden />Semua selesai</li>
              <li className="flex items-center gap-1.5"><span className="size-2 rounded-full border-2 border-success" aria-hidden />Sebagian selesai</li>
              <li className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-muted" aria-hidden />Terlewat</li>
            </ul>
          </Card>

          <Card className="space-y-4" aria-labelledby="day-title" role="region">
            <div>
              <h2 id="day-title" className="font-semibold">{formatDateLong(selected)}</h2>
              {detail.summary.due > 0 && <p className="text-sm text-muted">{detail.summary.done} dari {detail.summary.due} kebiasaan selesai</p>}
            </div>

            {habits.length === 0 ? (
              <div className="space-y-3 text-sm">
                <p>Belum ada kebiasaan.</p>
                <Link to="/app/habits" className={buttonClass('secondary')}>{id.actions.add}</Link>
              </div>
            ) : detail.items.length === 0 ? (
              <p className="text-sm text-muted">Tidak ada aktivitas pada tanggal ini.</p>
            ) : (
              <>
                {detail.summary.due === 0 && <p className="text-sm text-muted">Tidak ada kebiasaan terjadwal pada tanggal ini.</p>}
                <ul className="space-y-2">
                  {detail.items.map(({ habit, status, completedAt }) => {
                    const Icon = iconFor(habit.icon)
                    const actionable = status === 'done' || status === 'missed' || status === 'pending'
                    return (
                      <li key={habit.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-border bg-surface-2 p-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-lg" style={{ backgroundColor: tintColor(habit.color), color: inkColor(habit.color) }}><Icon size={18} aria-hidden /></span>
                        <div className="min-w-0 flex-1 basis-36">
                          <p className="break-words text-sm font-semibold">{habit.name}</p>
                          <p className="flex items-center gap-1 text-xs text-muted">
                            {status === 'done' ? <Check size={12} aria-hidden /> : status === 'not_scheduled' || status === 'not_started' ? <Minus size={12} aria-hidden /> : <CircleDashed size={12} aria-hidden />}
                            {STATUS_LABEL[status]}{completedAt ? ` · pukul ${formatTime(completedAt, timeZone)}` : ''}
                          </p>
                        </div>
                        {actionable && edit.allowed && (
                          <Button
                            variant={status === 'done' ? 'secondary' : 'primary'}
                            disabled={pendingId !== null}
                            aria-label={`${status === 'done' ? id.actions.undoComplete : id.actions.markComplete}: ${habit.name}`}
                            onClick={() => void setDone(habit.id, status !== 'done')}
                          >
                            {status === 'done' ? <><Undo2 size={16} aria-hidden />{id.actions.undoComplete}</> : <><Check size={16} aria-hidden />{id.actions.markComplete}</>}
                          </Button>
                        )}
                      </li>
                    )
                  })}
                </ul>
                {!edit.allowed && (
                  <p role="note" className="text-sm text-muted">
                    {edit.reason === 'future' ? 'Tanggal ini belum tiba, jadi belum bisa ditandai.' : `Perubahan hanya dapat dilakukan hingga ${BACKFILL_DAYS} hari ke belakang.`}
                  </p>
                )}
              </>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
