import { createLocalRepository } from '@/features/habits/repository'
import type { HabitInput } from '@/types/habit'

const input: HabitInput = {
  name: 'Lari pagi', description: null, category: 'fitness', icon: 'Footprints', color: '#10b981',
  frequency: 'daily', scheduledDays: [], startDate: '2026-10-01',
}

describe('createLocalRepository', () => {
  it('data bertahan setelah repository dibuat ulang (simulasi refresh)', async () => {
    const created = await createLocalRepository(localStorage).createHabit(input)
    const list = await createLocalRepository(localStorage).listHabits()
    expect(list.map((h) => h.id)).toEqual([created.id])
  })

  it('penyelesaian idempoten: tidak ada duplikat untuk tanggal yang sama', async () => {
    const repo = createLocalRepository(localStorage)
    const h = await repo.createHabit(input)
    const a = await repo.completeHabit(h.id, '2026-10-31')
    const b = await repo.completeHabit(h.id, '2026-10-31')
    expect(b.id).toBe(a.id)
    expect(await repo.listCompletions()).toHaveLength(1)
  })

  it('membatalkan penyelesaian menghapus hanya tanggal itu', async () => {
    const repo = createLocalRepository(localStorage)
    const h = await repo.createHabit(input)
    await repo.completeHabit(h.id, '2026-10-30')
    await repo.completeHabit(h.id, '2026-10-31')
    await repo.uncompleteHabit(h.id, '2026-10-31')
    expect((await repo.listCompletions()).map((c) => c.completedDate)).toEqual(['2026-10-30'])
  })

  it('menolak penyelesaian untuk kebiasaan yang tidak ada atau tanggal tidak valid', async () => {
    const repo = createLocalRepository(localStorage)
    const h = await repo.createHabit(input)
    await expect(repo.completeHabit('nope', '2026-10-31')).rejects.toThrow('Kebiasaan tidak ditemukan.')
    await expect(repo.completeHabit(h.id, '2026-02-30')).rejects.toThrow('Tanggal tidak valid.')
  })

  it('mengubah kebiasaan memperbarui data dan updatedAt', async () => {
    let t = new Date('2026-10-01T00:00:00Z')
    const repo = createLocalRepository(localStorage, 'u', () => t)
    const h = await repo.createHabit(input)
    t = new Date('2026-10-02T00:00:00Z')
    const u = await repo.updateHabit(h.id, { ...input, name: 'Lari sore' })
    expect(u.name).toBe('Lari sore')
    expect(u.updatedAt).toBe('2026-10-02T00:00:00.000Z')
    expect(u.createdAt).toBe(h.createdAt)
  })

  it('mengarsipkan dan memulihkan', async () => {
    const repo = createLocalRepository(localStorage)
    const h = await repo.createHabit(input)
    expect((await repo.setArchived(h.id, true)).archivedAt).not.toBeNull()
    expect((await repo.setArchived(h.id, false)).archivedAt).toBeNull()
  })

  it('menghapus kebiasaan ikut menghapus riwayat penyelesaiannya saja', async () => {
    const repo = createLocalRepository(localStorage)
    const a = await repo.createHabit(input)
    const b = await repo.createHabit({ ...input, name: 'Baca' })
    await repo.completeHabit(a.id, '2026-10-31')
    await repo.completeHabit(b.id, '2026-10-31')
    await repo.deleteHabit(a.id)
    expect((await repo.listHabits()).map((h) => h.id)).toEqual([b.id])
    expect((await repo.listCompletions()).map((c) => c.habitId)).toEqual([b.id])
  })

  it('data rusak di penyimpanan tidak membuat aplikasi crash', async () => {
    localStorage.setItem('ritual:habits', '{bukan json')
    expect(await createLocalRepository(localStorage).listHabits()).toEqual([])
  })
})
