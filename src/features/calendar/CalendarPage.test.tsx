import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createLocalRepository } from '@/features/habits/repository'
import { renderApp, sampleHabit } from '@/test/utils'

const grid = () => screen.getByRole('group', { name: /\d{4}$/ })
const dayBtn = (re: RegExp) => within(grid()).getByRole('button', { name: re })
const monthTitle = () => screen.getByRole('heading', { level: 2, name: /^(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember) \d{4}$/ })
const detailPanel = () => screen.getByRole('region')

async function seed(over: Parameters<typeof sampleHabit>[0] = {}, completedOn: string[] = []) {
  const repo = createLocalRepository(localStorage)
  const h = await repo.createHabit(sampleHabit({ name: 'Minum air', startDate: '2026-09-01', ...over }))
  for (const d of completedOn) await repo.completeHabit(h.id, d)
  return { repo, h }
}

describe('Kalender: tampilan dan navigasi bulan', () => {
  it('tanpa kebiasaan: kalender tetap tampil dan ada ajakan yang berfungsi (bukan data palsu)', async () => {
    renderApp('/app/calendar')
    expect(await screen.findByRole('heading', { level: 2, name: 'Oktober 2026' })).toBeInTheDocument()
    expect(within(detailPanel()).getByText('Belum ada kebiasaan.')).toBeInTheDocument()
    expect(within(detailPanel()).getByRole('link', { name: 'Tambah Kebiasaan' })).toHaveAttribute('href', '/app/habits')
  })

  it('bulan sebelumnya/berikutnya menampilkan bulan yang benar, melewati pergantian tahun dan Februari', async () => {
    await seed()
    renderApp('/app/calendar')
    await screen.findByRole('heading', { level: 2, name: 'Oktober 2026' })
    expect(within(grid()).getAllByRole('button')).toHaveLength(31)

    await userEvent.click(screen.getByRole('button', { name: 'Bulan berikutnya' }))
    expect(monthTitle()).toHaveTextContent('November 2026')
    expect(within(grid()).getAllByRole('button')).toHaveLength(30)

    await userEvent.click(screen.getByRole('button', { name: 'Bulan berikutnya' }))
    await userEvent.click(screen.getByRole('button', { name: 'Bulan berikutnya' }))
    expect(monthTitle()).toHaveTextContent('Januari 2027')
    await userEvent.click(screen.getByRole('button', { name: 'Bulan berikutnya' }))
    expect(monthTitle()).toHaveTextContent('Februari 2027')
    expect(within(grid()).getAllByRole('button')).toHaveLength(28)

    for (let i = 0; i < 5; i++) await userEvent.click(screen.getByRole('button', { name: 'Bulan sebelumnya' }))
    expect(monthTitle()).toHaveTextContent('September 2026')
  })

  it('"Hari Ini" kembali ke bulan berjalan dan memilih hari ini', async () => {
    await seed()
    renderApp('/app/calendar')
    await screen.findByRole('heading', { level: 2, name: 'Oktober 2026' })
    await userEvent.click(screen.getByRole('button', { name: 'Bulan sebelumnya' }))
    await userEvent.click(screen.getByRole('button', { name: 'Hari Ini' }))
    expect(monthTitle()).toHaveTextContent('Oktober 2026')
    expect(dayBtn(/^Sabtu, 31 Oktober 2026/)).toHaveAttribute('aria-pressed', 'true')
    expect(dayBtn(/^Sabtu, 31 Oktober 2026/)).toHaveAttribute('aria-current', 'date')
  })

  it('posisi tanggal 1 mengikuti hari dalam minggu (Senin pertama): 1 Okt 2026 = Kamis', async () => {
    await seed()
    renderApp('/app/calendar')
    await screen.findByRole('heading', { level: 2, name: 'Oktober 2026' })
    const children = [...grid().children]
    expect(children.slice(0, 3).every((c) => c.getAttribute('aria-hidden') === 'true')).toBe(true) // 3 sel kosong
    expect(children[3]).toBe(dayBtn(/^Kamis, 1 Oktober 2026/))
  })
})

