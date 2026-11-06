import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createLocalRepository } from '@/features/habits/repository'
import { createMemorySettingsRepository, renderApp, sampleHabit, SARI, BUDI } from '@/test/utils'

const isDark = () => document.documentElement.classList.contains('dark')
const mainNav = () => within(screen.getByRole('navigation', { name: 'Navigasi utama' }))
const waitReady = () => screen.findByRole('navigation', { name: 'Navigasi utama' })
const NOV1_JAKARTA = new Date('2026-10-31T18:00:00Z') // 1 Nov 01:00 WIB = 31 Okt 11:00 di Los Angeles

describe('pengaturan akun: tampilan awal', () => {
  it('menampilkan zona waktu dan tema yang tersimpan di akun', async () => {
    renderApp('/app/settings', { settings: { timezone: 'Asia/Makassar', theme: 'dark' } })
    expect(await screen.findByLabelText('Zona waktu')).toHaveValue('Asia/Makassar')
    expect(screen.getByRole('radio', { name: 'Gelap' })).toBeChecked()
    expect(isDark()).toBe(true)
  })

  it('zona waktu di luar daftar tetap ditampilkan apa adanya', async () => {
    renderApp('/app/settings', { settings: { timezone: 'Pacific/Auckland' } })
    expect(await screen.findByLabelText('Zona waktu')).toHaveValue('Pacific/Auckland')
  })

  it('tema akun menimpa preferensi lokal perangkat', async () => {
    localStorage.setItem('ritual-theme', 'dark')
    renderApp('/app/settings', { settings: { theme: 'light' } })
    await waitReady()
    expect(screen.getByRole('radio', { name: 'Terang' })).toBeChecked()
    expect(isDark()).toBe(false)
    expect(localStorage.getItem('ritual-theme')).toBe('light')
  })
})

