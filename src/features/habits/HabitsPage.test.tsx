import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createLocalRepository } from '@/features/habits/repository'
import { renderApp, sampleHabit } from '@/test/utils'

const open = () => userEvent.click(screen.getAllByRole('button', { name: 'Tambah Kebiasaan' })[0]!)

describe('halaman Kebiasaan Saya', () => {
  it('data kosong menampilkan keadaan kosong yang informatif', async () => {
    renderApp('/app/habits')
    expect(await screen.findByText('Belum ada kebiasaan.')).toBeInTheDocument()
  })

  it('menambah kebiasaan: tersimpan, tampil di daftar, dan toast sukses', async () => {
    const { repository } = renderApp('/app/habits')
    await screen.findByText('Belum ada kebiasaan.')
    await open()
    const dialog = screen.getByRole('dialog', { name: 'Tambah Kebiasaan' })
    await userEvent.type(within(dialog).getByLabelText('Nama kebiasaan'), 'Baca buku')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Simpan' }))

    expect(await screen.findByText('Kebiasaan berhasil ditambahkan.')).toBeInTheDocument()
    expect(await screen.findByText('Baca buku')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect((await repository.listHabits()).map((h) => h.name)).toEqual(['Baca buku'])
  })

  it('validasi: nama kosong menampilkan pesan dan tidak menyimpan', async () => {
    const { repository } = renderApp('/app/habits')
    await screen.findByText('Belum ada kebiasaan.')
    await open()
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }))
    expect(screen.getByText('Nama kebiasaan wajib diisi.')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(await repository.listHabits()).toHaveLength(0)
  })

  it('hari tertentu tanpa hari terpilih ditolak', async () => {
    renderApp('/app/habits')
    await screen.findByText('Belum ada kebiasaan.')
    await open()
    await userEvent.type(screen.getByLabelText('Nama kebiasaan'), 'Gym')
    await userEvent.click(screen.getByRole('radio', { name: 'Hari tertentu' }))
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }))
    expect(screen.getByText('Pilih minimal satu hari.')).toBeInTheDocument()
  })

  it('Batal tidak menyimpan perubahan', async () => {
    const { repository } = renderApp('/app/habits')
    await screen.findByText('Belum ada kebiasaan.')
    await open()
    await userEvent.type(screen.getByLabelText('Nama kebiasaan'), 'Tidak jadi')
    await userEvent.click(screen.getByRole('button', { name: 'Batal' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await repository.listHabits()).toHaveLength(0)
  })

  it('kegagalan simpan menampilkan error dan TIDAK menampilkan pesan sukses', async () => {
    const real = createLocalRepository(localStorage)
    renderApp('/app/habits', { repository: { ...real, createHabit: () => Promise.reject(new Error('jaringan')) } })
    await screen.findByText('Belum ada kebiasaan.')
    await open()
    await userEvent.type(screen.getByLabelText('Nama kebiasaan'), 'Gagal')
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Terjadi kesalahan. Silakan coba lagi.')
    expect(screen.queryByText('Kebiasaan berhasil ditambahkan.')).not.toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('mengubah kebiasaan: form terisi data lama dan perubahan tersimpan', async () => {
    const repo = createLocalRepository(localStorage)
    await repo.createHabit(sampleHabit({ name: 'Lari' }))
    const { repository } = renderApp('/app/habits', { repository: repo })
    await userEvent.click(await screen.findByRole('button', { name: 'Ubah Lari' }))
    const field = screen.getByLabelText('Nama kebiasaan')
    expect(field).toHaveValue('Lari')
    await userEvent.clear(field)
    await userEvent.type(field, 'Lari sore')
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }))
    expect(await screen.findByText('Perubahan berhasil disimpan.')).toBeInTheDocument()
    expect((await repository.listHabits())[0]?.name).toBe('Lari sore')
  })

  it('menghapus: meminta konfirmasi, Batal tidak menghapus, Hapus menghapus kebiasaan dan riwayatnya', async () => {
    const repo = createLocalRepository(localStorage)
    const h = await repo.createHabit(sampleHabit({ name: 'Meditasi' }))
    await repo.completeHabit(h.id, '2026-10-30')
    renderApp('/app/habits', { repository: repo })

    await userEvent.click(await screen.findByRole('button', { name: 'Hapus Meditasi' }))
    const dialog = screen.getByRole('dialog', { name: 'Hapus kebiasaan?' })
    expect(within(dialog).getByText('Apakah kamu yakin ingin menghapus kebiasaan ini?')).toBeInTheDocument()
    expect(within(dialog).getByText(/riwayat penyelesaian.*terhapus secara permanen/)).toBeInTheDocument()

    await userEvent.click(within(dialog).getByRole('button', { name: 'Batal' }))
    expect(await repo.listHabits()).toHaveLength(1)

    await userEvent.click(screen.getByRole('button', { name: 'Hapus Meditasi' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Hapus' }))
    expect(await screen.findByText('Kebiasaan berhasil dihapus.')).toBeInTheDocument()
    expect(await repo.listHabits()).toHaveLength(0)
    expect(await repo.listCompletions()).toHaveLength(0)
  })

  it('mengarsipkan memindahkan ke filter Diarsipkan, lalu dapat dipulihkan', async () => {
    const repo = createLocalRepository(localStorage)
    await repo.createHabit(sampleHabit({ name: 'Yoga' }))
    renderApp('/app/habits', { repository: repo })
    await userEvent.click(await screen.findByRole('button', { name: 'Arsipkan Yoga' }))
    expect(await screen.findByText('Kebiasaan berhasil diarsipkan.')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText('Yoga')).not.toBeInTheDocument())

    await userEvent.selectOptions(screen.getByLabelText('Filter status'), 'archived')
    await userEvent.click(await screen.findByRole('button', { name: 'Pulihkan Yoga' }))
    expect(await screen.findByText('Kebiasaan berhasil dipulihkan.')).toBeInTheDocument()
    expect((await repo.listHabits())[0]?.archivedAt).toBeNull()
  })

  it('pencarian dan filter kategori benar-benar memfilter', async () => {
    const repo = createLocalRepository(localStorage)
    await repo.createHabit(sampleHabit({ name: 'Minum air' }))
    await repo.createHabit(sampleHabit({ name: 'Lari pagi', category: 'fitness' }))
    renderApp('/app/habits', { repository: repo })
    await screen.findByText('Minum air')

    await userEvent.type(screen.getByLabelText('Cari kebiasaan'), 'lari')
    expect(screen.queryByText('Minum air')).not.toBeInTheDocument()
    expect(screen.getByText('Lari pagi')).toBeInTheDocument()

    await userEvent.clear(screen.getByLabelText('Cari kebiasaan'))
    await userEvent.selectOptions(screen.getByLabelText('Filter kategori'), 'health')
    expect(screen.getByText('Minum air')).toBeInTheDocument()
    expect(screen.queryByText('Lari pagi')).not.toBeInTheDocument()

    await userEvent.selectOptions(screen.getByLabelText('Filter kategori'), 'finance')
    expect(screen.getByText('Tidak ada kebiasaan yang cocok dengan filter.')).toBeInTheDocument()
  })
})