describe('Kalender: detail tanggal dan data tersimpan', () => {
  it('memilih tanggal mengganti detail; penanda mengikuti data tersimpan', async () => {
    await seed({}, ['2026-10-20'])
    renderApp('/app/calendar')
    await screen.findByRole('heading', { level: 2, name: 'Oktober 2026' })
    expect(dayBtn(/^Selasa, 20 Oktober 2026, 1 dari 1 selesai/)).toBeInTheDocument()
    expect(dayBtn(/^Rabu, 21 Oktober 2026, 0 dari 1 selesai/)).toBeInTheDocument()

    await userEvent.click(dayBtn(/^Selasa, 20 Oktober 2026/))
    expect(within(detailPanel()).getByRole('heading', { name: 'Selasa, 20 Oktober 2026' })).toBeInTheDocument()
    expect(within(detailPanel()).getByText(/Selesai · pukul 12\.00/)).toBeInTheDocument()
    expect(within(detailPanel()).getByText('1 dari 1 kebiasaan selesai')).toBeInTheDocument()

    await userEvent.click(dayBtn(/^Rabu, 21 Oktober 2026/))
    expect(within(detailPanel()).getByRole('heading', { name: 'Rabu, 21 Oktober 2026' })).toBeInTheDocument()
    expect(within(detailPanel()).getByText('Belum selesai')).toBeInTheDocument()
  })

  it('menandai tanggal lampau menyimpan tanggal ITU (bukan hari ini), lalu dapat dibatalkan', async () => {
    const { repo } = await seed()
    renderApp('/app/calendar', { repository: repo })
    await screen.findByRole('heading', { level: 2, name: 'Oktober 2026' })
    await userEvent.click(dayBtn(/^Minggu, 25 Oktober 2026/))
    await userEvent.click(within(detailPanel()).getByRole('button', { name: 'Tandai Selesai: Minum air' }))
    expect(await screen.findByText('Kerja bagus! Kebiasaan ditandai selesai.')).toBeInTheDocument()
    expect((await repo.listCompletions()).map((c) => c.completedDate)).toEqual(['2026-10-25'])
    expect(await within(detailPanel()).findByText(/^Selesai/)).toBeInTheDocument()
    expect(dayBtn(/^Minggu, 25 Oktober 2026, 1 dari 1 selesai/)).toBeInTheDocument()

    await userEvent.click(within(detailPanel()).getByRole('button', { name: 'Batalkan: Minum air' }))
    await waitFor(async () => expect(await repo.listCompletions()).toHaveLength(0))
    expect(await screen.findByText('Status selesai dibatalkan.')).toBeInTheDocument()
  })

  it('kegagalan menyimpan: error + Coba Lagi, tanpa pesan sukses palsu', async () => {
    const { repo } = await seed()
    let fail = true
    const flaky = { ...repo, completeHabit: (h: string, d: string) => (fail ? Promise.reject(new Error('x')) : repo.completeHabit(h, d)) }
    renderApp('/app/calendar', { repository: flaky })
    await screen.findByRole('heading', { level: 2, name: 'Oktober 2026' })
    await userEvent.click(dayBtn(/^Minggu, 25 Oktober 2026/))
    await userEvent.click(within(detailPanel()).getByRole('button', { name: 'Tandai Selesai: Minum air' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Terjadi kesalahan. Silakan coba lagi.')
    expect(screen.queryByText(/Kerja bagus/)).not.toBeInTheDocument()
    expect(await repo.listCompletions()).toHaveLength(0)
    fail = false
    await userEvent.click(screen.getByRole('button', { name: 'Coba Lagi' }))
    expect(await screen.findByText('Kerja bagus! Kebiasaan ditandai selesai.')).toBeInTheDocument()
    expect(await repo.listCompletions()).toHaveLength(1)
  })

  it('hari ini yang belum selesai berstatus "Belum selesai"', async () => {
    await seed()
    renderApp('/app/calendar')
    await screen.findByRole('heading', { level: 2, name: 'Oktober 2026' })
    expect(within(detailPanel()).getByText('Belum selesai')).toBeInTheDocument()
    expect(within(detailPanel()).getByRole('button', { name: 'Tandai Selesai: Minum air' })).toBeEnabled()
  })

  it('hari tidak dijadwalkan: statusnya jelas dan tidak ada tombol', async () => {
    await seed({ frequency: 'weekly_days', scheduledDays: [1] }) // Senin saja
    renderApp('/app/calendar')
    await screen.findByRole('heading', { level: 2, name: 'Oktober 2026' })
    await userEvent.click(dayBtn(/^Selasa, 27 Oktober 2026/))
    expect(within(detailPanel()).getByText('Tidak dijadwalkan')).toBeInTheDocument()
    expect(within(detailPanel()).getByText('Tidak ada kebiasaan terjadwal pada tanggal ini.')).toBeInTheDocument()
    expect(within(detailPanel()).queryByRole('button')).not.toBeInTheDocument()
  })

  it('kebiasaan yang sudah diarsipkan tidak muncul pada tanggal sesudah pengarsipan, tetapi tetap pada tanggal sebelumnya', async () => {
    const repo = createLocalRepository(localStorage, 'u', () => new Date('2026-10-20T03:00:00Z')) // diarsipkan 20 Okt (WIB)
    const h = await repo.createHabit(sampleHabit({ name: 'Lama', startDate: '2026-09-01' }))
    await repo.setArchived(h.id, true)
    renderApp('/app/calendar', { repository: repo })
    await screen.findByRole('heading', { level: 2, name: 'Oktober 2026' })
    await userEvent.click(dayBtn(/^Senin, 19 Oktober 2026/))
    expect(within(detailPanel()).getByText('Lama')).toBeInTheDocument()
    await userEvent.click(dayBtn(/^Selasa, 20 Oktober 2026/))
    expect(within(detailPanel()).getByText('Tidak ada aktivitas pada tanggal ini.')).toBeInTheDocument()
  })
})

describe('Kalender: batas mundur 30 hari dan tanggal masa depan', () => {
  it('30 hari ke belakang (1 Okt) masih bisa diubah', async () => {
    await seed()
    renderApp('/app/calendar')
    await screen.findByRole('heading', { level: 2, name: 'Oktober 2026' })
    await userEvent.click(dayBtn(/^Kamis, 1 Oktober 2026/))
    expect(within(detailPanel()).getByRole('button', { name: 'Tandai Selesai: Minum air' })).toBeInTheDocument()
  })

  it('31 hari ke belakang (30 Sep) ditolak dengan penjelasan, tanpa tombol', async () => {
    await seed({}, ['2026-09-30'])
    renderApp('/app/calendar')
    await screen.findByRole('heading', { level: 2, name: 'Oktober 2026' })
    await userEvent.click(screen.getByRole('button', { name: 'Bulan sebelumnya' }))
    await userEvent.click(dayBtn(/^Rabu, 30 September 2026/))
    expect(within(detailPanel()).getByRole('note')).toHaveTextContent('Perubahan hanya dapat dilakukan hingga 30 hari ke belakang.')
    expect(within(detailPanel()).queryByRole('button')).not.toBeInTheDocument()
    expect(within(detailPanel()).getByText(/^Selesai/)).toBeInTheDocument() // riwayat tetap terlihat
  })

  it('tanggal masa depan: berstatus "Belum tiba", dijelaskan, tanpa tombol', async () => {
    await seed()
    renderApp('/app/calendar')
    await screen.findByRole('heading', { level: 2, name: 'Oktober 2026' })
    await userEvent.click(screen.getByRole('button', { name: 'Bulan berikutnya' }))
    expect(within(detailPanel()).getByRole('heading', { name: 'Minggu, 1 November 2026' })).toBeInTheDocument()
    expect(within(detailPanel()).getByText('Belum tiba')).toBeInTheDocument()
    expect(within(detailPanel()).getByRole('note')).toHaveTextContent('belum tiba')
    expect(within(detailPanel()).queryByRole('button')).not.toBeInTheDocument()
    expect(dayBtn(/^Minggu, 1 November 2026, belum tiba/)).toBeInTheDocument()
  })
})
