import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { detectPlatform } from '@/pwa/InstallContext'
import { pwaStub } from '@/test/pwa-register-stub'
import { mediaState } from '@/test/setup'
import { createMemorySettingsRepository, renderApp } from '@/test/utils'

const UA_IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1'
const UA_ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36'

function installEvent(outcome: 'accepted' | 'dismissed' = 'accepted') {
  const e = new Event('beforeinstallprompt', { cancelable: true }) as Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }
  e.prompt = vi.fn().mockResolvedValue(undefined)
  e.userChoice = Promise.resolve({ outcome })
  return e
}
const fire = (e: Event) => act(() => { window.dispatchEvent(e) })
const settings = () => renderApp('/app/settings')
const card = () => screen.getByRole('heading', { name: 'Pasang Aplikasi', level: 2 }).parentElement!.parentElement as HTMLElement

// Spy (onLine, userAgent) tidak boleh bocor ke tes berikutnya.
afterEach(() => { vi.restoreAllMocks() })

beforeEach(() => {
  pwaStub.needRefresh = false
  pwaStub.offlineReady = false
  pwaStub.updateCalls.length = 0
})

describe('pembaruan versi', () => {
  it('tidak menampilkan apa pun bila tidak ada versi baru', async () => {
    renderApp('/app')
    await screen.findByRole('navigation', { name: 'Navigasi utama' })
    expect(screen.queryByText('Versi baru Ritual tersedia.')).not.toBeInTheDocument()
  })

  it('versi baru: pengguna yang memilih kapan memuat ulang; "Muat Ulang" mengaktifkan versi baru', async () => {
    pwaStub.needRefresh = true
    renderApp('/app')
    expect(await screen.findByText('Versi baru Ritual tersedia.')).toBeInTheDocument()
    expect(pwaStub.updateCalls).toEqual([]) // tidak otomatis
    await userEvent.click(screen.getByRole('button', { name: 'Muat Ulang' }))
    expect(pwaStub.updateCalls).toEqual([true])
  })

  it('"Nanti" menutup pemberitahuan tanpa memuat ulang', async () => {
    pwaStub.needRefresh = true
    renderApp('/app')
    await userEvent.click(await screen.findByRole('button', { name: 'Nanti' }))
    expect(screen.queryByText('Versi baru Ritual tersedia.')).not.toBeInTheDocument()
    expect(pwaStub.updateCalls).toEqual([])
  })
})

describe('pemasangan aplikasi', () => {
  it('tanpa peristiwa pemasangan: petunjuk manual, bukan tombol palsu', async () => {
    settings()
    await screen.findByRole('heading', { name: 'Pasang Aplikasi', level: 2 })
    expect(within(card()).getByText(/tidak menawarkan pemasangan otomatis/)).toBeInTheDocument()
    expect(within(card()).queryByRole('button')).not.toBeInTheDocument()
    expect(within(card()).getByText(/Instal Ritual/)).toBeInTheDocument() // desktop (UA jsdom)
  })

  it('peristiwa yang terpicu SEBELUM Pengaturan dibuka tetap tertangkap (penangkap ada di akar aplikasi)', async () => {
    renderApp('/app')
    await screen.findByRole('navigation', { name: 'Navigasi utama' })
    const e = installEvent()
    fire(e)
    expect(e.defaultPrevented).toBe(true) // mini-infobar bawaan ditahan, kita yang mengendalikan
    await userEvent.click(within(screen.getByRole('navigation', { name: 'Navigasi utama' })).getByRole('link', { name: 'Pengaturan' }))
    expect(await within(await screen.findByRole('heading', { name: 'Pasang Aplikasi', level: 2 }).then(() => card())).findByRole('button', { name: 'Pasang Aplikasi' })).toBeInTheDocument()
  })

  it('klik memunculkan dialog pemasangan; bila diterima, status berubah menjadi terpasang', async () => {
    settings()
    await screen.findByRole('heading', { name: 'Pasang Aplikasi', level: 2 })
    const e = installEvent('accepted')
    fire(e)
    await userEvent.click(await within(card()).findByRole('button', { name: 'Pasang Aplikasi' }))
    expect(e.prompt).toHaveBeenCalledTimes(1)
    expect(await within(card()).findByText('Ritual sudah terpasang di perangkat ini.')).toBeInTheDocument()
    expect(within(card()).queryByRole('button')).not.toBeInTheDocument()
  })

  it('bila ditolak: tombol hilang (peristiwa hanya sekali pakai) dan petunjuk manual tampil', async () => {
    settings()
    await screen.findByRole('heading', { name: 'Pasang Aplikasi', level: 2 })
    fire(installEvent('dismissed'))
    await userEvent.click(await within(card()).findByRole('button', { name: 'Pasang Aplikasi' }))
    await waitFor(() => expect(within(card()).queryByRole('button')).not.toBeInTheDocument())
    expect(within(card()).getByText(/tidak menawarkan pemasangan otomatis/)).toBeInTheDocument()
  })

  it('sudah berjalan sebagai aplikasi (display-mode: standalone): dinyatakan terpasang, tanpa tombol', async () => {
    mediaState.standalone = true
    settings()
    expect(await screen.findByText('Ritual sudah terpasang di perangkat ini.')).toBeInTheDocument()
    expect(within(card()).queryByRole('button')).not.toBeInTheDocument()
  })

  it('peristiwa appinstalled (dipasang lewat menu browser) memperbarui status', async () => {
    settings()
    await screen.findByRole('heading', { name: 'Pasang Aplikasi', level: 2 })
    act(() => { window.dispatchEvent(new Event('appinstalled')) })
    expect(await screen.findByText('Ritual sudah terpasang di perangkat ini.')).toBeInTheDocument()
  })

  it('petunjuk menyesuaikan platform: iOS dan Android', async () => {
    const ua = vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(UA_IOS)
    const { unmount } = settings()
    expect(await screen.findByText(/Tambah ke Layar Utama/)).toBeInTheDocument()
    expect(screen.getByText(/tombol Bagikan/)).toBeInTheDocument()
    unmount()
    ua.mockReturnValue(UA_ANDROID)
    settings()
    expect(await screen.findByText(/Instal aplikasi/)).toBeInTheDocument()
    ua.mockRestore()
  })

  it('terus terang bahwa perubahan offline belum didukung', async () => {
    settings()
    expect(await screen.findByText(/Perubahan offline belum didukung/)).toBeInTheDocument()
  })
})

