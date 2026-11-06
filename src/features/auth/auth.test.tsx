import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BUDI, SARI, renderApp } from '@/test/utils'

const type = (label: string, text: string) => userEvent.type(screen.getByLabelText(label), text)
const login = async (email: string, password: string) => {
  await type('Email', email)
  await type('Kata sandi', password)
  await userEvent.click(screen.getByRole('button', { name: 'Masuk' }))
}

describe('proteksi route', () => {
  it.each(['/app', '/app/habits', '/app/calendar', '/app/analytics', '/app/settings', '/app/profile'])(
    'pengguna belum masuk di %s diarahkan ke halaman masuk', async (path) => {
      renderApp(path, { user: null })
      expect(await screen.findByRole('heading', { name: 'Masuk' })).toBeInTheDocument()
      expect(screen.queryByRole('navigation', { name: 'Navigasi utama' })).not.toBeInTheDocument()
    })

  it('setelah masuk, kembali ke halaman privat yang semula dituju', async () => {
    renderApp('/app/habits', { user: null })
    await screen.findByRole('heading', { name: 'Masuk' })
    await login('budi@contoh.id', 'rahasia123')
    expect(await screen.findByRole('heading', { name: 'Kebiasaan Saya' })).toBeInTheDocument()
  })

  it('pengguna yang sudah masuk tidak melihat halaman masuk/daftar', async () => {
    renderApp('/login')
    expect(await screen.findByRole('heading', { name: /^Selamat/ })).toBeInTheDocument()
  })

  it('pemulihan sesi: sesi yang ada langsung membuka aplikasi (setelah refresh)', async () => {
    renderApp('/app', { user: BUDI })
    expect(await screen.findByRole('heading', { name: /^Selamat/ })).toBeInTheDocument()
  })
})

describe('masuk', () => {
  it('validasi form: pesan Indonesia dan tidak memanggil layanan', async () => {
    const { auth } = renderApp('/login', { user: null })
    await userEvent.click(await screen.findByRole('button', { name: 'Masuk' }))
    expect(screen.getByText('Email wajib diisi.')).toBeInTheDocument()
    expect(screen.getByText('Kata sandi wajib diisi.')).toBeInTheDocument()
    expect(auth.currentUser()).toBeNull()
  })

  it('kredensial salah menampilkan error yang mudah dipahami dan tetap di halaman masuk', async () => {
    renderApp('/login', { user: null })
    await screen.findByRole('heading', { name: 'Masuk' })
    await login('budi@contoh.id', 'salahsalah')
    expect(await screen.findByRole('alert')).toHaveTextContent('Email atau kata sandi salah.')
    expect(screen.getByRole('heading', { name: 'Masuk' })).toBeInTheDocument()
  })

  it('tautan Lupa kata sandi dan Daftar mengarah ke route yang benar', async () => {
    renderApp('/login', { user: null })
    expect(await screen.findByRole('link', { name: 'Lupa kata sandi?' })).toHaveAttribute('href', '/forgot-password')
    expect(screen.getByRole('link', { name: 'Daftar' })).toHaveAttribute('href', '/signup')
  })
})

