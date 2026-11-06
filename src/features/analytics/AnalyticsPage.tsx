import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { buttonClass } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { achievements, buildAnalyticsSummary, dailySeries, habitPerformance, heatmap, type HabitPerformance } from '@/features/analytics/stats'
import { useHabitData } from '@/features/habits/queries'
import { useToday } from '@/hooks/useToday'
import { formatDateLong, formatDateShort, formatWeekdayShort } from '@/lib/dates'
import { CategoryBadge } from '@/components/ui/category-badge'
import { iconFor, inkColor, tintColor } from '@/lib/habit-icons'
import { id } from '@/lib/i18n'
import type { RateResult } from '@/lib/streaks'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const RANGES = [7, 30, 90] as const
type Range = (typeof RANGES)[number]
const HEAT_WEEKS = 12
const HEAT_CLASS = ['bg-heat-0', 'bg-heat-1', 'bg-heat-2', 'bg-heat-3', 'bg-heat-4'] as const

const pct = (r: number | null) => (r === null ? '—' : `${Math.round(r * 100)}%`)
const scheduleText = (p: HabitPerformance['habit']) =>
  p.frequency === 'daily' ? 'Setiap hari' : [1, 2, 3, 4, 5, 6, 0].filter((d) => p.scheduledDays.includes(d)).map((d) => id.weekdaysShort[d]).join(', ')

function RateCard({ title, rate }: { title: string; rate: RateResult }) {
  return (
    <Card className="space-y-1">
      <h3 className="text-sm text-muted">{title}</h3>
      <p className="text-2xl font-semibold">{pct(rate.rate)}</p>
      <p className="text-xs text-muted">{rate.due === 0 ? 'Belum ada kewajiban terjadwal' : `${rate.done} dari ${rate.due} jadwal`}</p>
    </Card>
  )
}
function NumberCard({ title, value, unit }: { title: string; value: number; unit?: string }) {
  return (
    <Card className="space-y-1">
      <h3 className="text-sm text-muted">{title}</h3>
      <p className="text-2xl font-semibold">{value.toLocaleString('id-ID')}{unit ? <span className="text-sm font-normal text-muted"> {unit}</span> : null}</p>
    </Card>
  )
}

