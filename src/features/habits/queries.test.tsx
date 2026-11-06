import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { RepositoryProvider } from '@/features/habits/RepositoryContext'
import { createLocalRepository } from '@/features/habits/repository'
import { useToggleCompletion } from '@/features/habits/queries'
import { createMemorySettingsRepository, sampleHabit } from '@/test/utils'

/**
 * Penegakan batas mundur diuji LANGSUNG pada hook mutasi. Di UI tombol sudah disembunyikan untuk tanggal terlarang,
 * jadi tes UI saja tidak akan mendeteksi jika penjaga di lapisan data dihapus.
 */
async function setup() {
  const habits = createLocalRepository(localStorage)
  const h = await habits.createHabit(sampleHabit({ startDate: '2026-01-01' }))
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <RepositoryProvider source={{ habits, settings: createMemorySettingsRepository() }}>{children}</RepositoryProvider>
    </QueryClientProvider>
  )
  const { result } = renderHook(() => useToggleCompletion(), { wrapper })
  return { habits, id: h.id, mutate: (date: string, complete = true) => result.current.mutateAsync({ habitId: h.id, date, complete }) }
}

describe('useToggleCompletion: penegakan aturan tanggal (hari ini = 2026-10-31)', () => {
  it('menolak tanggal masa depan', async () => {
    const { mutate, habits } = await setup()
    await expect(mutate('2026-11-01')).rejects.toThrow('belum tiba')
    expect(await habits.listCompletions()).toHaveLength(0)
  })
  it('menolak tanggal lebih dari 30 hari ke belakang', async () => {
    const { mutate, habits } = await setup()
    await expect(mutate('2026-09-30')).rejects.toThrow('30 hari ke belakang')
    expect(await habits.listCompletions()).toHaveLength(0)
  })
  it('menolak pembatalan tanggal yang terlalu lama (konsisten dua arah)', async () => {
    const { mutate, habits, id } = await setup()
    await habits.completeHabit(id, '2026-09-01')
    await expect(mutate('2026-09-01', false)).rejects.toThrow('30 hari ke belakang')
    expect(await habits.listCompletions()).toHaveLength(1)
  })
  it('menerima hari ini dan batas tepat 30 hari (1 Okt)', async () => {
    const { mutate, habits } = await setup()
    await mutate('2026-10-31')
    await mutate('2026-10-01')
    expect((await habits.listCompletions()).map((c) => c.completedDate).sort()).toEqual(['2026-10-01', '2026-10-31'])
  })
})
