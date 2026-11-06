import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { formatWeekdayShort } from '@/lib/dates'
import type { WeekDay } from '@/features/dashboard/summary'

export function WeeklyChart({ week }: { week: WeekDay[] }) {
  if (week.every((d) => d.due === 0)) return <p className="text-sm text-muted">Belum ada data minggu ini.</p>
  const data = week.map((d) => ({ label: formatWeekdayShort(d.date), persen: d.rate === null ? 0 : Math.round(d.rate * 100) }))
  return (
    <>
      <div className="h-40" aria-hidden>
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 320, height: 160 }}>
          <BarChart data={data}>
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'var(--muted)', fontSize: 12 }} />
            <YAxis hide domain={[0, 100]} />
            <Bar dataKey="persen" fill="var(--accent)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ul className="sr-only">
        {week.map((d) => <li key={d.date}>{formatWeekdayShort(d.date)}: {d.rate === null ? 'tidak ada kewajiban' : `${Math.round(d.rate * 100)}%`}</li>)}
      </ul>
    </>
  )
}