export function AnalyticsPage() {
  const { habits, completions, isLoading, isError, refetch } = useHabitData()
  const { today, timeZone } = useToday()
  const [range, setRange] = useState<Range>(30)
  const [detail, setDetail] = useState<HabitPerformance | null>(null)

  const input = useMemo(() => ({ habits, completions, today, timeZone }), [habits, completions, today, timeZone])
  const summary = useMemo(() => buildAnalyticsSummary(input), [input])
  const series = useMemo(() => dailySeries(input, range), [input, range])
  const perf = useMemo(() => habitPerformance(input, range), [input, range])
  const heat = useMemo(() => heatmap(input, HEAT_WEEKS), [input])
  const history = useMemo(() => achievements(input), [input])

  const chartData = series.map((d) => ({
    label: range === 7 ? formatWeekdayShort(d.date) : `${Number(d.date.slice(8))}/${Number(d.date.slice(5, 7))}`,
    persen: d.rate === null ? null : Math.round(d.rate * 100),
  }))
  const hasSeries = series.some((d) => d.due > 0)
  const activeDays = heat.flat().filter((c) => c.done > 0).length

  return (
    <div className="space-y-6">
      <h1 className="text-[1.75rem] font-bold leading-tight tracking-tight">{id.nav.analytics}</h1>

      {isLoading && <p className="text-muted">{id.errors.loading}</p>}
      {isError && (
        <Card className="space-y-3">
          <p role="alert">{id.errors.generic}</p>
          <Button variant="secondary" onClick={refetch}>{id.actions.retry}</Button>
        </Card>
      )}

      {!isLoading && !isError && !summary.hasHabits && (
        <Card className="space-y-3 text-center">
          <p className="font-medium">Belum ada kebiasaan.</p>
          <p className="text-sm text-muted">Statistik akan muncul setelah kamu menambah kebiasaan dan mulai menandainya.</p>
          <div><Link to="/app/habits" className={buttonClass('primary')}>{id.actions.add}</Link></div>
        </Card>
      )}

      {!isLoading && !isError && summary.hasHabits && (
        <>
          <section aria-label="Ringkasan" className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <RateCard title="Pekan Ini" rate={summary.week} />
            <RateCard title="Bulan Ini" rate={summary.month} />
            <RateCard title="Keberhasilan Keseluruhan" rate={summary.overall} />
            <NumberCard title="Rentetan Saat Ini" value={summary.bestCurrentStreak} unit="hari" />
            <NumberCard title="Rekor Konsistensi" value={summary.longestStreak} unit="hari" />
            <NumberCard title="Total Penyelesaian" value={summary.totalCompletions} />
          </section>

          <details className="rounded-xl border border-border bg-surface p-4 text-sm">
            <summary className="cursor-pointer font-medium">Cara perhitungan</summary>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
              <li>Persentase = penyelesaian ÷ jadwal yang sudah berlangsung sampai hari ini × 100.</li>
              <li>Hari yang belum tiba dan hari yang tidak dijadwalkan tidak dihitung.</li>
              <li>Kebiasaan yang diarsipkan hanya dihitung untuk periode sebelum diarsipkan. Kebiasaan yang belum dimulai tidak dihitung.</li>
              <li>Jadwal yang berlaku saat ini dipakai untuk seluruh riwayat.</li>
            </ul>
          </details>

          <div role="radiogroup" aria-label="Rentang waktu" className="flex gap-2">
            {RANGES.map((r) => (
              <button key={r} type="button" role="radio" aria-checked={range === r} onClick={() => setRange(r)}
                className={cn('h-10 rounded-lg border px-4 text-sm font-medium', range === r ? 'border-accent bg-surface-hover' : 'border-border text-muted hover:bg-surface-hover')}>
                {r} hari
              </button>
            ))}
          </div>

          <Card className="space-y-3">
            <h2 className="text-lg font-semibold">Progres per Hari</h2>
            {!hasSeries ? (
              <p className="text-sm text-muted">Belum ada data pada rentang ini.</p>
            ) : (
              <>
                <div className="h-48" aria-hidden>
                  <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 320, height: 192 }}>
                    <BarChart data={chartData}>
                      <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={16} tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                      <YAxis hide domain={[0, 100]} />
                      <Bar dataKey="persen" fill="var(--accent)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <ul className="sr-only">
                  {series.map((d) => <li key={d.date}>{formatDateLong(d.date)}: {d.rate === null ? 'tidak ada jadwal' : `${pct(d.rate)} (${d.done} dari ${d.due})`}</li>)}
                </ul>
              </>
            )}
          </Card>

          <Card className="space-y-3">
            <h2 className="text-lg font-semibold">Performa Kebiasaan</h2>
            {perf.length === 0 ? (
              <p className="text-sm text-muted">Belum ada kebiasaan dengan jadwal pada rentang ini.</p>
            ) : (
              <ul className="space-y-2">
                {perf.map((p) => {
                  const Icon = iconFor(p.habit.icon)
                  return (
                    <li key={p.habit.id}>
                      <button type="button" aria-label={`Lihat detail ${p.habit.name}`} onClick={() => setDetail(p)}
                        className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface-2 p-3 text-left hover:bg-surface-hover">
                        <span className="grid size-9 shrink-0 place-items-center rounded-lg" style={{ backgroundColor: tintColor(p.habit.color), color: inkColor(p.habit.color) }}><Icon size={18} aria-hidden /></span>
                        <span className="min-w-0 flex-1 space-y-1.5">
                          <span className="flex justify-between gap-2 text-sm"><span className="min-w-0 break-words font-medium">{p.habit.name}</span><span className="shrink-0 text-muted">{pct(p.rate.rate)}</span></span>
                          <span className="block h-2 overflow-hidden rounded-full bg-surface-hover" aria-hidden><span className="block h-full rounded-full" style={{ width: `${Math.round((p.rate.rate ?? 0) * 100)}%`, backgroundColor: inkColor(p.habit.color) }} /></span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>

          <Card className="space-y-3">
            <h2 className="text-lg font-semibold">Heatmap Aktivitas</h2>
            <p className="text-sm text-muted">{HEAT_WEEKS} pekan terakhir · {activeDays} hari dengan penyelesaian</p>
            <div className="overflow-x-auto">
              <div role="img" aria-label={`Heatmap aktivitas ${HEAT_WEEKS} pekan terakhir, ${activeDays} hari dengan penyelesaian`}
                className="grid w-max grid-flow-col grid-rows-7 gap-1">
                {heat.flat().map((c) => (
                  <div key={c.date} data-level={c.level ?? 'none'} title={`${formatDateShort(c.date)}: ${c.future ? 'belum tiba' : c.due === 0 ? 'tidak ada jadwal' : `${c.done} dari ${c.due}`}`}
                    className={cn('size-4 rounded-sm', c.level === null ? 'border border-border/50' : HEAT_CLASS[c.level])} />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted" aria-hidden>
              Sedikit {HEAT_CLASS.map((c) => <span key={c} className={cn('size-3 rounded-sm', c)} />)} Banyak
            </div>
          </Card>

          <Card className="space-y-3">
            <h2 className="text-lg font-semibold">Riwayat Pencapaian</h2>
            {history.length === 0 ? (
              <p className="text-sm text-muted">Belum ada pencapaian. Tandai kebiasaanmu secara konsisten untuk meraihnya.</p>
            ) : (
              <ul className="space-y-2">
                {history.map((a) => (
                  <li key={a.id} className="flex items-start justify-between gap-3 text-sm">
                    <span><span className="font-medium">{a.title}</span><br /><span className="text-muted">{a.description}</span></span>
                    <span className="shrink-0 text-muted">{formatDateShort(a.achievedOn)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}

      <Modal open={detail !== null} onClose={() => setDetail(null)} title="Detail Kebiasaan">
        {detail && (
          <div className="space-y-4 text-sm">
            <div><p className="text-base font-semibold">{detail.habit.name}</p><p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-muted"><CategoryBadge category={detail.habit.category} /><span>· {scheduleText(detail.habit)}{detail.habit.archivedAt ? ' · Diarsipkan' : ''}</span></p></div>
            <dl className="grid grid-cols-2 gap-3">
              <div><dt className="text-muted">Persentase ({range} hari)</dt><dd className="font-semibold">{pct(detail.rate.rate)} <span className="font-normal text-muted">({detail.rate.done} dari {detail.rate.due})</span></dd></div>
              <div><dt className="text-muted">Rentetan Saat Ini</dt><dd className="font-semibold">{detail.currentStreak} hari</dd></div>
              <div><dt className="text-muted">Rekor Konsistensi</dt><dd className="font-semibold">{detail.longestStreak} hari</dd></div>
              <div><dt className="text-muted">Total Penyelesaian</dt><dd className="font-semibold">{detail.total.toLocaleString('id-ID')}</dd></div>
            </dl>
            <div className="flex justify-end"><Button variant="secondary" onClick={() => setDetail(null)}>Tutup</Button></div>
          </div>
        )}
      </Modal>
    </div>
  )
}