describe('daftar', () => {
  const fill = async (over: Partial<Record<string, string>> = {}) => {
    await type('Nama', over.nama ?? 'Dewi')
    await type('Email', over.email ?? 'dewi@contoh.id')
    await userEvent.type(screen.getByLabelText('Kata sandi'), over.pw ?? 'rahasia123')
    await type('Konfirmasi kata sandi', over.confirm ?? 'rahasia123')
    await userEvent.click(screen.getByRole('button', { name: 'Daftar' }))
  }

  it('konfirmasi kata sandi yang berbeda ditolak', async () => {
    renderApp('/signup', { user: null })
    await screen.findByRole('heading', { name: 'Daftar' })
    await fill({ confirm: 'beda12345' })
    expect(screen.getByText('Konfirmasi kata sandi tidak sama.')).toBeInTheDocument()
  })

  it('email yang sudah terdaftar ditolak dengan pesan jelas', async () => {
    renderApp('/signup', { user: null })
    await screen.findByRole('heading', { name: 'Daftar' })
    await fill({ email: 'budi@contoh.id' })
    expect(await screen.findByRole('alert')).toHaveTextContent('Email sudah terdaftar. Silakan masuk.')
  })

  it('berhasil tanpa verifikasi email: langsung masuk ke aplikasi', async () => {
    renderApp('/signup', { user: null })
    await screen.findByRole('heading', { name: 'Daftar' })
    await fill()
    expect(await screen.findByRole('heading', { name: /^Selamat/ })).toBeInTheDocument()
  })

  it('dengan verifikasi email: tampilkan instruksi, bukan masuk ke aplikasi', async () => {
    renderApp('/signup', { user: null, requireConfirmation: true })
    await screen.findByRole('heading', { name: 'Daftar' })
    await fill()
    expect(await screen.findByRole('heading', { name: 'Periksa email kamu' })).toBeInTheDocument()
    expect(screen.getByText('dewi@contoh.id')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ke halaman masuk' })).toHaveAttribute('href', '/login')
  })
})

describe('pemulihan kata sandi', () => {
  it('meminta tautan dan menampilkan pesan netral', async () => {
    const { auth } = renderApp('/forgot-password', { user: null })
    await screen.findByLabelText('Email')
    await type('Email', 'siapa@contoh.id')
    await userEvent.click(screen.getByRole('button', { name: 'Kirim Tautan Pemulihan' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Jika email tersebut terdaftar')
    expect(auth.calls.resets).toEqual(['siapa@contoh.id'])
  })

  it('validasi email', async () => {
    renderApp('/forgot-password', { user: null })
    await screen.findByLabelText('Email')
    await type('Email', 'bukan-email')
    await userEvent.click(screen.getByRole('button', { name: 'Kirim Tautan Pemulihan' }))
    expect(screen.getByText('Format email tidak valid.')).toBeInTheDocument()
  })

  it('/reset-password tanpa sesi pemulihan: tautan tidak valid', async () => {
    renderApp('/reset-password', { user: null })
    expect(await screen.findByRole('alert')).toHaveTextContent('Tautan pemulihan tidak valid atau sudah kedaluwarsa.')
    expect(screen.getByRole('link', { name: 'Minta tautan baru' })).toHaveAttribute('href', '/forgot-password')
  })

  it('/reset-password dengan sesi pemulihan: menyimpan kata sandi baru lalu ke beranda', async () => {
    const { auth } = renderApp('/reset-password', { user: BUDI })
    await userEvent.type(await screen.findByLabelText('Kata sandi baru'), 'barubaru123')
    await type('Konfirmasi kata sandi', 'barubaru123')
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }))
    expect(await screen.findByRole('heading', { name: /^Selamat/ })).toBeInTheDocument()
    expect(auth.calls.passwords).toEqual(['barubaru123'])
  })
})

describe('keluar dan isolasi antar akun', () => {
  it('Keluar mengakhiri sesi, kembali ke login, dan halaman privat kembali terlindungi', async () => {
    const { auth } = renderApp('/app/profile')
    expect(await screen.findByText('budi@contoh.id')).toBeInTheDocument()
    await userEvent.click(within(screen.getByRole('main')).getByRole('button', { name: 'Keluar' }))
    expect(await screen.findByRole('heading', { name: 'Masuk' })).toBeInTheDocument()
    expect(auth.currentUser()).toBeNull()
    expect(auth.calls.signOut).toBe(1)
  })

  it('tombol Keluar di sidebar juga berfungsi', async () => {
    renderApp('/app')
    const nav = await screen.findByRole('navigation', { name: 'Navigasi utama' })
    await userEvent.click(within(nav).getByRole('button', { name: 'Keluar' }))
    expect(await screen.findByRole('heading', { name: 'Masuk' })).toBeInTheDocument()
  })

  it('data akun pertama TIDAK terlihat oleh akun kedua setelah berganti akun', async () => {
    renderApp('/app/habits', { isolateUsers: true })
    await screen.findByText('Belum ada kebiasaan.')
    await userEvent.click(screen.getAllByRole('button', { name: 'Tambah Kebiasaan' })[0]!)
    await userEvent.type(screen.getByLabelText('Nama kebiasaan'), 'Rahasia Budi')
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }))
    expect(await screen.findByText('Rahasia Budi')).toBeInTheDocument()

    const nav = screen.getByRole('navigation', { name: 'Navigasi utama' })
    await userEvent.click(within(nav).getByRole('button', { name: 'Keluar' }))
    await screen.findByRole('heading', { name: 'Masuk' })
    await login('sari@contoh.id', 'rahasia123')

    // Setelah masuk, pengguna kembali ke halaman terakhir (/app/habits); daftar harus kosong untuk Sari.
    expect(await screen.findByText('Belum ada kebiasaan.')).toBeInTheDocument()
    expect(screen.queryByText('Rahasia Budi')).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Kebiasaan Saya' })).toBeInTheDocument())
  })

  it('perpindahan sesi langsung A -> B (tanpa keluar) tidak membocorkan data A ke B', async () => {
    const { auth } = renderApp('/app/habits', { isolateUsers: true })
    await screen.findByText('Belum ada kebiasaan.')
    await userEvent.click(screen.getAllByRole('button', { name: 'Tambah Kebiasaan' })[0]!)
    await userEvent.type(screen.getByLabelText('Nama kebiasaan'), 'Rahasia Budi')
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }))
    expect(await screen.findByText('Rahasia Budi')).toBeInTheDocument()

    act(() => auth.switchTo(SARI))

    expect(await screen.findByText('Belum ada kebiasaan.')).toBeInTheDocument()
    expect(screen.queryByText('Rahasia Budi')).not.toBeInTheDocument()
  })
})
