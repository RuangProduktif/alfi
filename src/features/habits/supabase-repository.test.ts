import { fakeClient } from '@/test/fake-supabase'
import { PAGE_SIZE, createSupabaseRepository, toCompletion, toHabit } from '@/features/habits/supabase-repository'

const row = (n: number) => ({ id: `c${n}`, habit_id: 'h', user_id: 'u', completed_date: '2026-10-01', completed_at: 't', created_at: 't' })

describe('pemetaan baris database', () => {
  it('habit: snake_case -> camelCase', () =>
    expect(toHabit({ id: 'h', user_id: 'u', name: 'N', description: null, category: 'health', icon: 'Droplets', color: '#3b82f6', frequency: 'weekly_days', scheduled_days: [1, 3], start_date: '2026-10-01', archived_at: null, created_at: 'a', updated_at: 'b' }))
      .toMatchObject({ userId: 'u', scheduledDays: [1, 3], startDate: '2026-10-01', archivedAt: null, createdAt: 'a' }))
  it('completion', () => expect(toCompletion(row(1))).toMatchObject({ habitId: 'h', completedDate: '2026-10-01' }))
})

describe('createSupabaseRepository', () => {
  it('listCompletions mengambil semua halaman (bukan hanya 1000 baris pertama)', async () => {
    const page1 = Array.from({ length: PAGE_SIZE }, (_, i) => row(i))
    const page2 = Array.from({ length: 5 }, (_, i) => row(PAGE_SIZE + i))
    const { client, calls } = fakeClient([{ data: page1 }, { data: page2 }])
    const all = await createSupabaseRepository(client, 'u').listCompletions()
    expect(all).toHaveLength(PAGE_SIZE + 5)
    expect(calls.filter(([n]) => n === 'range').map(([, a]) => a)).toEqual([[0, PAGE_SIZE - 1], [PAGE_SIZE, 2 * PAGE_SIZE - 1]])
  })

  it('createHabit mengirim user_id milik sesi', async () => {
    const { client, calls } = fakeClient([{ data: { id: 'h', user_id: 'u1', name: 'N', description: null, category: 'health', icon: 'Droplets', color: '#3b82f6', frequency: 'daily', scheduled_days: [], start_date: '2026-10-01', archived_at: null, created_at: 'a', updated_at: 'a' } }])
    await createSupabaseRepository(client, 'u1').createHabit({ name: 'N', description: null, category: 'health', icon: 'Droplets', color: '#3b82f6', frequency: 'daily', scheduledDays: [], startDate: '2026-10-01' })
    expect(calls.find(([n]) => n === 'insert')?.[1][0]).toMatchObject({ user_id: 'u1', scheduled_days: [], start_date: '2026-10-01' })
  })

  it('completeHabit idempoten: pelanggaran unique mengembalikan data yang sudah ada', async () => {
    const { client } = fakeClient([{ error: { message: 'duplicate key', code: '23505' } }, { data: row(7) }])
    expect((await createSupabaseRepository(client, 'u').completeHabit('h', '2026-10-01')).id).toBe('c7')
  })

  it('completeHabit: error selain duplikat dilempar', async () => {
    const { client } = fakeClient([{ error: { message: 'koneksi putus', code: '08006' } }])
    await expect(createSupabaseRepository(client, 'u').completeHabit('h', '2026-10-01')).rejects.toThrow('koneksi putus')
  })

  it('error dari server dilempar pada operasi lain', async () => {
    const { client } = fakeClient([{ error: { message: 'boom' } }])
    await expect(createSupabaseRepository(client, 'u').deleteHabit('h')).rejects.toThrow('boom')
  })
})