describe('zona waktu', () => {
  it('mengubah zona waktu menyimpan ke akun dan menampilkan pesan sukses', async () => {
    const { settings } = renderApp('/app/settings')
    await userEvent.selectOptions(await screen.findByLabelText('Zona waktu'), 'America/Los_Angeles')
    expect(await screen.findByText('Perubahan berhasil disimpan.')).toBeInTheDocument()
    expect(settings.updates).toEqual([{ timezone: 'America/Los_Angeles' }])
    expect(screen.getByLabelText('Zona waktu')).toHaveValue('America/Los_Angeles')
  })

  it('"hari ini" di Beranda mengikuti zona waktu akun', async () => {
    vi.setSystemTime(NOV1_JAKARTA)
    renderApp('/app')
    expect(await screen.findByText('Minggu, 1 November 2026')).toBeInTheDocument() // WIB

    await userEvent.click(mainNav().getByRole('link', { name: 'Pengaturan' }))
    await userEvent.selectOptions(await screen.findByLabelText('Zona waktu'), 'America/Los_Angeles')
    await screen.findByText('Perubahan berhasil disimpan.')
    await userEvent.click(mainNav().getByRole('link', { name: 'Beranda' }))

    expect(await screen.findByText('Sabtu, 31 Oktober 2026')).toBeInTheDocument() // Los Angeles
  })

  it.each([
    ['Asia/Jakarta', '2026-11-01'],
    ['America/Los_Angeles', '2026-10-31'],
  ])('tanggal penyelesaian yang tersimpan memakai zona waktu akun (%s -> %s)', async (timezone, expectedDate) => {
    vi.setSystemTime(NOV1_JAKARTA)
    const habits = createLocalRepository(localStorage)
    await habits.createHabit(sampleHabit({ name: 'Minum air' }))
    renderApp('/app', { repository: habits, settings: { timezone } })
    await userEvent.click(await screen.findByRole('button', { name: 'Tandai Selesai: Minum air' }))
    await screen.findByText('Kerja bagus! Kebiasaan ditandai selesai.')
    expect((await habits.listCompletions()).map((c) => c.completedDate)).toEqual([expectedDate])
  })

  it('kegagalan menyimpan: error + Coba Lagi, nilai tidak berubah sampai berhasil', async () => {
    const real = createMemorySettingsRepository()
    let fail = true
    const flaky = { ...real, updateSettings: (p: Parameters<typeof real.updateSettings>[0]) => (fail ? Promise.reject(new Error('jaringan')) : real.updateSettings(p)) }
    renderApp('/app/settings', { settingsRepository: flaky })
    await userEvent.selectOptions(await screen.findByLabelText('Zona waktu'), 'Asia/Tokyo')

    expect(await screen.findByRole('alert')).toHaveTextContent('Terjadi kesalahan. Silakan coba lagi.')
    expect(screen.queryByText('Perubahan berhasil disimpan.')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Zona waktu')).toHaveValue('Asia/Jakarta')

    fail = false
    await userEvent.click(screen.getByRole('button', { name: 'Coba Lagi' }))
    expect(await screen.findByText('Perubahan berhasil disimpan.')).toBeInTheDocument()
    expect(screen.getByLabelText('Zona waktu')).toHaveValue('Asia/Tokyo')
  })
})

describe('tema per akun', () => {
  it('memilih tema menerapkannya langsung dan menyimpannya ke akun', async () => {
    const { settings } = renderApp('/app/settings')
    await userEvent.click(await screen.findByRole('radio', { name: 'Gelap' }))
    expect(isDark()).toBe(true)
    await waitFor(() => expect(settings.updates).toEqual([{ theme: 'dark' }]))
  })

  it('gagal menyimpan tema: tema tetap berubah di perangkat tetapi pengguna diberi tahu jujur', async () => {
    const real = createMemorySettingsRepository()
    let fail = true
    const flaky = { ...real, updateSettings: (p: Parameters<typeof real.updateSettings>[0]) => (fail ? Promise.reject(new Error('x')) : real.updateSettings(p)) }
    renderApp('/app/settings', { settingsRepository: flaky })
    await userEvent.click(await screen.findByRole('radio', { name: 'Gelap' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('belum tersimpan ke akunmu')
    expect(isDark()).toBe(true)

    fail = false
    await userEvent.click(screen.getByRole('button', { name: 'Coba Lagi' }))
    await waitFor(() => expect(real.updates).toEqual([{ theme: 'dark' }]))
  })

  it('tema mengikuti akun saat berganti akun (sesi langsung A -> B)', async () => {
    const { auth } = renderApp('/app', { isolateUsers: true, settingsByUser: { [BUDI.id]: { theme: 'dark' }, [SARI.id]: { theme: 'light' } } })
    await waitReady()
    expect(isDark()).toBe(true)
    act(() => auth.switchTo(SARI))
    await waitFor(() => expect(isDark()).toBe(false))
    act(() => auth.switchTo(BUDI))
    await waitFor(() => expect(isDark()).toBe(true))
  })
})

describe('memuat pengaturan akun', () => {
  it('halaman privat tidak tampil sebelum pengaturan termuat (tidak ada "hari ini" sementara)', async () => {
    let release: () => void = () => {}
    const gate = new Promise<void>((r) => { release = r })
    let requested = false
    const real = createMemorySettingsRepository()
    renderApp('/app', { settingsRepository: { ...real, getSettings: async () => { requested = true; await gate; return real.getSettings() } } })

    // Tunggu sampai gerbang pengaturan (bukan pemulihan sesi) benar-benar menunggu data.
    await waitFor(() => expect(requested).toBe(true))
    expect(screen.getByText('Memuat…')).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Navigasi utama' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /^Selamat/ })).not.toBeInTheDocument()

    release()
    expect(await screen.findByRole('heading', { name: /^Selamat/ })).toBeInTheDocument()
  })

  it('gagal memuat: tidak diam-diam memakai zona waktu bawaan; ada Coba Lagi yang berfungsi', async () => {
    const real = createMemorySettingsRepository({ timezone: 'Asia/Makassar' })
    let fail = true
    renderApp('/app/settings', { settingsRepository: { ...real, getSettings: () => (fail ? Promise.reject(new Error('x')) : real.getSettings()) } })
    expect(await screen.findByRole('alert')).toHaveTextContent('Pengaturan akun tidak dapat dimuat.')
    expect(screen.queryByRole('navigation', { name: 'Navigasi utama' })).not.toBeInTheDocument()

    fail = false
    await userEvent.click(screen.getByRole('button', { name: 'Coba Lagi' }))
    expect(await screen.findByLabelText('Zona waktu')).toHaveValue('Asia/Makassar')
  })
})
