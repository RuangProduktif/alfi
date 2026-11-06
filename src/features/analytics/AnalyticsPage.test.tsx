import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createLocalRepository } from '@/features/habits/repository'
import { renderApp, sampleHabit } from '@/test/utils'

const card = (title: string) => screen.getByRole('heading', { name: title }).parentElement as HTMLElement

async function seed() {
  const repo = createLocalRepository(localStorage)
  const h = await repo.createHabit(sampleHabit({ name: 'Minum air', startDate: '2026-10-01' }))
  for (const d of ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31']) await repo.completeHabit(h.id, d)
  return { repo, h }
}

describe('Statistik', () => {
  it('tanpa kebiasaan: halaman kosong yang informatif, tanpa grafik palsu', async () => {
    renderApp('/app/analytics')
    expect(await screen.findByText('Belum ada kebiasaan.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Tambah Kebiasaan' })).toHaveAttribute('href', '/app/habits')
    expect(screen.queryByText('Progres per Hari')).not.toBeInTheDocument()
    expect(screen.queryByText('Heatmap Aktivitas')).not.toBeInTheDocument()
  })

  it('kartu ringkasan berasal dari data tersimpan', async () => {
    const { repo } = await seed()
    renderApp('/app/analytics', { repository: repo })
    await screen.findByRole('heading', { name: 'Pekan Ini' })
    expect(card('Pekan Ini')).toHaveTextContent('100%')
    expect(card('Pekan Ini')).toHaveTextContent('6 dari 6 jadwal')
    expect(card('Bulan Ini')).toHaveTextContent('19%') // 6 dari 31
    expect(card('Bulan Ini')).toHaveTextContent('6 dari 31 jadwal')
    expect(card('Rentetan Saat Ini')).toHaveTextContent('6 hari')
    expect(card('Rekor Konsistensi')).toHaveTextContent('6 hari')
    expect(card('Total Penyelesaian')).toHaveTextContent('6')
  })

  it('filter rentang benar-benar mengubah grafik dan persentase kebiasaan', async () => {
    const { repo } = await seed()
    renderApp('/app/analytics', { repository: repo })
    await screen.findByRole('heading', { name: 'Progres per Hari' })
    const chartCard = () => screen.getByRole('heading', { name: 'Progres per Hari' }).parentElement as HTMLElement
    const perfRow = () => screen.getByRole('button', { name: 'Lihat detail Minum air' })

    expect(screen.getByRole('radio', { name: '30 hari' })).toBeChecked()
    expect(within(chartCard()).getAllByRole('listitem')).toHaveLength(30)
    expect(perfRow()).toHaveTextContent('20%') // 6 dari 30 hari (2–31 Okt)

    await userEvent.click(screen.getByRole('radio', { name: '7 hari' }))
    expect(screen.getByRole('radio', { name: '7 hari' })).toBeChecked()
    expect(within(chartCard()).getAllByRole('listitem')).toHaveLength(7)
    expect(perfRow()).toHaveTextContent('86%') // 6 dari 7

    await userEvent.click(screen.getByRole('radio', { name: '90 hari' }))
    expect(within(chartCard()).getAllByRole('listitem')).toHaveLength(90)
    expect(perfRow()).toHaveTextContent('19%') // 6 dari 31 (mulai 1 Okt)
  })

  it('klik kebiasaan membuka detail yang relevan dan dapat ditutup', async () => {
    const { repo } = await seed()
    renderApp('/app/analytics', { repository: repo })
    await userEvent.click(await screen.findByRole('button', { name: 'Lihat detail Minum air' }))
    const dialog = screen.getByRole('dialog', { name: 'Detail Kebiasaan' })
    expect(within(dialog).getByText('Minum air')).toBeInTheDocument()
    expect(within(dialog).getByText('Rentetan Saat Ini').nextSibling).toHaveTextContent('6 hari')
    expect(within(dialog).getByText('Total Penyelesaian').nextSibling).toHaveTextContent('6')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tutup' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('kebiasaan diarsipkan hanya dihitung sebelum pengarsipan; yang belum dimulai tidak dihitung', async () => {
    const repo = createLocalRepository(localStorage, 'u', () => new Date('2026-10-16T03:00:00Z')) // diarsipkan 16 Okt (WIB)
    const old = await repo.createHabit(sampleHabit({ name: 'Lama', startDate: '2026-10-01' }))
    for (let d = 1; d <= 15; d++) await repo.completeHabit(old.id, `2026-10-${String(d).padStart(2, '0')}`)
    await repo.setArchived(old.id, true)
    await repo.createHabit(sampleHabit({ name: 'Nanti', startDate: '2026-11-10' }))

    renderApp('/app/analytics', { repository: repo })
    await screen.findByRole('heading', { name: 'Bulan Ini' })
    expect(card('Bulan Ini')).toHaveTextContent('100%')
    expect(card('Bulan Ini')).toHaveTextContent('15 dari 15 jadwal')
    expect(card('Rentetan Saat Ini')).toHaveTextContent('0 hari') // arsip tidak punya rentetan saat ini
    expect(card('Rekor Konsistensi')).toHaveTextContent('15 hari') // rekor tetap tersimpan
    expect(screen.getByRole('button', { name: 'Lihat detail Lama' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Lihat detail Nanti' })).not.toBeInTheDocument()
  })

  it('heatmap menampilkan hari aktif dari data, dan keterangan cara perhitungan tersedia', async () => {
    const { repo } = await seed()
    renderApp('/app/analytics', { repository: repo })
    const heat = await screen.findByRole('img', { name: /Heatmap aktivitas 12 pekan terakhir, 6 hari dengan penyelesaian/ })
    expect(heat.querySelectorAll('[data-level="4"]')).toHaveLength(6)
    expect(heat.querySelectorAll('div')).toHaveLength(12 * 7)
    await userEvent.click(screen.getByText('Cara perhitungan'))
    expect(screen.getByText(/diarsipkan hanya dihitung untuk periode sebelum diarsipkan/)).toBeVisible()
  })

  it('riwayat pencapaian memuat tanggal tercapainya', async () => {
    const { repo } = await seed()
    renderApp('/app/analytics', { repository: repo })
    await screen.findByRole('heading', { name: 'Riwayat Pencapaian' })
    const list = screen.getByRole('heading', { name: 'Riwayat Pencapaian' }).parentElement as HTMLElement
    expect(within(list).getByText('Rentetan 3 Hari').closest('li')).toHaveTextContent('28 Okt 2026')
    expect(within(list).getByText('Penyelesaian Pertama').closest('li')).toHaveTextContent('26 Okt 2026')
    expect(within(list).getByText('Hari Sempurna Pertama').closest('li')).toHaveTextContent('26 Okt 2026')
  })

  it('belum ada penyelesaian: riwayat pencapaian kosong dan tidak ada angka palsu', async () => {
    const repo = createLocalRepository(localStorage)
    await repo.createHabit(sampleHabit({ startDate: '2026-10-01' }))
    renderApp('/app/analytics', { repository: repo })
    await screen.findByRole('heading', { name: 'Riwayat Pencapaian' })
    expect(screen.getByText(/Belum ada pencapaian/)).toBeInTheDocument()
    expect(card('Total Penyelesaian')).toHaveTextContent('0')
    expect(card('Pekan Ini')).toHaveTextContent('0%')
  })

  it('gagal memuat: error dan Coba Lagi yang berfungsi', async () => {
    const real = createLocalRepository(localStorage)
    let fail = true
    renderApp('/app/analytics', { repository: { ...real, listHabits: () => (fail ? Promise.reject(new Error('x')) : real.listHabits()) } })
    expect(await screen.findByRole('alert')).toHaveTextContent('Terjadi kesalahan. Silakan coba lagi.')
    fail = false
    await userEvent.click(screen.getByRole('button', { name: 'Coba Lagi' }))
    expect(await screen.findByText('Belum ada kebiasaan.')).toBeInTheDocument()
  })
})