describe('detectPlatform', () => {
  it.each([
    [UA_IOS, 5, 'ios'],
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15', 5, 'ios'], // iPadOS meminta situs desktop
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15', 0, 'desktop'], // Mac sungguhan
    [UA_ANDROID, 5, 'android'],
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0 Safari/537.36', 0, 'desktop'],
  ])('%s (sentuh=%i) -> %s', (ua, touch, expected) => expect(detectPlatform(ua, touch)).toBe(expected))
})

describe('status offline', () => {
  const setOnline = (value: boolean) => vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(value)

  it('online: tidak ada pemberitahuan', async () => {
    renderApp('/login', { user: null })
    await screen.findByRole('heading', { name: 'Masuk' })
    expect(screen.queryByText(/Kamu sedang offline/)).not.toBeInTheDocument()
  })

  it('offline sejak awal: pemberitahuan jujur muncul, juga di halaman masuk', async () => {
    setOnline(false)
    renderApp('/login', { user: null })
    const notice = await screen.findByText(/Kamu sedang offline/)
    expect(notice.closest('[role="status"]')).toHaveTextContent('belum mendukung perubahan offline')
    expect(notice.closest('[role="status"]')).toHaveTextContent('tidak akan tersimpan')
  })

  it('mengikuti perubahan koneksi: offline -> online -> offline', async () => {
    const spy = setOnline(true)
    renderApp('/login', { user: null })
    await screen.findByRole('heading', { name: 'Masuk' })
    spy.mockReturnValue(false)
    act(() => { window.dispatchEvent(new Event('offline')) })
    expect(await screen.findByText(/Kamu sedang offline/)).toBeInTheDocument()
    spy.mockReturnValue(true)
    act(() => { window.dispatchEvent(new Event('online')) })
    await waitFor(() => expect(screen.queryByText(/Kamu sedang offline/)).not.toBeInTheDocument())
  })

  it('gagal memuat pengaturan saat offline: pesan menyebut offline, bukan error umum; Coba Lagi tersedia', async () => {
    setOnline(false)
    const real = createMemorySettingsRepository()
    renderApp('/app', { settingsRepository: { ...real, getSettings: () => Promise.reject(new Error('Failed to fetch')) } })
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Kamu sedang offline, jadi pengaturan akun belum bisa dimuat')
    expect(screen.getByRole('button', { name: 'Coba Lagi' })).toBeInTheDocument()
  })

  it('gagal memuat pengaturan saat online: tetap pesan error umum', async () => {
    const real = createMemorySettingsRepository()
    renderApp('/app', { settingsRepository: { ...real, getSettings: () => Promise.reject(new Error('x')) } })
    expect(await screen.findByRole('alert')).toHaveTextContent('Pengaturan akun tidak dapat dimuat. Terjadi kesalahan. Silakan coba lagi.')
  })
})
