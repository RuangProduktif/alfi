import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createLocalRepository } from '@/features/habits/repository'
import { renderApp, sampleHabit } from '@/test/utils'

async function seeded() {
  const repo = createLocalRepository(localStorage)
  const air = await repo.createHabit(sampleHabit({ name: 'Minum air' }))
  await repo.createHabit(sampleHabit({ name: 'Baca buku', category: 'learning', icon: 'BookOpen' }))
  return { repo, air }
}

describe('Beranda', () => {
  it('data kosong: pesan informatif, tanpa grafik palsu', async () => {
    renderApp('/app')
    expect(await screen.findByText('Belum ada kebiasaan.')).toBeInTheDocument()
    expect(screen.queryByText('Progres Mingguan')).not.toBeInTheDocument()
  })

  it('menampilkan sapaan, tanggal Indonesia, dan progres awal', async () => {
    const { repo } = await seeded()
    renderApp('/app', { repository: repo })
    expect(await screen.findByRole('heading', { name: 'Selamat siang!' })).toBeInTheDocument()
    expect(screen.getByText('Sabtu, 31 Oktober 2026')).toBeInTheDocument()
    expect(await screen.findByText('0 dari 2 kebiasaan')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Progres hari ini' })).toHaveAttribute('aria-valuenow', '0')
  })

  it('Tandai Selesai menyimpan, memperbarui progres/rentetan/aktivitas, dan Batalkan mengembalikannya', async () => {
    const { repo } = await seeded()
    renderApp('/app', { repository: repo })
    await userEvent.click(await screen.findByRole('button', { name: 'Tandai Selesai: Minum air' }))

    expect(await screen.findByText('1 dari 2 kebiasaan')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50')
    expect(screen.getByText('Kerja bagus! Kebiasaan ditandai selesai.')).toBeInTheDocument()
    expect((await repo.listCompletions()).map((c) => c.completedDate)).toEqual(['2026-10-31'])
    expect(screen.getByText('31 Okt 2026')).toBeInTheDocument() // Aktivitas Terbaru

    await userEvent.click(screen.getByRole('button', { name: 'Batalkan: Minum air' }))
    expect(await screen.findByText('0 dari 2 kebiasaan')).toBeInTheDocument()
    expect(await repo.listCompletions()).toHaveLength(0)
  })

  it('kegagalan menyimpan: error + Coba Lagi, status tidak berubah sampai berhasil', async () => {
    const { repo, air } = await seeded()
    let fail = true
    const flaky = { ...repo, completeHabit: (id: string, d: string) => (fail ? Promise.reject(new Error('jaringan')) : repo.completeHabit(id, d)) }
    renderApp('/app', { repository: flaky })

    await userEvent.click(await screen.findByRole('button', { name: 'Tandai Selesai: Minum air' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Terjadi kesalahan. Silakan coba lagi.')
    expect(screen.queryByText(/Kebiasaan ditandai selesai/)).not.toBeInTheDocument()
    expect(screen.getByText('0 dari 2 kebiasaan')).toBeInTheDocument()
    expect(await repo.listCompletions()).toHaveLength(0)

    fail = false
    await userEvent.click(screen.getByRole('button', { name: 'Coba Lagi' }))
    expect(await screen.findByText('1 dari 2 kebiasaan')).toBeInTheDocument()
    expect((await repo.listCompletions())[0]?.habitId).toBe(air.id)
  })

  it('tombol Tambah Kebiasaan membuka form yang berfungsi', async () => {
    renderApp('/app')
    await screen.findByText('Belum ada kebiasaan.')
    await userEvent.click(screen.getByRole('button', { name: 'Tambah Kebiasaan' }))
    expect(screen.getByRole('dialog', { name: 'Tambah Kebiasaan' })).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Nama kebiasaan'), 'Jurnal')
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }))
    await waitFor(() => expect(screen.getByText('0 dari 1 kebiasaan')).toBeInTheDocument())
  })
})
