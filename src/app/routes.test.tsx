import { screen } from '@testing-library/react'
import { renderApp } from '@/test/utils'

describe('routing', () => {
  it('menampilkan halaman 404 dengan tautan kembali yang benar', async () => {
    renderApp('/tidak-ada')
    expect(await screen.findByRole('link', { name: 'Kembali ke beranda' })).toHaveAttribute('href', '/')
  })
  it('/ mengarahkan pengguna yang belum masuk ke halaman masuk', async () => {
    renderApp('/', { user: null })
    expect(await screen.findByRole('heading', { name: 'Masuk' })).toBeInTheDocument()
  })
  it('/ mengarahkan pengguna yang sudah masuk ke beranda', async () => {
    renderApp('/')
    expect(await screen.findByRole('heading', { name: /^Selamat/ })).toBeInTheDocument()
  })
})
