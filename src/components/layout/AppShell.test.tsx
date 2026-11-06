import { screen, within } from '@testing-library/react'
import { renderApp } from '@/test/utils'

const renderAt = async (path: string) => {
  const view = renderApp(path)
  await screen.findByRole('navigation', { name: 'Navigasi utama' }) // menunggu pemulihan sesi
  return view
}

describe('navigasi aplikasi', () => {
  it('menandai menu aktif pada sidebar dan navigasi bawah', async () => {
    await renderAt('/app/habits')
    for (const name of ['Navigasi utama', 'Navigasi bawah']) {
      const nav = screen.getByRole('navigation', { name })
      expect(within(nav).getByRole('link', { name: /Kebiasaan Saya/ })).toHaveAttribute('aria-current', 'page')
      expect(within(nav).getByRole('link', { name: /Beranda/ })).not.toHaveAttribute('aria-current')
    }
  })

  it('setiap tautan navigasi menunjuk ke route yang benar', async () => {
    await renderAt('/app')
    const hrefs = within(screen.getByRole('navigation', { name: 'Navigasi utama' }))
      .getAllByRole('link').map((a) => a.getAttribute('href'))
    expect(hrefs).toEqual(['/app', '/app/habits', '/app/calendar', '/app/analytics', '/app/settings', '/app/profile'])
  })

  it('logo mengarah ke beranda', async () => {
    await renderAt('/app/calendar')
    for (const logo of screen.getAllByRole('link', { name: /Ritual/ })) expect(logo).toHaveAttribute('href', '/app')
  })

  it('halaman pengaturan menampilkan pemilih tema', async () => {
    await renderAt('/app/settings')
    expect(screen.getByRole('radiogroup', { name: 'Tampilan' })).toBeInTheDocument()
  })
})
